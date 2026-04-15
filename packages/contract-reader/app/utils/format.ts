import { formatEther } from 'viem'
import type { ContractActionParam } from '../types/contract'
import type { SemanticType } from '../types/metadata'

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

export function formatSemanticValue(
  value: unknown,
  semanticType?: string,
): string {
  if (
    semanticType === 'eth' &&
    (typeof value === 'bigint' ||
      typeof value === 'number' ||
      typeof value === 'string')
  ) {
    return `${formatEthValue(String(value))} ETH`
  }

  if (semanticType === 'percentage' && isNumberish(value)) {
    return `${formatArgValue(value)}%`
  }

  if (semanticType === 'basis-points' && isNumberish(value)) {
    return `${formatArgValue(value)} bps`
  }

  if (
    semanticType === 'timestamp' &&
    (typeof value === 'bigint' || typeof value === 'number')
  ) {
    const n = Number(value)
    if (n === 0) return 'never'
    return new Date(n * 1000).toLocaleString()
  }

  return formatArgValue(value)
}

export function resultFieldKind(
  output: ContractActionParam,
  semanticType?: string,
):
  | 'default'
  | 'eth'
  | 'percentage'
  | 'basis-points'
  | 'timestamp'
  | 'address'
  | 'boolean' {
  if (semanticType === 'eth') return 'eth'
  if (semanticType === 'percentage') return 'percentage'
  if (semanticType === 'basis-points') return 'basis-points'
  if (semanticType === 'timestamp') return 'timestamp'
  if (semanticType === 'address' || output.type === 'address') return 'address'
  if (semanticType === 'boolean' || output.type === 'bool') return 'boolean'
  return 'default'
}

export function getResultValue(
  result: unknown,
  output: ContractActionParam,
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
  output: ContractActionParam,
  index: number,
): string {
  return output.label || output.name || `result ${index + 1}`
}

export function isTupleType(output: ContractActionParam): boolean {
  return output.type === 'tuple' && Boolean(output.components?.length)
}

export function isNumberish(value: unknown): value is bigint | number | string {
  return (
    typeof value === 'bigint' ||
    typeof value === 'number' ||
    typeof value === 'string'
  )
}
