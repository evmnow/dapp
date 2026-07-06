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

function readStorage(key: string): string | null {
  if (!import.meta.client) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function useReaderRpc() {
  const config = useRuntimeConfig()
  const defaultChainId = computed(() => {
    return normalizeChainId(config.public.defaultChainId) ?? 1
  })
  // The app is ssr:false, so saved values can hydrate synchronously in the
  // state initializers — waiting for onMounted would let the immediate
  // watchers downstream fetch once with the defaults (possibly against the
  // wrong chain) before the saved RPC settings kick in.
  const rpc = useState<string>('evm-now:contract-reader:rpc', () => {
    return (
      readStorage(RPC_STORAGE_KEY) ?? String(config.public.defaultRpc ?? '')
    )
  })
  const chainId = useState<string>('evm-now:contract-reader:chain-id', () => {
    return (
      normalizeChainIdInput(readStorage(CHAIN_ID_STORAGE_KEY)) ||
      String(defaultChainId.value)
    )
  })
  // Dappspec ?ds-rpc-<chainId>=<url> overrides, captured once per session so
  // they survive in-app navigation but are never persisted.
  const rpcOverrides = useState<RpcOverride[]>(
    'evm-now:contract-reader:rpc-overrides',
    () => (import.meta.client ? parseRpcOverrides(window.location.search) : []),
  )
  watch(
    rpc,
    (value) => {
      if (!import.meta.client) {
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
      if (!import.meta.client) {
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
