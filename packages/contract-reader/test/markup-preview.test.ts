import { describe, expect, it } from 'vitest'
import {
  buildPreviewSrcdoc,
  detectPreviewMarkupKind,
  toSvgDataUri,
} from '../app/utils/markup-preview'

describe('detectPreviewMarkupKind', () => {
  it('detects svg markup and svg data URIs', () => {
    expect(detectPreviewMarkupKind('<svg xmlns="x"></svg>')).toBe('svg')
    expect(detectPreviewMarkupKind('  <?xml version="1.0"?>\n<svg>')).toBe(
      'svg',
    )
    expect(detectPreviewMarkupKind('data:image/svg+xml;base64,PHN2Zz4=')).toBe(
      'svg',
    )
  })

  it('detects html documents', () => {
    expect(detectPreviewMarkupKind('<!doctype html><html></html>')).toBe('html')
    expect(detectPreviewMarkupKind('<body><p>hi</p></body>')).toBe('html')
  })

  it('returns null for plain values', () => {
    expect(detectPreviewMarkupKind('hello world')).toBeNull()
    expect(detectPreviewMarkupKind('<div>generic</div>')).toBeNull()
    expect(detectPreviewMarkupKind('')).toBeNull()
    expect(detectPreviewMarkupKind(null)).toBeNull()
    expect(detectPreviewMarkupKind(undefined)).toBeNull()
  })
})

describe('toSvgDataUri', () => {
  it('passes base64 svg data URIs through unchanged', () => {
    const uri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    expect(toSvgDataUri(uri)).toBe(uri)
  })

  it('re-encodes url-encoded svg payloads', () => {
    const uri = toSvgDataUri('data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E')
    expect(uri).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg></svg>')}`,
    )
  })

  it('encodes raw svg markup', () => {
    expect(toSvgDataUri('<svg></svg>')).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg></svg>')}`,
    )
  })
})

describe('buildPreviewSrcdoc', () => {
  it('injects a restrictive CSP into full html documents', () => {
    const doc = buildPreviewSrcdoc(
      '<!doctype html><html><head><title>t</title></head><body>x</body></html>',
      'html',
    )

    expect(doc).toContain('<head><meta charset="utf-8"><meta http-equiv=')
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("base-uri 'none'")
    expect(doc.match(/Content-Security-Policy/g)).toHaveLength(1)
  })

  it('adds a head to full documents that lack one', () => {
    const doc = buildPreviewSrcdoc('<html><body>x</body></html>', 'html')
    expect(doc).toContain('<html><head><meta charset="utf-8">')
    expect(doc).toContain('Content-Security-Policy')
  })

  it('wraps html fragments in a document shell', () => {
    const doc = buildPreviewSrcdoc('<p>fragment</p>', 'html')
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain('<body><p>fragment</p></body>')
    expect(doc).toContain('Content-Security-Policy')
  })

  it('centers svg previews in the wrapper body', () => {
    const doc = buildPreviewSrcdoc('<svg></svg>', 'svg')
    expect(doc).toContain('place-items:center')
    expect(doc).toContain('<svg></svg>')
  })
})
