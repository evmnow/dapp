import type { Abi, AbiFunction } from 'viem'
import type { ContractUIMetadata, ActionMeta, ParamMeta } from './metadata'

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

export interface ContractActionParam {
  name: string
  label: string
  type: string
  description?: string
  meta?: ParamMeta
  components?: ContractActionParam[]
}

export interface ContractAction {
  /** Free-form action identifier (authored or synthesized default id). */
  id: string
  abi: AbiFunction
  name: string
  /** URL-safe routing handle; defaults to `id`. */
  slug: string
  signature?: string
  /** 4-byte selector, lowercase. */
  selector: `0x${string}`
  title: string
  description?: string
  inputs: ContractActionParam[]
  outputs: ContractActionParam[]
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
  isRead: boolean
  isPayable: boolean
  group?: string
  warning?: string
  meta?: ActionMeta
  facet?: string
  /** True when this action was synthesized from the ABI (no authored entry). */
  synthesized: boolean
  /** True when another action shares this selector. */
  isVariant: boolean
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
  actions: {
    read: ContractAction[]
    write: ContractAction[]
  }
  sourceFiles: SourceFile[]
  sources?: ContractSourceUnit[]
  proxy?: ContractProxy
}
