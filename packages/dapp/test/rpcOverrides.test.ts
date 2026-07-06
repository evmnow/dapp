import { describe, expect, it } from 'vitest'
import { parseRpcOverrides } from '../app/utils/rpcOverrides'

describe('parseRpcOverrides', () => {
  it('parses ds-rpc-<chainId> query overrides', () => {
    expect(parseRpcOverrides('?ds-rpc-1=https://rpc.example/eth')).toEqual([
      { chainId: 1, rpc: 'https://rpc.example/eth' },
    ])
  })

  it('collects overrides for multiple chains', () => {
    const overrides = parseRpcOverrides(
      '?ds-rpc-1=https://one.example/&ds-rpc-10=https://ten.example/',
    )
    expect(overrides).toEqual([
      { chainId: 1, rpc: 'https://one.example/' },
      { chainId: 10, rpc: 'https://ten.example/' },
    ])
  })

  it('prefixes scheme-less hosts with https', () => {
    expect(parseRpcOverrides('?ds-rpc-1=rpc.example')).toEqual([
      { chainId: 1, rpc: 'https://rpc.example/' },
    ])
  })

  it('keeps the first override per chain id', () => {
    expect(
      parseRpcOverrides(
        '?ds-rpc-1=https://a.example/&ds-rpc-1=https://b.example/',
      ),
    ).toEqual([{ chainId: 1, rpc: 'https://a.example/' }])
  })

  it('ignores malformed keys', () => {
    expect(parseRpcOverrides('?ds-rpc-0=https://a.example/')).toEqual([])
    expect(parseRpcOverrides('?ds-rpc-x=https://a.example/')).toEqual([])
    expect(parseRpcOverrides('?ds-rpc-01=https://a.example/')).toEqual([])
    expect(parseRpcOverrides('?rpc-1=https://a.example/')).toEqual([])
    expect(parseRpcOverrides('')).toEqual([])
  })

  it('drops values that do not normalize to http(s) URLs', () => {
    expect(parseRpcOverrides('?ds-rpc-1=')).toEqual([])
    expect(parseRpcOverrides('?ds-rpc-1=%20')).toEqual([])
    expect(parseRpcOverrides('?ds-rpc-1=javascript:alert(1)')).toEqual([])
  })
})
