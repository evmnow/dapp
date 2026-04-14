import type { MetadataResolveFn } from '@evmnow/contract-reader/types/actions'
import {
  isResolvableMetadataUri,
  looksLikeMetadata,
  normalizeForDisplay,
} from '@evmnow/contract-reader/utils/metadata-display'

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

function toFetchUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`
  if (uri.startsWith('ipns://')) return `https://ipfs.io/ipns/${uri.slice(7)}`
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

export function useTokenMetadataResolver() {
  const resolveMetadata: MetadataResolveFn = async (uri) => {
    const input = uri.trim()
    if (!isResolvableMetadataUri(input)) return null

    const rawJson = input.startsWith('data:')
      ? decodeJsonDataUri(input)
      : await fetch(toFetchUrl(input), {
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
