import { getConnectorClient, getPublicClient } from '@wagmi/core'
import {
  createPublicClient,
  http,
  parseEther,
  type Address,
  type PublicClient,
} from 'viem'
import { readContract as readContractAction } from 'viem/actions'
import type { ContractReadParams, ContractWriteParams } from '../types/actions'
import { createProviderRpcFetch, PROVIDER_RPC_URL } from '../utils/provider-rpc'

/**
 * Superset of the `ContractWriteFn` params accepted when calling the wallet
 * directly: human-entered values and an explicit chain are normalized here.
 */
export interface ContractWalletWriteParams extends Omit<
  ContractWriteParams,
  'value'
> {
  value?: bigint | number | string
  chainId?: number
}

function buildRpcChain(chainId: number, rpcUrl: string) {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  } as const
}

function normalizeWriteValue(
  value: bigint | number | string | undefined,
): bigint | undefined {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return trimmed.includes('.')
      ? parseEther(trimmed as `${number}`)
      : BigInt(trimmed)
  }

  return undefined
}

/**
 * Wires the wallet stack from `@1001-digital/layers.evm` (wagmi + viem) into
 * the callback shapes the reader components expect: `readContractFunction` /
 * `writeContractFunction` for `ActionDetail`, plus `metadataOptions` and
 * `metadataFetch` for `useContractMetadataSdk`.
 *
 * Resolution order for reads: explicit `rpc` option, then the connected
 * wallet's provider, then the wagmi public client for the active chain.
 */
export function useContractWallet(
  options: {
    chainId?: MaybeRefOrGetter<number>
    rpc?: MaybeRefOrGetter<string>
  } = {},
) {
  const config = useConfig()
  const connection = useConnection()
  const { writeContractAsync } = useWriteContract()
  const mainChainId = useMainChainId()

  const configuredChainId = computed(() => {
    const raw = options.chainId
      ? Number(toValue(options.chainId))
      : Number(mainChainId ?? 1)
    return Number.isFinite(raw) && raw > 0 ? raw : 1
  })

  const customRpc = computed(() => {
    return (options.rpc ? toValue(options.rpc) : '').trim()
  })

  const walletProviderReady = computed(() => {
    return Boolean(connection.isConnected.value && connection.connector.value)
  })

  const publicRpcAvailable = computed(() => {
    return Boolean(publicClient.value)
  })

  const walletChainId = computed(() => {
    const raw = connection.chainId.value
    return typeof raw === 'number' && raw > 0 ? raw : undefined
  })

  const activeChainId = computed(() => {
    return customRpc.value
      ? configuredChainId.value
      : (walletChainId.value ?? configuredChainId.value)
  })

  const publicClient = computed<PublicClient | null>(() => {
    if (customRpc.value) return null
    return (
      (getPublicClient(config, {
        chainId: activeChainId.value,
      }) as PublicClient | undefined) ?? null
    )
  })

  const metadataOptions = computed(() => {
    return {
      chainId: customRpc.value ? configuredChainId.value : activeChainId.value,
      rpc:
        customRpc.value ||
        (walletProviderReady.value ? PROVIDER_RPC_URL : undefined),
    }
  })

  async function resolveClient() {
    if (customRpc.value) {
      return createPublicClient({
        chain: buildRpcChain(activeChainId.value, customRpc.value),
        transport: http(customRpc.value),
      }) as PublicClient
    }

    if (walletProviderReady.value) {
      const connector = connection.connector.value

      if (connector) {
        return (await getConnectorClient(config, {
          chainId: activeChainId.value,
          connector,
        })) as unknown as PublicClient
      }
    }

    return publicClient.value
  }

  const metadataFetch = createProviderRpcFetch(resolveClient)

  async function readContractFunction(params: ContractReadParams) {
    const client = await resolveClient()

    if (!client) {
      throw new Error(
        'Set an RPC URL or connect a wallet before reading this contract.',
      )
    }

    return readContractAction(client, {
      address: params.address as Address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
      ...(params.blockNumber !== undefined
        ? { blockNumber: params.blockNumber }
        : {}),
    })
  }

  async function writeContractFunction(params: ContractWalletWriteParams) {
    if (!connection.isConnected.value) {
      throw new Error('Connect a wallet before sending contract writes.')
    }

    return writeContractAsync({
      address: params.address as Address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
      chainId: params.chainId ?? activeChainId.value,
      ...(params.value !== undefined
        ? { value: normalizeWriteValue(params.value) }
        : {}),
    })
  }

  return {
    connection,
    walletConnected: computed(() => Boolean(connection.isConnected.value)),
    walletProviderReady,
    publicRpcAvailable,
    walletAddress: computed(
      () => connection.address.value as Address | undefined,
    ),
    walletChainId,
    chainId: activeChainId,
    rpc: customRpc,
    publicClient,
    metadataOptions,
    metadataFetch,
    readContractFunction,
    writeContractFunction,
  }
}
