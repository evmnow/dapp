import { parseRpcOverrides, type RpcOverride } from '../utils/rpcOverrides'

const RPC_STORAGE_KEY = 'evm-now:contract-reader:rpc'
const CHAIN_ID_STORAGE_KEY = 'evm-now:contract-reader:chain-id'

function normalizeChainId(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined
  }

  const trimmed = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(trimmed)) return undefined

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeChainIdInput(value: unknown) {
  const chainId = normalizeChainId(value)
  return chainId ? String(chainId) : ''
}

export function useReaderRpc() {
  const config = useRuntimeConfig()
  const defaultChainId = computed(() => {
    return normalizeChainId(config.public.defaultChainId) ?? 1
  })
  const rpc = useState<string>('evm-now:contract-reader:rpc', () => {
    return String(config.public.defaultRpc ?? '')
  })
  const chainId = useState<string>('evm-now:contract-reader:chain-id', () => {
    return String(defaultChainId.value)
  })
  // Dappspec ?ds-rpc-<chainId>=<url> overrides, captured once per session so
  // they survive in-app navigation but are never persisted.
  const rpcOverrides = useState<RpcOverride[]>(
    'evm-now:contract-reader:rpc-overrides',
    () => (import.meta.client ? parseRpcOverrides(window.location.search) : []),
  )
  const hydrated = ref(false)

  onMounted(() => {
    hydrated.value = true

    const savedRpc = window.localStorage.getItem(RPC_STORAGE_KEY)
    if (savedRpc && savedRpc !== rpc.value) {
      rpc.value = savedRpc
    }

    const savedChainId = normalizeChainIdInput(
      window.localStorage.getItem(CHAIN_ID_STORAGE_KEY),
    )
    if (savedChainId && savedChainId !== chainId.value) {
      chainId.value = savedChainId
    }
  })

  watch(
    rpc,
    (value) => {
      if (!hydrated.value) {
        return
      }

      if (!value.trim()) {
        window.localStorage.removeItem(RPC_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(RPC_STORAGE_KEY, value.trim())
    },
    { immediate: false },
  )

  watch(
    chainId,
    (value) => {
      if (!hydrated.value) {
        return
      }

      const trimmed = value.trim()
      if (!trimmed) {
        window.localStorage.removeItem(CHAIN_ID_STORAGE_KEY)
        return
      }

      const normalizedChainId = normalizeChainIdInput(trimmed)
      if (!normalizedChainId) {
        window.localStorage.removeItem(CHAIN_ID_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(CHAIN_ID_STORAGE_KEY, normalizedChainId)
    },
    { immediate: false },
  )

  const rpcOverride = computed(() => {
    const overrides = rpcOverrides.value
    if (!overrides.length) return undefined

    const selectedChainId =
      normalizeChainId(chainId.value) ?? defaultChainId.value
    return (
      overrides.find((override) => override.chainId === selectedChainId) ??
      overrides[0]
    )
  })

  const effectiveRpc = computed(() => {
    return rpcOverride.value?.rpc ?? rpc.value.trim()
  })
  const isConfigured = computed(() => effectiveRpc.value.length > 0)
  const effectiveChainId = computed(() => {
    return (
      rpcOverride.value?.chainId ??
      normalizeChainId(chainId.value) ??
      defaultChainId.value
    )
  })

  return {
    chainId,
    effectiveChainId,
    effectiveRpc,
    isConfigured,
    rpc,
    rpcOverride,
    rpcOverrides,
  }
}
