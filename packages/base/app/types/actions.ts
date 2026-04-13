import type { Abi, Hash } from 'viem'

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
