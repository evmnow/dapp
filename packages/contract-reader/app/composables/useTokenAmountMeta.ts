import type { MaybeRefOrGetter } from 'vue'
import type { Abi } from 'viem'
import { resolveAmountDisplay, type ParamType } from '@evmnow/sdk'
import type { ContractAction, ContractActionParam } from '../types/contract'
import type { SemanticType } from '../types/metadata'
import type { ContractReadFn, TokenInfoResolveFn } from '../types/actions'
import {
  getOutputSemanticType,
  resolveTokenAddress,
  semanticAmountKind,
  type AmountInputInfo,
  type TokenInfo,
} from '../utils/format'

const ERC20_META_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi

export interface UseTokenAmountMetaOptions {
  action: MaybeRefOrGetter<ContractAction>
  /** The contract being described — the bare `token-amount` form refers to it. */
  contractAddress: MaybeRefOrGetter<string>
  connectedAddress?: MaybeRefOrGetter<string | undefined>
  readFunction?: MaybeRefOrGetter<ContractReadFn | undefined>
  /**
   * Resolve a token's decimals/symbol (e.g. through an indexer API).
   * Defaults to on-chain lookups through `readFunction`.
   */
  resolveTokenInfo?: MaybeRefOrGetter<TokenInfoResolveFn | undefined>
  /**
   * Current value of the input a metadata key (ABI name or `_N` positional)
   * refers to — lets `tokenParam` references resolve against what the user
   * has typed so far.
   */
  getArg: (key: string) => unknown
}

/**
 * Token metadata resolution for amount-like params (eth / gwei / amount /
 * token-amount): resolves the on-chain identity (decimals/symbol) and the
 * connected wallet's balance of every token the action's `token-amount`
 * params refer to, and derives per-input rendering/parsing info.
 */
export function useTokenAmountMeta(options: UseTokenAmountMetaOptions) {
  const action = computed(() => toValue(options.action))

  // On-chain identity of token-amount tokens, resolved lazily via the
  // injected resolver (or readFunction as the fallback).
  const tokenMeta = reactive<Record<string, TokenInfo>>({})
  const tokenBalance = reactive<Record<string, bigint>>({})

  // In-flight lookups keyed by address so concurrent resolveTokenMeta runs
  // (or duplicate params referencing the same token) don't double-read
  // decimals/symbol/balanceOf.
  const tokenMetaPending = new Map<string, Promise<void>>()
  const tokenBalancePending = new Map<string, Promise<void>>()

  const hasResultFields = computed(() => action.value.outputs.length > 1)

  function paramTokenAddress(type?: SemanticType): string | undefined {
    if (semanticAmountKind(type) !== 'token-amount') return undefined
    // Lowercased so tokenMeta/tokenBalance keys are stable regardless of the
    // casing metadata or users supply — ResultFields also looks up lowercased.
    return resolveTokenAddress(type, {
      contractAddress: toValue(options.contractAddress),
      getArg: options.getArg,
    })?.toLowerCase()
  }

  // Rendering/parsing info for an amount-like input, or null if not
  // amount-like (or a token-amount whose decimals are not resolved yet —
  // kept as a raw field).
  function amountMeta(param: ContractActionParam): AmountInputInfo | null {
    const type = param.meta?.type
    const kind = semanticAmountKind(type)
    if (!kind) return null
    if (!/^u?int/.test(param.type)) return null

    if (kind === 'token-amount') {
      const addr = paramTokenAddress(type)
      const info = addr ? tokenMeta[addr] : undefined
      if (!info) return null
      return {
        decimals: info.decimals,
        symbol: info.symbol,
        balance: addr ? tokenBalance[addr] : undefined,
      }
    }

    const display = resolveAmountDisplay(type as ParamType)
    if (!display) return null
    return { decimals: display.decimals, symbol: display.symbol }
  }

  const amountDecimals = (input: ContractActionParam) =>
    amountMeta(input)?.decimals ?? null

  function collectTokenAddresses(): string[] {
    const set = new Set<string>()
    for (const input of action.value.inputs) {
      const addr = paramTokenAddress(input.meta?.type)
      if (addr) set.add(addr)
    }
    if (!hasResultFields.value) {
      const out = action.value.outputs[0]
      const addr = out
        ? paramTokenAddress(
            getOutputSemanticType(out, action.value.meta?.returns),
          )
        : undefined
      if (addr) set.add(addr)
    }
    return [...set]
  }

  async function lookupTokenInfo(addr: string): Promise<TokenInfo | null> {
    const resolveTokenInfo = toValue(options.resolveTokenInfo)
    if (resolveTokenInfo) return resolveTokenInfo(addr)

    const reader = toValue(options.readFunction)
    if (!reader) return null
    const [decimals, symbol] = await Promise.all([
      reader({
        address: addr,
        abi: ERC20_META_ABI as unknown as Abi,
        functionName: 'decimals',
      }),
      reader({
        address: addr,
        abi: ERC20_META_ABI as unknown as Abi,
        functionName: 'symbol',
      }).catch(() => undefined),
    ])
    return {
      decimals: Number(decimals),
      symbol: typeof symbol === 'string' ? symbol : undefined,
    }
  }

  async function resolveTokenMeta() {
    await Promise.all(
      collectTokenAddresses().map((addr) => {
        if (tokenMeta[addr]) return undefined
        let pending = tokenMetaPending.get(addr)
        if (!pending) {
          pending = lookupTokenInfo(addr)
            .then((info) => {
              if (info && Number.isFinite(info.decimals)) tokenMeta[addr] = info
            })
            .catch(() => {
              // leave unresolved — the input stays a raw integer field
            })
            .finally(() => tokenMetaPending.delete(addr))
          tokenMetaPending.set(addr, pending)
        }
        return pending
      }),
    )
    await resolveTokenBalances()
  }

  async function resolveTokenBalances() {
    const reader = toValue(options.readFunction)
    const holder = toValue(options.connectedAddress)
    if (!reader || !holder) return
    const pendingReads: Promise<void>[] = []
    for (const input of action.value.inputs) {
      const addr = paramTokenAddress(input.meta?.type)
      if (!addr || !tokenMeta[addr]) continue
      const key = `${addr}:${holder.toLowerCase()}`
      let pending = tokenBalancePending.get(key)
      if (!pending) {
        pending = reader({
          address: addr,
          abi: ERC20_META_ABI as unknown as Abi,
          functionName: 'balanceOf',
          args: [holder],
        })
          .then((balance) => {
            tokenBalance[addr] = BigInt(balance as bigint | number | string)
          })
          .catch(() => {
            // ignore — max button simply won't render
          })
          .finally(() => tokenBalancePending.delete(key))
        tokenBalancePending.set(key, pending)
      }
      pendingReads.push(pending)
    }
    await Promise.all(pendingReads)
  }

  watch(
    // collectTokenAddresses reads the current input values through `getArg`,
    // so a token address typed into a `tokenParam`-referenced input triggers
    // resolution as soon as it is valid.
    () =>
      [
        action.value.slug,
        toValue(options.readFunction),
        toValue(options.resolveTokenInfo),
        toValue(options.contractAddress),
        collectTokenAddresses().join(','),
      ] as const,
    () => void resolveTokenMeta(),
    { immediate: true },
  )

  watch(
    () => toValue(options.connectedAddress),
    () => void resolveTokenBalances(),
  )

  return {
    /** Resolved token identity (decimals/symbol), keyed by lowercased address. */
    tokenMeta,
    /** Connected wallet's balances, keyed by lowercased token address. */
    tokenBalance,
    amountMeta,
    amountDecimals,
    paramTokenAddress,
    resolveTokenMeta,
  }
}
