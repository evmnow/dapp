import type { Abi, AbiFunction } from 'viem'
import { toFunctionSelector } from 'viem'
import type {
  ContractFunction,
  ContractFunctionParam,
  ContractSourceUnit,
} from '../types/contract'
import type {
  ContractUIMetadata,
  FunctionMeta,
  ParamMeta,
} from '../types/metadata'

type AbiParam = {
  name?: string
  type: string
  components?: readonly AbiParam[]
}

function prettifyName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())
}

function buildParam(
  input: AbiParam,
  index: number,
  paramsMeta?: Record<string, ParamMeta>,
): ContractFunctionParam {
  const key = input.name || `_${index}`
  const meta = getParamMeta(paramsMeta, key, index)

  return {
    name: key,
    label: meta?.label || input.name || `param ${index}`,
    type: input.type,
    description: meta?.description,
    meta,
    components: input.components?.map((component, i) =>
      buildParam(component, i, meta?.components),
    ),
  }
}

function getParamMeta(
  paramsMeta: Record<string, ParamMeta> | undefined,
  key: string,
  index: number,
): ParamMeta | undefined {
  if (!paramsMeta) return undefined
  return paramsMeta[key] || paramsMeta[String(index)]
}

function buildFunctionSignature(fn: AbiFunction): string {
  return `${fn.name}(${fn.inputs.map(formatAbiType).join(',')})`
}

function formatAbiType(input: AbiParam): string {
  if (!input.type.startsWith('tuple')) return input.type

  const suffix = input.type.slice('tuple'.length)
  const inner = input.components?.length
    ? input.components.map(formatAbiType).join(',')
    : ''

  return `(${inner})${suffix}`
}

function buildFacetMap(sources: ContractSourceUnit[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const unit of sources) {
    if (unit.role !== 'facet') continue
    const facetName = unit.name || unit.address
    for (const item of unit.abi) {
      if ((item as any).type !== 'function') continue
      try {
        map.set(
          toFunctionSelector(item as AbiFunction).toLowerCase(),
          facetName,
        )
      } catch {}
    }
  }

  return map
}

export function parseAbiFunctions(
  abi: Abi,
  metadata?: ContractUIMetadata,
  sources?: ContractSourceUnit[],
): { read: ContractFunction[]; write: ContractFunction[] } {
  const functions = abi.filter(
    (item): item is AbiFunction => item.type === 'function',
  )
  const facetMap = sources ? buildFacetMap(sources) : null
  const read: ContractFunction[] = []
  const write: ContractFunction[] = []

  for (const fn of functions) {
    const meta: FunctionMeta | undefined = metadata?.functions?.[fn.name]
    const raw = fn as any
    const inferred =
      fn.stateMutability ??
      (raw.payable ? 'payable' : raw.constant ? 'view' : 'nonpayable')
    const stateMutability = meta?.stateMutability || inferred
    const isRead = stateMutability === 'view' || stateMutability === 'pure'

    let facet: string | undefined
    if (facetMap) {
      try {
        facet = facetMap.get(toFunctionSelector(fn).toLowerCase())
      } catch {}
    }

    const contractFunction: ContractFunction = {
      abi: fn,
      name: fn.name,
      slug: fn.name,
      signature: buildFunctionSignature(fn),
      title: meta?.title || prettifyName(fn.name),
      description: meta?.description,
      inputs: fn.inputs.map((input, i) => buildParam(input, i, meta?.params)),
      outputs: (fn.outputs || []).map((output, i) =>
        buildParam(output, i, meta?.returns),
      ),
      stateMutability,
      isRead,
      isPayable: stateMutability === 'payable',
      group: meta?.group || facet,
      warning: meta?.warning || meta?.deprecated,
      meta,
      facet,
    }

    if (isRead) read.push(contractFunction)
    else write.push(contractFunction)
  }

  assignOverloadSlugs([...read, ...write])
  return { read, write }
}

function assignOverloadSlugs(functions: ContractFunction[]) {
  const counts = new Map<string, number>()
  for (const fn of functions)
    counts.set(fn.name, (counts.get(fn.name) || 0) + 1)

  for (const fn of functions) {
    if ((counts.get(fn.name) || 0) <= 1) continue
    const types = fn.abi.inputs.map((input) => input.type).join('-')
    fn.slug = types ? `${fn.name}-${types}` : fn.name
  }
}

const STANDARDS = [
  {
    label: 'ERC-1155',
    discriminators: ['balanceOfBatch', 'safeBatchTransferFrom', 'uri'],
    members: [
      'balanceOf',
      'balanceOfBatch',
      'setApprovalForAll',
      'isApprovedForAll',
      'safeTransferFrom',
      'safeBatchTransferFrom',
      'uri',
    ],
    minDiscriminators: 2,
  },
  {
    label: 'ERC-721',
    discriminators: ['ownerOf', 'getApproved', 'tokenURI', 'tokenByIndex'],
    members: [
      'balanceOf',
      'ownerOf',
      'safeTransferFrom',
      'transferFrom',
      'approve',
      'setApprovalForAll',
      'getApproved',
      'isApprovedForAll',
      'tokenURI',
      'tokenByIndex',
      'tokenOfOwnerByIndex',
      'totalSupply',
    ],
    minDiscriminators: 2,
  },
  {
    label: 'ERC-20',
    discriminators: ['decimals', 'allowance'],
    members: [
      'totalSupply',
      'balanceOf',
      'transfer',
      'transferFrom',
      'approve',
      'allowance',
      'decimals',
      'name',
      'symbol',
    ],
    minDiscriminators: 2,
  },
  {
    label: 'ERC-2981',
    discriminators: ['royaltyInfo'],
    members: ['royaltyInfo', 'supportsInterface'],
    minDiscriminators: 1,
  },
  {
    label: 'Access Control',
    discriminators: ['hasRole', 'getRoleAdmin', 'grantRole', 'revokeRole'],
    members: [
      'hasRole',
      'getRoleAdmin',
      'grantRole',
      'revokeRole',
      'renounceRole',
      'DEFAULT_ADMIN_ROLE',
    ],
    minDiscriminators: 2,
  },
  {
    label: 'Ownable',
    discriminators: ['transferOwnership', 'renounceOwnership'],
    members: ['owner', 'transferOwnership', 'renounceOwnership'],
    minDiscriminators: 1,
  },
  {
    label: 'Pausable',
    discriminators: ['paused', 'pause', 'unpause'],
    members: ['paused', 'pause', 'unpause'],
    minDiscriminators: 2,
  },
]

const STANDARD_ORDER = new Map(
  STANDARDS.map((standard, i) => [standard.label, i]),
)

function buildStandardMap(names: Set<string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const standard of STANDARDS) {
    const hits = standard.discriminators.filter((name) =>
      names.has(name),
    ).length
    if (hits < standard.minDiscriminators) continue
    for (const member of standard.members) {
      if (names.has(member) && !map.has(member)) map.set(member, standard.label)
    }
  }
  return map
}

function isConstant(fn: ContractFunction): boolean {
  return (
    fn.isRead &&
    fn.abi.inputs.length === 0 &&
    (fn.abi.outputs?.length || 0) <= 1
  )
}

function addToGroup(
  map: Map<string, ContractFunction[]>,
  key: string,
  fn: ContractFunction,
) {
  const group = map.get(key) || []
  group.push(fn)
  map.set(key, group)
}

export function groupFunctions(
  functions: ContractFunction[],
  metadata?: ContractUIMetadata,
  allFunctionNames?: Set<string>,
): {
  grouped: { key: string; label: string; functions: ContractFunction[] }[]
  ungrouped: ContractFunction[]
  constants: ContractFunction[]
} {
  const metadataGroups = metadata?.groups || {}
  const hasMetadataGroups = Object.keys(metadataGroups).length > 0
  const facetNames = new Set(
    functions.map((fn) => fn.facet).filter(Boolean) as string[],
  )
  const standardMap =
    !hasMetadataGroups && !facetNames.size
      ? buildStandardMap(
          allFunctionNames || new Set(functions.map((fn) => fn.name)),
        )
      : null

  const groupMap = new Map<string, ContractFunction[]>()
  const constants: ContractFunction[] = []
  const ungrouped: ContractFunction[] = []

  for (const fn of functions) {
    if (fn.group && (metadataGroups[fn.group] || facetNames.has(fn.group))) {
      addToGroup(groupMap, fn.group, fn)
    } else if (standardMap?.has(fn.name)) {
      addToGroup(groupMap, standardMap.get(fn.name)!, fn)
    } else if (standardMap && isConstant(fn)) {
      constants.push(fn)
    } else {
      ungrouped.push(fn)
    }
  }

  const grouped = Array.from(groupMap.entries())
    .sort(([a], [b]) => {
      const metaA = metadataGroups[a]?.order
      const metaB = metadataGroups[b]?.order
      if (metaA != null || metaB != null)
        return (metaA ?? Infinity) - (metaB ?? Infinity)
      const orderA = STANDARD_ORDER.get(a) ?? Infinity
      const orderB = STANDARD_ORDER.get(b) ?? Infinity
      return orderA !== orderB ? orderA - orderB : a.localeCompare(b)
    })
    .map(([key, groupFunctions]) => ({
      key,
      label: metadataGroups[key]?.label || key,
      functions: groupFunctions.sort(
        (a, b) => (a.meta?.order ?? Infinity) - (b.meta?.order ?? Infinity),
      ),
    }))

  return { grouped, ungrouped, constants }
}
