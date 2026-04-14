export interface PreviewAttribute {
  trait_type?: string | null
  value?: unknown
  display_type?: string | null
}

export interface PreviewMetadata {
  name?: string | null
  description?: string | null
  image?: string | null
  image_url?: string | null
  image_data?: string | null
  animation_url?: string | null
  animation?: string | null
  external_url?: string | null
  external_link?: string | null
  background_color?: string | null
  attributes?: PreviewAttribute[] | null
  extra?: Record<string, unknown> | null
  [key: string]: unknown
}

const METADATA_KEYS = new Set([
  'name',
  'description',
  'image',
  'image_url',
  'image_data',
  'animation_url',
  'animation',
  'external_url',
  'external_link',
  'background_color',
  'attributes',
  'properties',
  'localization',
])

export function looksLikeMetadata(
  input: unknown,
): input is Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }

  return Object.keys(input).some((key) => METADATA_KEYS.has(key))
}

export function isResolvableMetadataUri(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^(?:data:application\/json|ipfs:\/\/|ipns:\/\/|ar:\/\/|https?:\/\/)/i.test(
    value.trim(),
  )
}

export function normalizeForDisplay(raw: unknown): PreviewMetadata {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  const input = raw as Record<string, unknown>
  const extra: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (!METADATA_KEYS.has(key) && key !== 'extra') extra[key] = value
  }

  const metadata: PreviewMetadata = {
    name: toNullableString(input.name),
    description: toNullableString(input.description),
    image: toNullableString(input.image ?? input.image_url ?? input.image_data),
    image_url: toNullableString(input.image_url),
    image_data: toNullableString(input.image_data),
    animation_url: toNullableString(input.animation_url ?? input.animation),
    external_url: toNullableString(input.external_url ?? input.external_link),
    background_color: toNullableString(input.background_color),
    attributes: normalizeAttributes(input.attributes),
    extra: mergeExtra(input.extra, extra),
  }

  if (!metadata.image && metadata.image_data) {
    metadata.image = metadata.image_data
  }

  if (metadata.image) metadata.image = toGatewayUrl(metadata.image)
  if (metadata.animation_url) {
    metadata.animation_url = toGatewayUrl(metadata.animation_url)
  }

  return metadata
}

export function formatAttributeValue(attr: PreviewAttribute): string {
  if (attr.display_type === 'date' && typeof attr.value === 'number') {
    return new Date(attr.value * 1000).toLocaleDateString()
  }

  return formatFieldValue(attr.value)
}

export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function normalizeAttributes(value: unknown): PreviewAttribute[] | null {
  if (!Array.isArray(value)) return null

  const attributes: PreviewAttribute[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue

    const attr = entry as Record<string, unknown>
    attributes.push({
      trait_type: toNullableString(attr.trait_type),
      value: attr.value,
      display_type: toNullableString(attr.display_type),
    })
  }

  return attributes.length ? attributes : null
}

function mergeExtra(
  extraValue: unknown,
  fallback: Record<string, unknown>,
): Record<string, unknown> | null {
  const extra: Record<string, unknown> = { ...fallback }

  if (
    extraValue &&
    typeof extraValue === 'object' &&
    !Array.isArray(extraValue)
  ) {
    for (const [key, value] of Object.entries(
      extraValue as Record<string, unknown>,
    )) {
      if (!(key in extra)) extra[key] = value
    }
  }

  return Object.keys(extra).length ? extra : null
}

function toGatewayUrl(uri: string): string {
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`
  if (uri.startsWith('ipns://')) return `https://ipfs.io/ipns/${uri.slice(7)}`
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`
  return uri
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value
}
