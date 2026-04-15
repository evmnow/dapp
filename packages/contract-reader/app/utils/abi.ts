import type { Abi, AbiFunction } from 'viem'
import { toFunctionSelector } from 'viem'
import { resolveActions, type ResolvedAction } from '@evmnow/sdk'
import type {
  ContractAction,
  ContractActionParam,
  ContractSourceUnit,
} from '../types/contract'
import type {
  ContractUIMetadata,
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
): ContractActionParam {
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

function buildAction(
  resolved: ResolvedAction,
  facetMap: Map<string, string> | null,
): ContractAction {
  const fn = resolved.abi as unknown as AbiFunction
  const meta = resolved.meta
  const raw = fn as any
  const inferred =
    fn.stateMutability ??
    (raw.payable ? 'payable' : raw.constant ? 'view' : 'nonpayable')
  const stateMutability = meta.stateMutability || inferred
  const isRead = stateMutability === 'view' || stateMutability === 'pure'

  const facet = facetMap?.get(resolved.selector.toLowerCase())

  return {
    id: resolved.id,
    abi: fn,
    name: fn.name,
    slug: resolved.id,
    signature: resolved.signature,
    selector: resolved.selector,
    title: meta.title || prettifyName(fn.name),
    description: meta.description,
    inputs: fn.inputs.map((input, i) => buildParam(input, i, meta.params)),
    outputs: (fn.outputs || []).map((output, i) =>
      buildParam(output, i, meta.returns),
    ),
    stateMutability,
    isRead,
    isPayable: stateMutability === 'payable',
    group: meta.group || facet,
    warning: meta.warning || meta.deprecated,
    meta,
    facet,
    synthesized: resolved.synthesized,
    isVariant: resolved.isVariant,
  }
}

export function parseActions(
  abi: Abi,
  metadata?: ContractUIMetadata,
  sources?: ContractSourceUnit[],
): { read: ContractAction[]; write: ContractAction[] } {
  const facetMap = sources ? buildFacetMap(sources) : null
  const { actions } = resolveActions(abi, metadata ?? {})

  const read: ContractAction[] = []
  const write: ContractAction[] = []

  for (const resolved of actions) {
    const action = buildAction(resolved, facetMap)
    if (action.isRead) read.push(action)
    else write.push(action)
  }

  return { read, write }
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

function isConstant(action: ContractAction): boolean {
  return (
    action.isRead &&
    action.abi.inputs.length === 0 &&
    (action.abi.outputs?.length || 0) <= 1
  )
}

export interface ContractActionGroup {
  key: string
  label: string
  actions: ContractAction[]
}

export interface GroupedContractActions {
  grouped: ContractActionGroup[]
  ungrouped: ContractAction[]
  constants: ContractAction[]
}

function addToGroup(
  map: Map<string, ContractAction[]>,
  key: string,
  action: ContractAction,
) {
  const group = map.get(key) || []
  group.push(action)
  map.set(key, group)
}

export function groupActions(
  actions: ContractAction[],
  metadata?: ContractUIMetadata,
  allFunctionNames?: Set<string>,
): GroupedContractActions {
  const metadataGroups = metadata?.groups || {}
  const hasMetadataGroups = Object.keys(metadataGroups).length > 0
  const facetNames = new Set(
    actions.map((a) => a.facet).filter(Boolean) as string[],
  )
  const standardMap =
    !hasMetadataGroups && !facetNames.size
      ? buildStandardMap(
          allFunctionNames || new Set(actions.map((a) => a.name)),
        )
      : null

  const groupMap = new Map<string, ContractAction[]>()
  const constants: ContractAction[] = []
  const ungrouped: ContractAction[] = []

  for (const action of actions) {
    if (action.group && (metadataGroups[action.group] || facetNames.has(action.group))) {
      addToGroup(groupMap, action.group, action)
    } else if (standardMap?.has(action.name)) {
      addToGroup(groupMap, standardMap.get(action.name)!, action)
    } else if (standardMap && isConstant(action)) {
      constants.push(action)
    } else {
      ungrouped.push(action)
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
    .map(([key, groupActions]) => ({
      key,
      label: metadataGroups[key]?.label || key,
      actions: groupActions.sort(
        (a, b) => (a.meta?.order ?? Infinity) - (b.meta?.order ?? Infinity),
      ),
    }))

  return { grouped, ungrouped, constants }
}
