import { describe, expect, it, vi } from 'vitest'
import type { EthereumNameLookupClient } from '../app/utils/names'
import { resolveContractIdentifier } from '../app/utils/names'

const ADDRESS = '0x1C0Aa8cCD568d90d61659F060D1bFb1e6f855A20'

function client(
  result: Awaited<ReturnType<EthereumNameLookupClient['lookup']>>,
): EthereumNameLookupClient {
  return {
    lookup: vi.fn(async () => result),
    resolve: vi.fn(),
    reverse: vi.fn(),
    system: vi.fn(),
  }
}

describe('resolveContractIdentifier', () => {
  it.each([
    ['ross.wei', 'wns'],
    ['ross.gwei', 'gns'],
    ['vitalik.eth', 'ens'],
  ] as const)('resolves %s through %s', async (name, system) => {
    const names = client({
      input: name,
      name,
      address: ADDRESS,
      system,
      status: 'resolved',
      verified: true,
      ambiguous: false,
      matches: [],
    })

    await expect(resolveContractIdentifier(name, names)).resolves.toBe(ADDRESS)
    expect(names.lookup).toHaveBeenCalledWith(name)
  })

  it('passes addresses and chain-scoped identifiers through unchanged', async () => {
    const names = client({
      input: '',
      name: null,
      address: null,
      system: null,
      status: 'not-found',
      verified: false,
      ambiguous: false,
      matches: [],
    })

    await expect(resolveContractIdentifier(ADDRESS, names)).resolves.toBe(
      ADDRESS,
    )
    await expect(
      resolveContractIdentifier(`1:${ADDRESS}`, names),
    ).resolves.toBe(`1:${ADDRESS}`)
    await expect(
      resolveContractIdentifier('1:vitalik.eth', names),
    ).resolves.toBe('1:vitalik.eth')
    expect(names.lookup).not.toHaveBeenCalled()
  })

  it('fails closed for an ambiguous name', async () => {
    const names = client({
      input: 'ross.wei',
      name: null,
      address: null,
      system: null,
      status: 'ambiguous',
      verified: false,
      ambiguous: true,
      matches: [],
    })

    await expect(resolveContractIdentifier('ross.wei', names)).rejects.toThrow(
      'ambiguous',
    )
  })
})
