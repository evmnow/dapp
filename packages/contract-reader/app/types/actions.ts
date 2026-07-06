import type { Abi, Hash } from 'viem'
import type { TokenInfo } from '@evmnow/sdk'
import type { PreviewMetadata } from '../utils/metadata-display'

export interface ContractReadParams {
  address: string
  abi: Abi
  functionName: string
  args?: unknown[]
  /** Pin the read to a historical block. Implementations may ignore it. */
  blockNumber?: bigint
}

export type ContractReadFn = (params: ContractReadParams) => Promise<unknown>

export interface ContractWriteParams {
  address: string
  abi: Abi
  functionName: string
  args?: unknown[]
  value?: bigint
}

export type ContractWriteFn = (params: ContractWriteParams) => Promise<Hash>

export interface MetadataResolveResult {
  metadata: PreviewMetadata | null
  rawJson?: Record<string, unknown> | null
}

export type MetadataResolveFn = (
  uri: string,
) => Promise<MetadataResolveResult | null>

/**
 * Resolve a token's decimals/symbol for `token-amount` params — e.g. through
 * an indexer API instead of per-token `eth_call`s. Return null when the
 * token's decimals cannot be determined (the input stays a raw integer field).
 */
export type TokenInfoResolveFn = (address: string) => Promise<TokenInfo | null>
