import { describe, expect, it, vi } from 'vitest'
import { parseUnits } from '@evmnow/sdk'
import type { ContractActionParam } from '../app/types/contract'
import {
  buildInputArgs,
  buildInputErrors,
  buildInputKey,
  hydrateInputValues,
  parseBigInt,
  parseInputValue,
  resolveAutofillValue,
  serializeInputArgs,
  validateAmountString,
} from '../app/utils/inputs'

function param(
  overrides: Partial<ContractActionParam> & { type: string },
): ContractActionParam {
  const name = overrides.name ?? 'value'
  return { name, label: name, ...overrides }
}

describe('parseBigInt', () => {
  it('parses decimal and hex integers', () => {
    expect(parseBigInt('42')).toBe(42n)
    expect(parseBigInt('-7')).toBe(-7n)
    expect(parseBigInt('0x10')).toBe(16n)
  })

  it('returns null for values BigInt cannot parse', () => {
    expect(parseBigInt('abc')).toBeNull()
    expect(parseBigInt('1.5')).toBeNull()
    expect(parseBigInt('1e3')).toBeNull()
    expect(parseBigInt('1n')).toBeNull()
  })
})

describe('parseInputValue', () => {
  it('parses primitives by ABI type', () => {
    expect(parseInputValue(' 42 ', 'uint256')).toBe(42n)
    expect(parseInputValue('true', 'bool')).toBe(true)
    expect(parseInputValue('false', 'bool')).toBe(false)
    expect(parseInputValue('anything-else', 'bool')).toBe(false)
    expect(parseInputValue(' hello ', 'string')).toBe('hello')
  })

  it('parses comma-separated and JSON arrays', () => {
    expect(parseInputValue('1, 2, 3', 'uint256[]')).toEqual([1n, 2n, 3n])
    expect(parseInputValue('[1,2]', 'uint8[]')).toEqual([1n, 2n])
    expect(parseInputValue('["a","b"]', 'string[]')).toEqual(['a', 'b'])
  })

  it('keeps nested arrays and tuple arrays as parsed JSON', () => {
    expect(parseInputValue('[[1,2],[3]]', 'uint256[][]')).toEqual([[1, 2], [3]])
    expect(parseInputValue('[{"a":1}]', 'tuple[]')).toEqual([{ a: 1 }])
  })

  it('substitutes resolved ENS names for address inputs', () => {
    const resolved = {
      'vitalik.eth': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    }
    expect(parseInputValue('vitalik.eth', 'address', resolved)).toBe(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    )
    const list = parseInputValue(
      'vitalik.eth, other.eth',
      'address[]',
      resolved,
    ) as string[]
    expect(list[0]).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(list[1]).toBe('other.eth')
  })
})

describe('buildInputArgs', () => {
  it('builds primitive args from string values', () => {
    const inputs = [
      param({ name: 'to', type: 'address' }),
      param({ name: 'amount', type: 'uint256' }),
      param({ name: 'flag', type: 'bool' }),
    ]
    const values = {
      to: '0x0000000000000000000000000000000000000001',
      amount: '10',
      flag: 'true',
    }

    expect(buildInputArgs(inputs, values)).toEqual([
      '0x0000000000000000000000000000000000000001',
      10n,
      true,
    ])
  })

  it('scales amount-like inputs to base units via the decimals resolver', () => {
    const inputs = [param({ name: 'amount', type: 'uint256' })]
    const values = { amount: '1.5' }

    const args = buildInputArgs(inputs, values, undefined, () => 18)

    expect(args).toEqual([parseUnits('1.5', 18)])
  })

  it('scales amount-like tuple members (wave-1 regression)', () => {
    const inputs = [
      param({
        name: 'config',
        type: 'tuple',
        components: [
          param({ name: 'recipient', type: 'address' }),
          param({
            name: 'amount',
            type: 'uint256',
            meta: { type: 'token-amount' },
          }),
        ],
      }),
    ]
    const values = {
      'config.recipient': '0x0000000000000000000000000000000000000001',
      'config.amount': '2.5',
    }

    const amountDecimals = vi.fn(
      (input: ContractActionParam, key: string): number | null =>
        key === 'config.amount' ? 6 : null,
    )

    const args = buildInputArgs(inputs, values, undefined, amountDecimals)

    expect(args).toEqual([
      ['0x0000000000000000000000000000000000000001', parseUnits('2.5', 6)],
    ])
    // The resolver must receive the tuple-prefixed key, not the bare name.
    expect(amountDecimals).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'amount' }),
      'config.amount',
    )
  })

  it('does not scale hidden/disabled (autofill-driven) amount inputs', () => {
    const inputs = [
      param({
        name: 'amount',
        type: 'uint256',
        meta: { type: 'token-amount', hidden: true },
      }),
    ]
    const values = { amount: '2500000' }

    const args = buildInputArgs(inputs, values, undefined, () => 6)

    expect(args).toEqual([2500000n])
  })
})

describe('buildInputErrors', () => {
  it('validates primitives and integer bounds', () => {
    const inputs = [
      param({ name: 'to', type: 'address' }),
      param({
        name: 'count',
        type: 'uint256',
        meta: { validation: { min: '1', max: '10' } },
      }),
    ]

    expect(
      buildInputErrors(inputs, { to: 'not-an-address', count: '5' }),
    ).toEqual({
      to: 'Enter a valid address',
      count: null,
    })
    expect(buildInputErrors(inputs, { to: '', count: '0' }).count).toBe(
      'Must be at least 1',
    )
    expect(buildInputErrors(inputs, { to: '', count: '11' }).count).toBe(
      'Must be at most 10',
    )
  })

  it('accepts ENS-style names for address inputs', () => {
    const inputs = [param({ name: 'to', type: 'address' })]
    expect(buildInputErrors(inputs, { to: 'vitalik.eth' }).to).toBeNull()
  })

  it('applies metadata validation patterns', () => {
    const inputs = [
      param({
        name: 'code',
        type: 'string',
        meta: {
          validation: { pattern: '^[a-z]+$', message: 'lowercase only' },
        },
      }),
    ]

    expect(buildInputErrors(inputs, { code: 'abc' }).code).toBeNull()
    expect(buildInputErrors(inputs, { code: 'ABC' }).code).toBe(
      'lowercase only',
    )
  })

  it('ignores patterns longer than 200 characters (ReDoS cap)', () => {
    const inputs = [
      param({
        name: 'code',
        type: 'string',
        meta: { validation: { pattern: `^${'a'.repeat(210)}$` } },
      }),
    ]

    // The value cannot match the oversized pattern, yet no error is raised —
    // the rule is disabled instead of executed.
    expect(buildInputErrors(inputs, { code: 'zzz' }).code).toBeNull()
  })

  it('skips pattern checks for values longer than 10k characters', () => {
    const inputs = [
      param({
        name: 'code',
        type: 'string',
        meta: { validation: { pattern: '^abc$' } },
      }),
    ]

    expect(
      buildInputErrors(inputs, { code: 'z'.repeat(10_001) }).code,
    ).toBeNull()
    expect(buildInputErrors(inputs, { code: 'zzz' }).code).toBe('Invalid value')
  })

  it('ignores syntactically invalid patterns', () => {
    const inputs = [
      param({
        name: 'code',
        type: 'string',
        meta: { validation: { pattern: '([' } },
      }),
    ]

    expect(buildInputErrors(inputs, { code: 'anything' }).code).toBeNull()
  })

  it('validates amount inputs as human decimal strings', () => {
    const inputs = [param({ name: 'amount', type: 'uint256' })]
    const decimals = () => 18

    expect(
      buildInputErrors(
        inputs,
        { amount: '1.5' },
        undefined,
        undefined,
        decimals,
      ).amount,
    ).toBeNull()
    expect(
      buildInputErrors(inputs, { amount: '-3' }, undefined, undefined, decimals)
        .amount,
    ).toBe('Enter a valid amount')
  })

  it('validates tuple members under their prefixed keys', () => {
    const inputs = [
      param({
        name: 'config',
        type: 'tuple',
        components: [param({ name: 'count', type: 'uint256' })],
      }),
    ]

    expect(buildInputErrors(inputs, { 'config.count': 'xyz' })).toEqual({
      'config.count': 'Enter a valid number',
    })
  })
})

describe('validateAmountString', () => {
  it('accepts non-negative decimals', () => {
    expect(validateAmountString('1')).toBeNull()
    expect(validateAmountString('0.25')).toBeNull()
    expect(validateAmountString('.5')).toBeNull()
    expect(validateAmountString('')).toBeNull()
  })

  it('rejects negatives and non-numbers', () => {
    expect(validateAmountString('-1')).toBe('Enter a valid amount')
    expect(validateAmountString('1,5')).toBe('Enter a valid amount')
    expect(validateAmountString('abc')).toBe('Enter a valid amount')
  })
})

describe('serialize/hydrate round-trip', () => {
  it('round-trips flat and tuple values through args', () => {
    const inputs = [
      param({ name: 'to', type: 'address' }),
      param({
        name: 'config',
        type: 'tuple',
        components: [param({ name: 'count', type: 'uint256' })],
      }),
    ]
    const values = {
      to: '0x0000000000000000000000000000000000000001',
      'config.count': '3',
    }

    const args = serializeInputArgs(inputs, values)
    expect(args).toEqual([
      '0x0000000000000000000000000000000000000001',
      '["3"]',
    ])

    const hydrated: Record<string, string> = {}
    hydrateInputValues(inputs, hydrated, args)
    expect(hydrated).toEqual(values)
  })
})

describe('resolveAutofillValue', () => {
  it('resolves the built-in autofill sources', () => {
    const context = {
      contractAddress: '0xc0ffee',
      connectedAddress: '0xdecaf',
      now: 1_700_000_000_500,
    }

    expect(resolveAutofillValue('contract-address', context)).toBe('0xc0ffee')
    expect(resolveAutofillValue('connected-address', context)).toBe('0xdecaf')
    expect(resolveAutofillValue('zero-address', context)).toBe(
      '0x0000000000000000000000000000000000000000',
    )
    expect(resolveAutofillValue('block-timestamp', context)).toBe('1700000000')
    expect(
      resolveAutofillValue({ type: 'constant', value: '7' }, context),
    ).toBe('7')
    expect(resolveAutofillValue(undefined, context)).toBeUndefined()
  })
})

describe('buildInputKey', () => {
  it('falls back to positional keys and applies prefixes', () => {
    expect(buildInputKey(undefined, 'amount', 2)).toBe('amount')
    expect(buildInputKey(undefined, undefined, 2)).toBe('_2')
    expect(buildInputKey('config', 'amount', 0)).toBe('config.amount')
  })
})
