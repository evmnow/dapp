const SVG_OPEN_RE = /^\s*(?:<\?xml[\s\S]*?\?>\s*)?<svg\b/i
const HTML_OPEN_RE =
  /^\s*(?:<!doctype\s+html\b[^>]*>\s*)?(?:<html\b|<head\b|<body\b)/i
const SVG_DATA_URI_RE = /^data:image\/svg\+xml[;,]/i

export type PreviewMarkupKind = 'svg' | 'html'

export function detectPreviewMarkupKind(
  value: string | null | undefined,
): PreviewMarkupKind | null {
  if (!value) return null
  if (SVG_OPEN_RE.test(value) || SVG_DATA_URI_RE.test(value)) return 'svg'
  if (HTML_OPEN_RE.test(value)) return 'html'
  return null
}

export function toSvgDataUri(value: string): string {
  if (SVG_DATA_URI_RE.test(value)) {
    if (/^data:image\/svg\+xml;base64,/i.test(value)) return value

    const match = value.match(/^data:image\/svg\+xml[^,]*,(.+)$/is)
    if (match) {
      let raw = match[1]!
      try {
        raw = decodeURIComponent(raw)
      } catch {
        // Keep the original payload when it is already encoded or malformed.
      }

      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`
    }
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`
}

const FULL_HTML_RE = /^\s*(?:<!doctype\s+html\b[^>]*>\s*)?<html\b/i
const HEAD_TAG_RE = /(<head\b[^>]*>)/i

export function buildPreviewSrcdoc(raw: string, kind: PreviewMarkupKind): string {
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp()}">`

  if (kind === 'html' && FULL_HTML_RE.test(raw)) {
    if (HEAD_TAG_RE.test(raw)) {
      return raw.replace(HEAD_TAG_RE, `$1<meta charset="utf-8">${cspMeta}`)
    }

    return raw.replace(
      /(<html\b[^>]*>)/i,
      `$1<head><meta charset="utf-8">${cspMeta}</head>`,
    )
  }

  if (kind === 'html') {
    return `<!doctype html><html><head><meta charset="utf-8">${cspMeta}</head><body>${raw}</body></html>`
  }

  return `<!doctype html><html><head><meta charset="utf-8">${cspMeta}</head><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:transparent;">${raw}</body></html>`
}

function buildCsp(): string {
  return [
    "default-src 'none'",
    "img-src data: blob: http: https:",
    "media-src data: blob: http: https:",
    "font-src data: http: https:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}
