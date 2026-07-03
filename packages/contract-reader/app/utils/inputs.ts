import { isAddress } from 'viem'
import { parseUnits } from '@evmnow/sdk'
import { ensCache } from '@1001-digital/layers.evm/app/utils/ens'
import type { ContractActionParam } from '../types/contract'
import type { Autofill, ParamMeta, ValidationRule } from '../types/metadata'

/**
 * Resolves the fixed-point decimals for an amount-like input (eth/gwei/amount/
 * token-amount), or `null` when the input is not amount-like or its decimals
 * are not yet known (e.g. an unresolved token-amount). Amount inputs collect a
 * human decimal value that is scaled to raw base units on submit.
 */
export type AmountDecimalsResolver = (
  input: ContractActionParam,
  key: string,
) => number | null

function isTupleInput(input: ContractActionParam): boolean {
  return input.type === 'tuple' && !!input.components?.length
}

function isArrayInput(type: string): boolean {
  return type.endsWith('[]')
}

function getArrayDepth(type: string): number {
  return type.match(/\[\]/g)?.length ?? 0
}

function getArrayItemType(type: string): string {
  let itemType = type
  while (itemType.endsWith('[]')) itemType = itemType.slice(0, -2)
  return itemType
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isIntegerType(type: string): boolean {
  return /^u?int\d*$/.test(type)
}

function parseBigInt(value: string): bigint | null {
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

function parseArrayEntries(value: string): unknown[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed
    return [parsed]
  } catch {
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
}

function parseJsonArray(value: string): unknown[] | null {
  try {
    const parsed = JSON.parse(value.trim())
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function resolveAddressValue(
  value: string,
  resolvedEns?: ResolvedEnsAddresses,
): string {
  const trimmed = value.trim()
  if (!trimmed || isAddress(trimmed)) return trimmed

  const resolved = resolvedEns?.[trimmed]
  if (resolved && isAddress(resolved)) return resolved

  const cached = ensCache.get(`ens-resolve-${trimmed}`)
  return cached?.address && isAddress(cached.address) ? cached.address : trimmed
}

function parsePrimitiveValue(
  value: string,
  type: string,
  resolvedEns?: ResolvedEnsAddresses,
): unknown {
  const trimmed = value.trim()
  if (!trimmed && type !== 'bool') return ''

  if (type === 'bool') return trimmed === 'true'
  if (isIntegerType(type)) return BigInt(trimmed)
  if (type === 'address') return resolveAddressValue(trimmed, resolvedEns)
  return trimmed
}

function parseArrayValue(
  value: string,
  type: string,
  resolvedEns?: ResolvedEnsAddresses,
): unknown[] {
  const itemType = getArrayItemType(type)
  const nested = getArrayDepth(type) > 1
  const items = parseArrayEntries(value)

  if (itemType === 'tuple' || nested) return parseJsonArray(value) ?? items

  return items.map((item) => {
    if (typeof item !== 'string') {
      if (itemType === 'bool') return Boolean(item)
      if (isIntegerType(itemType)) {
        const parsed = parseBigInt(String(item))
        return parsed ?? item
      }
      return item
    }

    return parsePrimitiveValue(item, itemType, resolvedEns)
  })
}

function validatePrimitiveValue(
  value: string,
  type: string,
  validation?: ValidationRule,
): string | null {
  const trimmed = value.trim()
  if (!trimmed && type !== 'bool') return null

  if (validation?.enum?.length) {
    const allowed = new Set(validation.enum.map((entry) => entry.value))
    if (!allowed.has(trimmed)) {
      return validation.message || 'Invalid value'
    }
  }

  if (validation?.pattern) {
    try {
      const pattern = new RegExp(validation.pattern)
      if (!pattern.test(trimmed)) {
        return validation.message || 'Invalid value'
      }
    } catch {
      return validation.message || 'Invalid value'
    }
  }

  if (type === 'address') {
    if (isAddress(trimmed) || trimmed.includes('.')) return null
    return validation?.message || 'Enter a valid address'
  }

  if (type === 'bool') {
    return trimmed === 'true' || trimmed === 'false'
      ? null
      : validation?.message || 'Choose true or false'
  }

  if (isIntegerType(type)) {
    const parsed = parseBigInt(trimmed)
    if (parsed === null) {
      return validation?.message || 'Enter a valid number'
    }

    if (validation?.min !== undefined) {
      const min = parseBigInt(validation.min)
      if (min !== null && parsed < min) {
        return validation.message || `Must be at least ${validation.min}`
      }
    }

    if (validation?.max !== undefined) {
      const max = parseBigInt(validation.max)
      if (max !== null && parsed > max) {
        return validation.message || `Must be at most ${validation.max}`
      }
    }
  }

  return null
}

function validateArrayValue(
  value: string,
  type: string,
  validation?: ValidationRule,
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const itemType = getArrayItemType(type)
  const nested = getArrayDepth(type) > 1

  if (itemType === 'tuple' || nested) {
    const items = parseJsonArray(trimmed)
    if (!items) return validation?.message || 'Enter a JSON array'

    if (itemType === 'tuple') {
      return items.every((item) => Array.isArray(item) || isRecord(item))
        ? null
        : validation?.message || 'Enter tuple values as arrays or objects'
    }

    return items.every(Array.isArray)
      ? null
      : validation?.message || 'Enter nested arrays as JSON arrays'
  }

  const items = parseArrayEntries(trimmed)
  if (!items.length) return null

  if (validation?.enum?.length) {
    const allowed = new Set(validation.enum.map((entry) => entry.value))
    for (const item of items) {
      if (!allowed.has(String(item).trim())) {
        return validation.message || 'Invalid value'
      }
    }
  }

  for (const item of items) {
    const itemError = validatePrimitiveValue(
      typeof item === 'string' ? item : String(item),
      itemType,
      validation,
    )
    if (itemError) return itemError
  }

  return null
}

function getParamMeta(
  meta: Record<string, ParamMeta> | undefined,
  input: ContractActionParam,
  prefix?: string,
): ParamMeta | undefined {
  return input.meta || (!prefix ? meta?.[input.name] : undefined)
}

export function resolveAutofillValue(
  autofill: Autofill | undefined,
  context: {
    contractAddress?: string
    connectedAddress?: string
    now?: number
  },
): string | undefined {
  if (!autofill) return undefined
  if (autofill === 'contract-address') return context.contractAddress
  if (autofill === 'connected-address') return context.connectedAddress
  if (autofill === 'zero-address')
    return '0x0000000000000000000000000000000000000000'
  if (autofill === 'block-timestamp') {
    return String(Math.floor((context.now ?? Date.now()) / 1000))
  }
  if (autofill.type === 'constant') return autofill.value
  return undefined
}

export function buildInputKey(
  prefix: string | undefined,
  name: string | undefined,
  index: number,
): string {
  const key = name || `_${index}`
  return prefix ? `${prefix}.${key}` : key
}

export function seedInputValues(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  prefix?: string,
  meta?: Record<string, ParamMeta>,
  context: {
    contractAddress?: string
    connectedAddress?: string
    now?: number
  } = {},
): Record<string, string> {
  inputs.forEach((input, index) => {
    const key = buildInputKey(prefix, input.name, index)
    const inputMeta = getParamMeta(meta, input, prefix)

    if (isTupleInput(input)) {
      seedInputValues(
        input.components!,
        values,
        key,
        inputMeta?.components,
        context,
      )
      return
    }

    // Hidden or disabled params are always driven by autofill, not the user.
    // Overwrite on every seed to keep the locked value consistent.
    if (inputMeta?.hidden || inputMeta?.disabled) {
      const autofill = resolveAutofillValue(inputMeta.autofill, context)
      if (autofill !== undefined) {
        values[key] = autofill
        return
      }
    }

    if (!(key in values) || values[key] === '') {
      const autofill = resolveAutofillValue(inputMeta?.autofill, context)
      values[key] =
        autofill !== undefined ? autofill : input.type === 'bool' ? 'true' : ''
    }
  })

  return values
}

export function buildInputArgs(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  prefix?: string,
  amountDecimals?: AmountDecimalsResolver,
  resolvedEns?: ResolvedEnsAddresses,
): unknown[] {
  return inputs.map((input, index) => {
    const key = buildInputKey(prefix, input.name, index)
    if (isTupleInput(input)) {
      return buildInputArgs(
        input.components!,
        values,
        key,
        amountDecimals,
        resolvedEns,
      )
    }

    // Locked params hold autofill values, which are already denominated in
    // raw base units — only user-facing amount inputs collect human decimals.
    const locked = Boolean(input.meta?.hidden || input.meta?.disabled)
    const decimals = locked ? null : amountDecimals?.(input, key)
    if (decimals != null) {
      const raw = (values[key] || '').trim()
      return raw ? parseUnits(raw, decimals) : raw
    }

    return parseInputValue(values[key] || '', input.type, resolvedEns)
  })
}

/** Addresses keyed by the ENS name they were resolved from. */
export type ResolvedEnsAddresses = Record<string, string>

export type EnsAddressResolver = (identifier: string) => Promise<string | null>

function isEnsName(value: string): boolean {
  return !!value && !isAddress(value) && value.includes('.')
}

function collectEnsNames(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  prefix?: string,
): Set<string> {
  const names = new Set<string>()

  inputs.forEach((input, index) => {
    const key = buildInputKey(prefix, input.name, index)

    if (isTupleInput(input)) {
      for (const name of collectEnsNames(input.components!, values, key)) {
        names.add(name)
      }
      return
    }

    const value = values[key] || ''

    if (input.type === 'address') {
      const trimmed = value.trim()
      if (isEnsName(trimmed)) names.add(trimmed)
      return
    }

    // Only flat address arrays substitute per-item values (see parseArrayValue).
    if (input.type === 'address[]') {
      for (const entry of parseArrayEntries(value)) {
        if (typeof entry !== 'string') continue
        const trimmed = entry.trim()
        if (isEnsName(trimmed)) names.add(trimmed)
      }
    }
  })

  return names
}

/**
 * Force-resolve every ENS name used in address-typed inputs before args are
 * built, so a read/write never races the background resolution of the address
 * input fields. Returns the resolved name → address map for `buildInputArgs`,
 * or an error message for the first name that fails to resolve.
 */
export async function resolveEnsInputs(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  resolveAddress: EnsAddressResolver,
): Promise<{ resolved: ResolvedEnsAddresses; error: string | null }> {
  const resolved: ResolvedEnsAddresses = {}
  const names = [...collectEnsNames(inputs, values)]

  const addresses = await Promise.all(
    names.map((name) => resolveAddress(name).catch(() => null)),
  )

  for (const [index, name] of names.entries()) {
    const address = addresses[index]
    if (!address || !isAddress(address)) {
      return { resolved, error: `Could not resolve ENS name "${name}"` }
    }
    resolved[name] = address
  }

  return { resolved, error: null }
}

/** Validate a human decimal amount string (non-negative, optional fraction). */
export function validateAmountString(
  value: string,
  validation?: ValidationRule,
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^\d+(\.\d+)?$|^\.\d+$/.test(trimmed)
    ? null
    : validation?.message || 'Enter a valid amount'
}

export function serializeInputArgs(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  prefix?: string,
): string[] {
  return inputs.map((input, index) => {
    const key = buildInputKey(prefix, input.name, index)
    if (isTupleInput(input)) {
      return JSON.stringify(serializeInputArgs(input.components!, values, key))
    }

    return values[key] || ''
  })
}

export function hydrateInputValues(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  args: unknown[],
  prefix?: string,
): void {
  inputs.forEach((input, index) => {
    const key = buildInputKey(prefix, input.name, index)
    const arg = args[index]

    if (arg === undefined) return

    if (isTupleInput(input)) {
      if (Array.isArray(arg)) {
        hydrateInputValues(input.components!, values, arg, key)
        return
      }

      if (typeof arg === 'string' && arg) {
        try {
          const parsed = JSON.parse(arg)
          if (Array.isArray(parsed)) {
            hydrateInputValues(input.components!, values, parsed, key)
          }
        } catch {}
      }
      return
    }

    if (isArrayInput(input.type) && Array.isArray(arg)) {
      values[key] = JSON.stringify(arg)
      return
    }

    values[key] = typeof arg === 'string' ? arg : String(arg ?? '')
  })
}

export function parseInputValue(
  value: string,
  type: string,
  resolvedEns?: ResolvedEnsAddresses,
): unknown {
  if (isArrayInput(type)) return parseArrayValue(value, type, resolvedEns)
  return parsePrimitiveValue(value, type, resolvedEns)
}

export function buildInputErrors(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  meta?: Record<string, ParamMeta>,
  prefix?: string,
  amountDecimals?: AmountDecimalsResolver,
): Record<string, string | null> {
  const errors: Record<string, string | null> = {}

  inputs.forEach((input, index) => {
    const key = buildInputKey(prefix, input.name, index)
    const inputMeta = getParamMeta(meta, input, prefix)

    if (isTupleInput(input)) {
      Object.assign(
        errors,
        buildInputErrors(
          input.components!,
          values,
          inputMeta?.components,
          key,
          amountDecimals,
        ),
      )
      return
    }

    const value = values[key] || ''
    const locked = Boolean(inputMeta?.hidden || inputMeta?.disabled)
    if (!locked && amountDecimals?.(input, key) != null) {
      errors[key] = validateAmountString(value, inputMeta?.validation)
      return
    }
    errors[key] = isArrayInput(input.type)
      ? validateArrayValue(value, input.type, inputMeta?.validation)
      : validatePrimitiveValue(value, input.type, inputMeta?.validation)
  })

  return errors
}

export function applyInputExample(
  inputs: ContractActionParam[],
  values: Record<string, string>,
  example: Record<string, string>,
): Record<string, string> {
  // Example params are keyed by ABI parameter name or position (`_N`);
  // positional keys map onto the named field they describe.
  const fieldKeys = new Set(
    inputs.map((input, index) => buildInputKey(undefined, input.name, index)),
  )

  for (const [key, value] of Object.entries(example)) {
    let fieldKey = key
    const positional = key.match(/^_(\d+)$/)
    if (positional && !fieldKeys.has(key)) {
      const input = inputs[Number(positional[1])]
      if (!input) continue
      fieldKey = buildInputKey(undefined, input.name, Number(positional[1]))
    }
    values[fieldKey] = value
  }

  return values
}
