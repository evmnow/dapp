import type { Abi, Hash } from 'viem'
import type { PreviewMetadata } from '../utils/metadata-display'

export interface ContractReadParams {
  address: string
  abi: Abi
  functionName: string
  args?: unknown[]
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
