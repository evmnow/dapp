import { formatEther } from 'viem'
import {
  amountKind,
  formatAmount,
  type ParamType,
  type TokenInfo,
} from '@evmnow/sdk'
import type { ContractFunctionParam } from '../types/contract'
import type { ParamMeta, SemanticType } from '../types/metadata'

export type { TokenInfo }

/** Rendering/parsing info for an amount-like input field. */
export interface AmountInputInfo {
  decimals: number
  symbol?: string
  balance?: bigint
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function resolveSemanticType(
  semanticType?: SemanticType,
): string | undefined {
  if (!semanticType) return undefined
  if (typeof semanticType === 'string') return semanticType
  return semanticType.type
}

// The full (possibly object) semantic type — needed for amount decimals/symbol
// and token-amount addresses, which the flattened string form discards.
export function getSemanticType(meta?: ParamMeta): SemanticType | undefined {
  return meta?.type
}

export function getOutputSemanticType(
  output: ContractFunctionParam,
  returnsMeta?: Record<string, ParamMeta>,
): SemanticType | undefined {
  const meta =
    output.meta || (output.name ? returnsMeta?.[output.name] : undefined)
  return meta?.type
}

export function resolveOutputSemanticType(
  output: ContractFunctionParam,
  returnsMeta?: Record<string, ParamMeta>,
): string | undefined {
  return resolveSemanticType(getOutputSemanticType(output, returnsMeta))
}

/** The explicit `tokenAddress` of a `token-amount` type, if any. */
export function tokenAddressOf(type?: SemanticType): string | undefined {
  if (type && typeof type === 'object' && type.type === 'token-amount') {
    return type.tokenAddress
  }
  return undefined
}

// The dapp keeps its own SemanticType copy; it is structurally compatible with
// the SDK's ParamType for the amount-like shapes the SDK cares about.
function asParamType(type?: SemanticType): ParamType | undefined {
  return type as ParamType | undefined
}

/** The amount-like kind of a semantic type, or null. */
export function semanticAmountKind(type?: SemanticType) {
  return amountKind(asParamType(type))
}

export function formatArgValue(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return `[${value.map(formatArgValue).join(', ')}]`
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(
        value,
        (_key, entry) => (typeof entry === 'bigint' ? entry.toString() : entry),
        2,
      )
    } catch {
      return String(value)
    }
  }
  return String(value ?? '')
}

export function formatEthValue(wei: string, maxDecimals = 8): string {
  const eth = formatEther(BigInt(wei))
  const dot = eth.indexOf('.')
  if (dot === -1) return eth
  return eth.slice(0, dot + maxDecimals + 1).replace(/\.?0+$/, '')
}

export type ResultFieldKind =
  | 'default'
  | 'eth'
  | 'gwei'
  | 'amount'
  | 'percentage'
  | 'basis-points'
  | 'timestamp'
  | 'address'
  | 'boolean'

/**
 * Format a value for display from its semantic type. Amount-like types
 * (eth/gwei/amount/token-amount) route through the SDK's canonical formatter;
 * `token-amount` needs resolved `tokenInfo` for real decimals/symbol and falls
 * back to the raw value until it is available.
 */
export function formatSemanticValue(
  value: unknown,
  semanticType?: SemanticType | string,
  tokenInfo?: TokenInfo,
): string {
  const type: SemanticType | undefined =
    typeof semanticType === 'string'
      ? (semanticType as SemanticType)
      : semanticType

  const kind = semanticAmountKind(type)
  if (kind) {
    if (kind === 'token-amount' && !tokenInfo) return formatArgValue(value)
    if (isNumberish(value)) {
      const formatted = formatAmount(value, asParamType(type), {
        tokenInfo,
        maxDecimals: 8,
      })
      if (formatted !== null) return formatted
    }
    return formatArgValue(value)
  }

  const name = typeof type === 'string' ? type : type?.type

  if (name === 'percentage' && isNumberish(value)) {
    return `${formatArgValue(value)}%`
  }

  if (name === 'basis-points' && isNumberish(value)) {
    return `${formatArgValue(value)} bps`
  }

  if (
    name === 'timestamp' &&
    (typeof value === 'bigint' || typeof value === 'number')
  ) {
    const n = Number(value)
    if (n === 0) return 'never'
    return new Date(n * 1000).toLocaleString()
  }

  return formatArgValue(value)
}

export function resultFieldKind(
  output: ContractFunctionParam,
  semanticType?: SemanticType | string,
): ResultFieldKind {
  const type: SemanticType | undefined =
    typeof semanticType === 'string'
      ? (semanticType as SemanticType)
      : semanticType
  const kind = semanticAmountKind(type)
  if (kind === 'eth') return 'eth'
  if (kind === 'gwei') return 'gwei'
  if (kind === 'amount' || kind === 'token-amount') return 'amount'

  const name = typeof type === 'string' ? type : type?.type
  if (name === 'percentage') return 'percentage'
  if (name === 'basis-points') return 'basis-points'
  if (name === 'timestamp') return 'timestamp'
  if (name === 'address' || output.type === 'address') return 'address'
  if (name === 'boolean' || output.type === 'bool') return 'boolean'
  return 'default'
}

export function getResultValue(
  result: unknown,
  output: ContractFunctionParam,
  index: number,
): unknown {
  if (Array.isArray(result)) {
    if (index in result) return result[index]
  }

  if (isRecord(result)) {
    if (output.name && output.name in result) {
      return result[output.name]
    }

    const indexed = result[String(index)]
    if (indexed !== undefined) return indexed

    if (output.label && output.label in result) {
      return result[output.label]
    }
  }

  if (index === 0) return result
  return undefined
}

export function getResultFieldLabel(
  output: ContractFunctionParam,
  index: number,
): string {
  return output.label || output.name || `result ${index + 1}`
}

export function isTupleType(output: ContractFunctionParam): boolean {
  return output.type === 'tuple' && Boolean(output.components?.length)
}

export function isNumberish(value: unknown): value is bigint | number | string {
  return (
    typeof value === 'bigint' ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}
