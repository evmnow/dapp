import { hexToString, stringToHex } from 'viem'
import type { ContractActionParam } from '../types/contract'

// Widget selection and value conversions for the semantic input types that
// need more than a text field. Storage formats follow the contract-metadata
// standard: dates/datetimes/timestamps are unix seconds for integer ABI
// params (ISO strings for `string` params), durations are seconds, and
// `bytes32-utf8` params store the right-padded hex the ABI expects.

export type SemanticWidget =
  'enum' | 'slider' | 'date' | 'datetime' | 'duration' | 'bytes32-utf8'

export function semanticWidget(
  input: ContractActionParam,
): SemanticWidget | null {
  const type = input.meta?.type
  if (typeof type === 'object') {
    if (type.type === 'enum') return 'enum'
    if (type.type === 'slider') return 'slider'
  }

  const name = typeof type === 'string' ? type : type?.type
  if (name === 'date') return 'date'
  if (name === 'datetime' || name === 'timestamp') return 'datetime'
  if (name === 'duration') return 'duration'
  if (name === 'bytes32-utf8' && input.type === 'bytes32') return 'bytes32-utf8'
  return null
}

export function enumValuesOf(
  input: ContractActionParam,
): Record<string, string> | undefined {
  const type = input.meta?.type
  return typeof type === 'object' && type.type === 'enum'
    ? type.values
    : undefined
}

export function sliderOf(
  input: ContractActionParam,
): { min: string; max: string; step?: string } | undefined {
  const type = input.meta?.type
  return typeof type === 'object' && type.type === 'slider' ? type : undefined
}

/** String ABI params store dates as ISO strings; integer params as unix seconds. */
export function storesIsoDate(input: ContractActionParam): boolean {
  return input.type === 'string'
}

/** The stored value formatted for a date / datetime-local input. */
export function formatDateValue(
  stored: string,
  widget: 'date' | 'datetime',
  iso: boolean,
): string {
  const raw = stored.trim()
  if (!raw) return ''
  const date = iso ? new Date(raw) : new Date(Number(raw) * 1000)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  if (widget === 'date') return day
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A date / datetime-local picker value converted to the stored format. */
export function parseDateValue(
  picker: string,
  widget: 'date' | 'datetime',
  iso: boolean,
): string {
  if (!picker) return ''
  if (iso) return picker
  // Date-only values must be parsed as LOCAL midnight — a bare 'YYYY-MM-DD'
  // is spec-defined UTC midnight, which round-trips to the previous day in
  // UTC-negative timezones.
  const local = widget === 'date' ? `${picker}T00:00` : picker
  const millis = new Date(local).getTime()
  return Number.isNaN(millis) ? '' : String(Math.floor(millis / 1000))
}

export const DURATION_UNITS = [
  { label: 'seconds', seconds: 1 },
  { label: 'minutes', seconds: 60 },
  { label: 'hours', seconds: 3600 },
  { label: 'days', seconds: 86400 },
] as const

/** Decompose stored seconds into the largest unit that divides evenly. */
export function decomposeDuration(stored: string): {
  amount: string
  unit: number
} {
  const total = Number(stored || '0')
  if (!total) return { amount: '', unit: 1 }
  for (const { seconds } of [...DURATION_UNITS].reverse()) {
    if (total % seconds === 0) {
      return { amount: String(total / seconds), unit: seconds }
    }
  }
  return { amount: String(total), unit: 1 }
}

export function composeDuration(amount: string, unit: number): string {
  const parsed = Number(amount)
  if (!amount || !Number.isFinite(parsed)) return ''
  return String(Math.round(parsed * unit))
}

/** Decode a stored bytes32 hex back to its UTF-8 text for display. */
export function decodeBytes32Text(stored: string): string {
  const raw = stored.trim()
  if (!raw.startsWith('0x')) return raw
  try {
    return hexToString(raw as `0x${string}`, { size: 32 }).replace(/\0+$/, '')
  } catch {
    return raw
  }
}

/** Encode text as right-padded bytes32 hex. Throws when it exceeds 32 bytes. */
export function encodeBytes32Text(text: string): string {
  return stringToHex(text, { size: 32 })
}
