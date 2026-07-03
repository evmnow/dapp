export interface RpcOverride {
  chainId: number
  rpc: string
}

// Dappspec query parameter override: ?ds-rpc-<chainId>=<url>
// https://ethereum-magicians.org/t/new-erc-best-practices-for-dapps-dappspec/24407
const RPC_OVERRIDE_KEY_PATTERN = /^ds-rpc-([1-9]\d*)$/

function normalizeRpcUrl(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

export function parseRpcOverrides(search: string): RpcOverride[] {
  const overrides = new Map<number, string>()

  for (const [key, value] of new URLSearchParams(search)) {
    const chainId = Number(RPC_OVERRIDE_KEY_PATTERN.exec(key)?.[1])
    if (!Number.isSafeInteger(chainId) || overrides.has(chainId)) continue

    const rpc = normalizeRpcUrl(value)
    if (rpc) overrides.set(chainId, rpc)
  }

  return [...overrides.entries()].map(([chainId, rpc]) => ({ chainId, rpc }))
}
