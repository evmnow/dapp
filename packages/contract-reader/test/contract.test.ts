import { describe, expect, it } from 'vitest'
import type { ContractMetadataResult } from '../app/types/metadata-result'
import { toContractData } from '../app/utils/contract'

const ADDRESS = '0x1111111111111111111111111111111111111111'

function raw(overrides: Record<string, unknown> = {}) {
  return {
    address: ADDRESS,
    abi: [],
    ...overrides,
  } as unknown as ContractMetadataResult
}

describe('toContractData', () => {
  it('returns null without a usable record or address', () => {
    expect(toContractData(null)).toBeNull()
    expect(toContractData({} as ContractMetadataResult)).toBeNull()
    // A non-address fallback input (e.g. an unresolved ENS name) is not used.
    expect(
      toContractData({ abi: [] } as unknown as ContractMetadataResult, 'x.eth'),
    ).toBeNull()
  })

  it('falls back to the queried address when the result lacks one', () => {
    const data = toContractData(
      { abi: [] } as unknown as ContractMetadataResult,
      ADDRESS,
    )
    expect(data?.address).toBe(ADDRESS)
  })

  it('prefers explicit addresses over the fallback input', () => {
    const data = toContractData(
      raw(),
      '0x2222222222222222222222222222222222222222',
    )
    expect(data?.address).toBe(ADDRESS)
  })

  it('reads the chain id from the result or its nested metadata', () => {
    expect(toContractData(raw({ chainId: 10 }))?.chainId).toBe(10)
    expect(toContractData(raw({ metadata: { chainId: 8453 } }))?.chainId).toBe(
      8453,
    )
    expect(toContractData(raw())?.chainId).toBeUndefined()
  })

  it('merges top-level and nested metadata fields', () => {
    const data = toContractData(
      raw({ name: 'Top', metadata: { name: 'Nested', symbol: 'NST' } }),
    )
    expect(data?.metadata?.name).toBe('Nested')
    expect(data?.metadata?.symbol).toBe('NST')
    expect(data?.name).toBe('Nested')
  })

  it('normalizes a path→content source map into a single source unit', () => {
    const data = toContractData(
      raw({
        name: 'Token',
        sources: {
          'contracts/Token.sol': 'contract Token {}',
        },
      }),
    )

    expect(data?.sources).toHaveLength(1)
    expect(data?.sources?.[0]).toMatchObject({
      address: ADDRESS,
      name: 'Token',
      entryFileName: 'contracts/Token.sol',
      role: 'main',
    })
    expect(data?.sourceFiles).toEqual([
      { path: 'contracts/Token.sol', content: 'contract Token {}' },
    ])
  })

  it('normalizes source arrays with roles and fallbacks', () => {
    const data = toContractData(
      raw({
        sources: [
          { sourceCode: 'contract A {}', role: 'implementation' },
          { content: 'contract B {}', role: 'bogus-role' },
        ],
      }),
    )

    expect(data?.sources?.[0]).toMatchObject({
      name: 'Source 1',
      sourceCode: 'contract A {}',
      role: 'implementation',
    })
    // Unknown roles collapse to `main`.
    expect(data?.sources?.[1]?.role).toBe('main')
  })

  it('normalizes proxies and infers the contract type', () => {
    const proxied = toContractData(
      raw({
        proxy: {
          pattern: 'eip-1967',
          targets: [{ address: '0x3333333333333333333333333333333333333333' }],
        },
      }),
    )
    expect(proxied?.contractType).toBe('proxy')
    expect(proxied?.proxy?.targets).toHaveLength(1)

    const diamond = toContractData(
      raw({
        proxy: {
          pattern: 'eip-2535-diamond',
          targets: [
            {
              address: '0x4444444444444444444444444444444444444444',
              selectors: ['0x12345678'],
            },
          ],
        },
      }),
    )
    expect(diamond?.contractType).toBe('diamond')
    expect(diamond?.sources?.[0]?.role).toBe('facet')
  })

  it('drops malformed proxy declarations', () => {
    const data = toContractData(
      raw({ proxy: { pattern: 'eip-1967', targets: [{}] } }),
    )
    expect(data?.proxy).toBeUndefined()
    expect(data?.contractType).toBe('standard')
  })

  it('parses actions from the ABI when none are provided', () => {
    const abi = [
      {
        type: 'function',
        name: 'totalSupply',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
      {
        type: 'function',
        name: 'transfer',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
      },
    ]
    const data = toContractData(raw({ abi }))

    expect(data?.actions.read.map((action) => action.name)).toContain(
      'totalSupply',
    )
    expect(data?.actions.write.map((action) => action.name)).toContain(
      'transfer',
    )
  })
})
