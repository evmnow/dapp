import {
  createContractClient,
  type ContractClientConfig,
  type SourceConfig,
} from '@evmnow/sdk'
import type { ContractMetadataResult } from '../types/metadata-result'

function cleanRpc(value: string | undefined) {
  const rpc = value?.trim()
  return rpc || undefined
}

function resolveFetch(value: MaybeRef<typeof fetch | undefined> | undefined) {
  if (!value) return undefined
  return isRef(value) ? value.value : value
}

function createClient(options: {
  chainId: number
  rpc?: string
  ensRpc?: string
  repositoryUrl?: string
  sourcifyUrl?: string
  ipfsGateway?: string
  sources?: SourceConfig
  fetch?: typeof fetch
}) {
  const config: ContractClientConfig = {
    chainId: options.chainId,
    rpc: cleanRpc(options.rpc),
    ensRpc: cleanRpc(options.ensRpc),
    repositoryUrl: options.repositoryUrl,
    sourcifyUrl: options.sourcifyUrl,
    ipfsGateway: options.ipfsGateway,
    sources: options.sources,
    fetch: options.fetch,
    include: { sources: true },
  }

  return createContractClient(config)
}

export function useContractMetadataSdk(options: {
  chainId: MaybeRefOrGetter<number>
  rpc?: MaybeRefOrGetter<string>
  ensRpc?: MaybeRefOrGetter<string>
  repositoryUrl?: MaybeRefOrGetter<string | undefined>
  sourcifyUrl?: MaybeRefOrGetter<string | undefined>
  ipfsGateway?: MaybeRefOrGetter<string | undefined>
  sources?: MaybeRefOrGetter<SourceConfig | undefined>
  fetch?: MaybeRef<typeof fetch | undefined>
}) {
  const pending = ref(false)
  const error = shallowRef<Error | null>(null)
  const contract = shallowRef<ContractMetadataResult | null>(null)
  let requestId = 0

  function isLatestRequest(id: number) {
    return id === requestId
  }

  function clear() {
    error.value = null
    contract.value = null
  }

  async function get(input: string) {
    const id = ++requestId
    pending.value = true
    clear()

    const chainId = Number(toValue(options.chainId))
    const client = createClient({
      chainId,
      rpc: options.rpc ? toValue(options.rpc) : undefined,
      ensRpc: options.ensRpc ? toValue(options.ensRpc) : undefined,
      repositoryUrl: options.repositoryUrl
        ? toValue(options.repositoryUrl)
        : undefined,
      sourcifyUrl: options.sourcifyUrl
        ? toValue(options.sourcifyUrl)
        : undefined,
      ipfsGateway: options.ipfsGateway
        ? toValue(options.ipfsGateway)
        : undefined,
      sources: options.sources ? toValue(options.sources) : undefined,
      fetch: resolveFetch(options.fetch),
    })

    try {
      const result = await client.get(input)
      if (isLatestRequest(id)) {
        contract.value = result
      }
      return result
    } catch (cause) {
      const normalized =
        cause instanceof Error ? cause : new Error(String(cause))
      if (isLatestRequest(id)) {
        error.value = normalized
        contract.value = null
      }
      return null
    } finally {
      if (isLatestRequest(id)) {
        pending.value = false
      }
    }
  }

  return {
    contract,
    error,
    clear,
    get,
    pending,
  }
}
