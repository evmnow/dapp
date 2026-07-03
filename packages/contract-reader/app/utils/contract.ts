import type { Abi } from 'viem'
import type {
  ContractData,
  ContractProxy,
  ContractProxyTarget,
  ContractSourceUnit,
  ContractType,
  SourceFile,
  SourceRole,
} from '../types/contract'
import type { ContractMetadataResult } from '../types/metadata-result'
import type { ContractUIMetadata } from '../types/metadata'
import { parseActions } from './abi'
import { parseSourcesIntoFiles, sortSourceFiles } from './source'

const CONTRACT_TYPES: ContractType[] = ['standard', 'proxy', 'diamond']
const SOURCE_ROLES: SourceRole[] = ['main', 'implementation', 'facet']
const METADATA_KEYS = [
  '$schema',
  'chainId',
  'address',
  'includes',
  'meta',
  'name',
  'symbol',
  'description',
  'image',
  'banner_image',
  'featured_image',
  'external_link',
  'collaborators',
  'about',
  'category',
  'links',
  'tags',
  'risks',
  'audits',
  'theme',
  'groups',
  'actions',
  'events',
  'errors',
  'messages',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeAbi(value: unknown): Abi | null {
  return Array.isArray(value) ? (value as Abi) : null
}

function normalizeAddress(raw: Record<string, unknown>, fallback?: string) {
  const metadata = isRecord(raw.metadata) ? raw.metadata : undefined
  return (
    stringValue(raw.address) ||
    stringValue(metadata?.address) ||
    stringValue(raw.resolvedAddress) ||
    stringValue(raw.contractAddress) ||
    stringValue(metadata?.resolvedAddress) ||
    stringValue(metadata?.contractAddress) ||
    (fallback?.startsWith('0x') ? fallback : undefined)
  )
}

function pickMetadataFields(
  value: Record<string, unknown>,
): Partial<ContractUIMetadata> {
  const metadata: Partial<ContractUIMetadata> = {}

  for (const key of METADATA_KEYS) {
    const entry = value[key]
    if (entry !== undefined) metadata[key] = entry as never
  }

  return metadata
}

function normalizeMetadata(value: unknown): ContractUIMetadata | undefined {
  return isRecord(value) ? pickMetadataFields(value) : undefined
}

function normalizeContractMetadata(
  raw: Record<string, unknown>,
): ContractUIMetadata | undefined {
  const direct = normalizeMetadata(raw)
  const nested = normalizeMetadata(raw.metadata)

  if (!direct && !nested) return undefined
  return {
    ...direct,
    ...nested,
  }
}

function normalizeRole(value: unknown): SourceRole {
  return SOURCE_ROLES.includes(value as SourceRole)
    ? (value as SourceRole)
    : 'main'
}

function encodeSourceMap(value: Record<string, unknown>) {
  const entries = Object.entries(value).flatMap(([path, content]) => {
    if (!stringValue(path) || typeof content !== 'string') return []
    return [[path, { content }]] as const
  })

  return entries.length ? JSON.stringify(Object.fromEntries(entries)) : ''
}

function normalizeSources(
  value: unknown,
  fallbackAddress: string,
  fallbackAbi: Abi,
  fallbackName?: string,
): ContractSourceUnit[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      if (!isRecord(entry)) return []

      return {
        address: stringValue(entry.address) || fallbackAddress,
        name: stringValue(entry.name) || `Source ${index + 1}`,
        abi: Array.isArray(entry.abi) ? entry.abi : fallbackAbi,
        sourceCode:
          stringValue(entry.sourceCode) ||
          stringValue(entry.source) ||
          stringValue(entry.content) ||
          '',
        compilerVersion: stringValue(entry.compilerVersion),
        entryFileName: stringValue(entry.entryFileName) || null,
        role: normalizeRole(entry.role),
      }
    })
  }

  if (!isRecord(value)) return []

  const firstPath = Object.keys(value).find(
    (path) => typeof value[path] === 'string',
  )
  return [
    {
      address: fallbackAddress,
      name: fallbackName || 'Contract',
      abi: fallbackAbi,
      sourceCode: encodeSourceMap(value),
      compilerVersion: undefined,
      entryFileName: firstPath || null,
      role: 'main',
    },
  ]
}

function normalizeSourceFiles(value: unknown): SourceFile[] | null {
  if (Array.isArray(value)) {
    const files = value.flatMap((entry) => {
      if (!isRecord(entry)) return []
      const content =
        stringValue(entry.content) ||
        stringValue(entry.source) ||
        stringValue(entry.sourceCode)
      if (!content) return []
      return {
        path: stringValue(entry.path) || 'Contract.sol',
        content,
      }
    })

    return files.length ? sortSourceFiles(files) : null
  }

  if (isRecord(value)) {
    const files = Object.entries(value).flatMap(([path, content]) => {
      if (typeof content === 'string') return { path, content }
      if (!isRecord(content)) return []

      const normalizedContent =
        stringValue(content.content) ||
        stringValue(content.source) ||
        stringValue(content.sourceCode)

      return normalizedContent ? { path, content: normalizedContent } : []
    })

    return files.length ? sortSourceFiles(files) : null
  }

  return null
}

function normalizeNatSpec(value: unknown): ContractProxyTarget['natspec'] {
  if (!isRecord(value)) return undefined

  const natspec: ContractProxyTarget['natspec'] = {}
  if (isRecord(value.userdoc)) natspec.userdoc = value.userdoc
  if (isRecord(value.devdoc)) natspec.devdoc = value.devdoc

  return natspec.userdoc || natspec.devdoc ? natspec : undefined
}

function normalizeProxyTarget(value: unknown): ContractProxyTarget | null {
  if (!isRecord(value)) return null

  const address = stringValue(value.address)
  if (!address) return null

  const selectors = Array.isArray(value.selectors)
    ? value.selectors.filter((selector): selector is string =>
        Boolean(stringValue(selector)),
      )
    : undefined

  return {
    address,
    ...(selectors?.length ? { selectors } : {}),
    abi: Array.isArray(value.abi) ? value.abi : undefined,
    natspec: normalizeNatSpec(value.natspec),
  }
}

function normalizeProxy(value: unknown): ContractProxy | undefined {
  if (!isRecord(value)) return undefined

  const pattern = stringValue(value.pattern)
  if (!pattern || !Array.isArray(value.targets)) return undefined

  const targets = value.targets.flatMap((target) => {
    const normalized = normalizeProxyTarget(target)
    return normalized ? [normalized] : []
  })

  if (!targets.length) return undefined

  return {
    pattern,
    targets,
    beacon: stringValue(value.beacon),
    admin: stringValue(value.admin),
  }
}

function normalizeProxySources(
  proxy: ContractProxy | undefined,
): ContractSourceUnit[] {
  if (!proxy) return []

  const isDiamond = proxy.pattern === 'eip-2535-diamond'
  return proxy.targets.flatMap((target, index) => {
    const isFacet = isDiamond && Boolean(target.selectors?.length)
    return {
      address: target.address,
      name: isFacet ? `Facet ${index + 1}` : `Implementation ${index + 1}`,
      abi: target.abi ?? [],
      sourceCode: '',
      compilerVersion: undefined,
      entryFileName: null,
      role: isFacet ? ('facet' as const) : ('implementation' as const),
    }
  })
}

function normalizeContractType(
  value: unknown,
  proxy: ContractProxy | undefined,
): ContractType {
  if (CONTRACT_TYPES.includes(value as ContractType)) {
    return value as ContractType
  }

  if (proxy?.pattern === 'eip-2535-diamond') return 'diamond'
  if (proxy) return 'proxy'
  return 'standard'
}

function normalizeActions(value: unknown): ContractData['actions'] | null {
  if (!isRecord(value)) return null

  return Array.isArray(value.read) && Array.isArray(value.write)
    ? (value as ContractData['actions'])
    : null
}

export function toContractData(
  raw: ContractMetadataResult | null,
  fallbackInput?: string,
): ContractData | null {
  if (!raw || !isRecord(raw)) return null

  const address = normalizeAddress(raw, fallbackInput)
  if (!address) return null

  const metadata = normalizeContractMetadata(raw)
  const abi = normalizeAbi(raw.abi) ?? ([] as Abi)
  const proxy = normalizeProxy(raw.proxy)

  const name = metadata?.name || stringValue(raw.name)
  const chainId =
    typeof raw.chainId === 'number'
      ? raw.chainId
      : isRecord(raw.metadata) && typeof raw.metadata.chainId === 'number'
        ? raw.metadata.chainId
        : undefined
  const sources = [
    ...normalizeSources(raw.sources, address, abi, name),
    ...normalizeProxySources(proxy),
  ]
  const sourceFiles =
    normalizeSourceFiles(raw.sourceFiles) ||
    normalizeSourceFiles(raw.sources) ||
    parseSourcesIntoFiles(sources)
  const deployer = stringValue(raw.deployer)
  const deploymentTxHash = stringValue(raw.deploymentTxHash)
  const deployedAt = stringValue(raw.deployedAt)

  return {
    address,
    chainId,
    abi,
    name,
    metadata,
    contractType: normalizeContractType(raw.contractType, proxy),
    ...(deployer ? { deployer } : {}),
    ...(deploymentTxHash ? { deploymentTxHash } : {}),
    ...(deployedAt ? { deployedAt } : {}),
    actions:
      normalizeActions(raw.actions) ||
      parseActions(abi, metadata, sources),
    sourceFiles,
    sources,
    proxy,
  }
}
