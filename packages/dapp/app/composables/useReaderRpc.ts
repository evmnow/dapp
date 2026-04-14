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

  const isConfigured = computed(() => rpc.value.trim().length > 0)
  const effectiveChainId = computed(() => {
    return normalizeChainId(chainId.value) ?? defaultChainId.value
  })

  return {
    chainId,
    effectiveChainId,
    isConfigured,
    rpc,
  }
}
