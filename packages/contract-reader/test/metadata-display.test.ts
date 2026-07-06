import { describe, expect, it } from 'vitest'
import {
  formatAttributeValue,
  formatFieldValue,
  isResolvableMetadataUri,
  looksLikeMetadata,
  normalizeForDisplay,
  sanitizeDisplayUrl,
} from '../app/utils/metadata-display'

describe('sanitizeDisplayUrl', () => {
  it('allows https, http and data:image URLs', () => {
    expect(sanitizeDisplayUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    )
    expect(sanitizeDisplayUrl('http://example.com/a.png')).toBe(
      'http://example.com/a.png',
    )
    expect(sanitizeDisplayUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA',
    )
    expect(sanitizeDisplayUrl('data:image/svg+xml;utf8,<svg/>')).toBe(
      'data:image/svg+xml;utf8,<svg/>',
    )
  })

  it('nulls active or unknown schemes', () => {
    expect(sanitizeDisplayUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeDisplayUrl('JavaScript:alert(1)')).toBeNull()
    expect(
      sanitizeDisplayUrl('data:text/html,<script>alert(1)</script>'),
    ).toBeNull()
    expect(sanitizeDisplayUrl('vbscript:msgbox(1)')).toBeNull()
    expect(sanitizeDisplayUrl('file:///etc/passwd')).toBeNull()
    expect(sanitizeDisplayUrl('blob:https://example.com/x')).toBeNull()
  })

  it('nulls relative, unparseable and empty values', () => {
    expect(sanitizeDisplayUrl('/relative/path.png')).toBeNull()
    expect(sanitizeDisplayUrl('not a url')).toBeNull()
    expect(sanitizeDisplayUrl('')).toBeNull()
    expect(sanitizeDisplayUrl(null)).toBeNull()
    expect(sanitizeDisplayUrl(undefined)).toBeNull()
  })
})

describe('normalizeForDisplay', () => {
  it('returns an empty object for non-record input', () => {
    expect(normalizeForDisplay(null)).toEqual({})
    expect(normalizeForDisplay('string')).toEqual({})
    expect(normalizeForDisplay([1, 2])).toEqual({})
  })

  it('rewrites ipfs/ipns/ar URIs to https gateways', () => {
    const metadata = normalizeForDisplay({
      image: 'ipfs://QmHash/cat.png',
      animation_url: 'ar://tx-id',
    })

    expect(metadata.image).toBe('https://ipfs.io/ipfs/QmHash/cat.png')
    expect(metadata.animation_url).toBe('https://arweave.net/tx-id')
  })

  it('sanitizes URL fields bound to src/href sinks', () => {
    const metadata = normalizeForDisplay({
      image: 'javascript:alert(1)',
      animation_url: 'data:text/html,<script>1</script>',
      external_url: 'vbscript:evil',
    })

    expect(metadata.image).toBeNull()
    expect(metadata.animation_url).toBeNull()
    expect(metadata.external_url).toBeNull()
  })

  it('falls back through image_url and image_data for the image', () => {
    expect(
      normalizeForDisplay({ image_url: 'https://x.test/a.png' }).image,
    ).toBe('https://x.test/a.png')
    expect(
      normalizeForDisplay({ image_data: 'data:image/svg+xml;utf8,<svg/>' })
        .image,
    ).toBe('data:image/svg+xml;utf8,<svg/>')
  })

  it('maps animation and external_link aliases', () => {
    const metadata = normalizeForDisplay({
      animation: 'https://x.test/a.mp4',
      external_link: 'https://x.test',
    })

    expect(metadata.animation_url).toBe('https://x.test/a.mp4')
    expect(metadata.external_url).toBe('https://x.test')
  })

  it('normalizes attributes and drops malformed entries', () => {
    const metadata = normalizeForDisplay({
      attributes: [
        { trait_type: 'Level', value: 3 },
        'not-an-attribute',
        null,
        [1, 2],
      ],
    })

    expect(metadata.attributes).toEqual([
      { trait_type: 'Level', value: 3, display_type: null },
    ])
    expect(normalizeForDisplay({ attributes: [] }).attributes).toBeNull()
    expect(normalizeForDisplay({ attributes: 'nope' }).attributes).toBeNull()
  })

  it('collects unknown keys into extra without overriding explicit extra', () => {
    const metadata = normalizeForDisplay({
      name: 'Token',
      custom_field: 42,
      extra: { custom_field: 'ignored', other: true },
    })

    expect(metadata.extra).toEqual({ custom_field: 42, other: true })
  })
})

describe('looksLikeMetadata / isResolvableMetadataUri', () => {
  it('detects metadata-shaped records', () => {
    expect(looksLikeMetadata({ name: 'x' })).toBe(true)
    expect(looksLikeMetadata({ image: 'x' })).toBe(true)
    expect(looksLikeMetadata({ unrelated: 'x' })).toBe(false)
    expect(looksLikeMetadata(null)).toBe(false)
    expect(looksLikeMetadata([])).toBe(false)
  })

  it('accepts only resolvable metadata URI schemes', () => {
    expect(isResolvableMetadataUri('ipfs://QmHash')).toBe(true)
    expect(isResolvableMetadataUri('https://x.test/meta.json')).toBe(true)
    expect(isResolvableMetadataUri('data:application/json,{}')).toBe(true)
    expect(isResolvableMetadataUri('ar://tx')).toBe(true)
    expect(isResolvableMetadataUri('javascript:alert(1)')).toBe(false)
    expect(isResolvableMetadataUri('random string')).toBe(false)
    expect(isResolvableMetadataUri(42)).toBe(false)
  })
})

describe('field formatting', () => {
  it('formats primitive and structured values', () => {
    expect(formatFieldValue('text')).toBe('text')
    expect(formatFieldValue(42)).toBe('42')
    expect(formatFieldValue(true)).toBe('true')
    expect(formatFieldValue(10n)).toBe('10')
    expect(formatFieldValue(null)).toBe('')
    expect(formatFieldValue({ a: 1 })).toBe('{"a":1}')
  })

  it('formats date attributes from unix timestamps', () => {
    const formatted = formatAttributeValue({
      display_type: 'date',
      value: 1_700_000_000,
    })
    expect(formatted).toBe(new Date(1_700_000_000_000).toLocaleDateString())
  })
})
