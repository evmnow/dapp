import type { Abi, AbiFunction } from 'viem'
import type { ContractUIMetadata, FunctionMeta, ParamMeta } from './metadata'

export type ContractType = 'standard' | 'proxy' | 'diamond'
export type SourceRole = 'main' | 'implementation' | 'facet'

export interface ContractSourceUnit {
  address: string
  name: string
  abi: readonly unknown[]
  sourceCode: string
  compilerVersion?: string
  entryFileName?: string | null
  role: SourceRole
}

export interface ContractProxyTarget {
  address: string
  selectors?: string[]
  abi?: readonly unknown[]
  natspec?: {
    userdoc?: Record<string, unknown>
    devdoc?: Record<string, unknown>
  }
}

export interface ContractProxy {
  pattern: string
  targets: ContractProxyTarget[]
  beacon?: string
  admin?: string
}

export interface ContractFunctionParam {
  name: string
  label: string
  type: string
  description?: string
  meta?: ParamMeta
  components?: ContractFunctionParam[]
}

export interface ContractFunction {
  abi: AbiFunction
  name: string
  slug: string
  signature?: string
  title: string
  description?: string
  inputs: ContractFunctionParam[]
  outputs: ContractFunctionParam[]
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
  isRead: boolean
  isPayable: boolean
  group?: string
  warning?: string
  meta?: FunctionMeta
  facet?: string
}

export interface SourceFile {
  path: string
  content: string
}

export interface ContractData {
  address: string
  chainId?: number
  abi: Abi
  name?: string
  metadata?: ContractUIMetadata
  contractType: ContractType
  deployer?: string
  deploymentTxHash?: string
  deployedAt?: string
  functions: {
    read: ContractFunction[]
    write: ContractFunction[]
  }
  sourceFiles: SourceFile[]
  sources?: ContractSourceUnit[]
  proxy?: ContractProxy
}
