import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getPublicClient } from '@wagmi/core'
import { isAddress, type PublicClient } from 'viem'
import type { EthereumNames } from '@1001-digital/ethereum-names'
import { createEthereumNameClient } from '../utils/names'

const clients = new WeakMap<PublicClient, EthereumNames>()
const reverseCaches = new WeakMap<
  EthereumNames,
  Map<string, { request: Promise<string | null>; expiresAt: number }>
>()
const REVERSE_CACHE_TTL_MS = 5 * 60 * 1000

function cachedClient(client: PublicClient): EthereumNames {
  let names = clients.get(client)
  if (!names) {
    names = createEthereumNameClient({ client })
    clients.set(client, names)
  }
  return names
}

export function useEthereumNames() {
  const config = useConfig()

  function getNames(): EthereumNames | null {
    const client = getPublicClient(config, { chainId: 1 })
    return client ? cachedClient(client) : null
  }

  async function resolveAddress(identifier: string): Promise<string | null> {
    const value = identifier.trim()
    if (isAddress(value)) return value
    return (await getNames()?.resolve(value)) ?? null
  }

  async function reverseAddress(address: string): Promise<string | null> {
    if (!isAddress(address)) return null
    const names = getNames()
    if (!names) return null

    const key = address.toLowerCase()
    let cache = reverseCaches.get(names)
    if (!cache) {
      cache = new Map()
      reverseCaches.set(names, cache)
    }

    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.request
    if (cached) cache.delete(key)

    const request = names.reverse(address).catch((error) => {
      if (cache.get(key)?.request === request) {
        cache.delete(key)
      }
      throw error
    })
    if (cache.size >= 500) {
      const oldestKey = cache.keys().next().value
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }
    cache.set(key, {
      request,
      expiresAt: Date.now() + REVERSE_CACHE_TTL_MS,
    })
    return request
  }

  function system(identifier: string) {
    return getNames()?.system(identifier) ?? null
  }

  return { resolveAddress, reverseAddress, system }
}

export function useEthereumName(
  address: MaybeRefOrGetter<`0x${string}` | undefined | null>,
) {
  const { reverseAddress } = useEthereumNames()
  const name = ref<string | null>(null)
  const pending = ref(false)
  let run = 0

  watch(
    () => toValue(address),
    async (value) => {
      const current = ++run
      name.value = null
      if (!value) return
      pending.value = true
      try {
        const resolved = await reverseAddress(value)
        if (current === run) name.value = resolved
      } catch {
        if (current === run) name.value = null
      } finally {
        if (current === run) pending.value = false
      }
    },
    { immediate: true },
  )

  return { name: computed(() => name.value), pending }
}
