import type { MetadataResolveFn } from '../types/actions'
import {
  isResolvableMetadataUri,
  looksLikeMetadata,
  normalizeForDisplay,
} from '../utils/metadata-display'

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io/ipfs/'
const DEFAULT_ARWEAVE_GATEWAY = 'https://arweave.net/'

function decodeJsonDataUri(uri: string): Record<string, unknown> | null {
  const match = uri.match(
    /^data:application\/json(?:;(base64|utf-?8))?,(.*)$/is,
  )
  if (!match) return null

  const [, encoding, raw] = match

  try {
    const text =
      encoding?.toLowerCase() === 'base64'
        ? atob(String(raw || ''))
        : decodeURIComponent(String(raw || ''))
    const parsed = JSON.parse(text)
    return looksLikeMetadata(parsed) ? parsed : null
  } catch {
    return null
  }
}

function joinGateway(gateway: string, path: string) {
  return gateway.endsWith('/') ? `${gateway}${path}` : `${gateway}/${path}`
}

/**
 * Builds a `MetadataResolveFn` for `ActionDetail`'s token metadata previews.
 * Resolves `data:` URIs locally and `ipfs://` / `ipns://` / `ar://` / https
 * URIs through configurable gateways. Gateways default to
 * `appConfig.evm.ipfsGateway` / `appConfig.evm.arweaveGateway` (provided by
 * the wallet layer) and can be overridden per call site.
 */
export function useTokenMetadataResolver(
  options: {
    ipfsGateway?: string
    arweaveGateway?: string
    fetch?: typeof fetch
  } = {},
) {
  const appConfig = useAppConfig() as {
    evm?: { ipfsGateway?: string; arweaveGateway?: string }
  }

  const ipfsGateway =
    options.ipfsGateway || appConfig.evm?.ipfsGateway || DEFAULT_IPFS_GATEWAY
  const arweaveGateway =
    options.arweaveGateway ||
    appConfig.evm?.arweaveGateway ||
    DEFAULT_ARWEAVE_GATEWAY
  const ipnsGateway = ipfsGateway.replace(/\/ipfs\/?$/, '/ipns/')

  function toFetchUrl(uri: string): string {
    if (uri.startsWith('ipfs://')) return joinGateway(ipfsGateway, uri.slice(7))
    if (uri.startsWith('ipns://')) return joinGateway(ipnsGateway, uri.slice(7))
    if (uri.startsWith('ar://'))
      return joinGateway(arweaveGateway, uri.slice(5))
    return uri
  }

  const resolveMetadata: MetadataResolveFn = async (uri) => {
    const input = uri.trim()
    if (!isResolvableMetadataUri(input)) return null

    const doFetch = options.fetch ?? fetch
    const rawJson = input.startsWith('data:')
      ? decodeJsonDataUri(input)
      : await doFetch(toFetchUrl(input), {
          headers: { accept: 'application/json' },
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Metadata request failed: ${response.status}`)
          }

          const parsed = await response.json()
          return looksLikeMetadata(parsed) ? parsed : null
        })

    if (!rawJson) return null

    return {
      metadata: normalizeForDisplay(rawJson),
      rawJson,
    }
  }

  return { resolveMetadata }
}
