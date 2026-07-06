import type { HighlighterCore } from 'shiki/core'

// Shiki (+ the solidity grammar and theme) is a heavy dependency that only
// matters on the source view — it is loaded lazily behind dynamic imports so
// it never lands in the initial chunk. `highlightSolidity` stays synchronous
// and falls back to escaped plain text until `loadHighlighter` resolves.
let highlighter: HighlighterCore | null = null
let highlighterPromise: Promise<HighlighterCore> | null = null

/** Load shiki and the solidity grammar; idempotent and safe to re-await. */
export function loadHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/langs/solidity.mjs'),
      import('shiki/themes/one-light.mjs'),
    ]).then(([core, engine, solidity, oneLight]) => {
      highlighter = core.createHighlighterCoreSync({
        themes: [oneLight.default],
        langs: [solidity.default],
        engine: engine.createJavaScriptRegexEngine(),
      })
      return highlighter
    })
  }
  return highlighterPromise
}

const DEFAULT_THEME = 'one-light'
let activeTheme = DEFAULT_THEME

type SyntaxTheme = Parameters<HighlighterCore['loadTheme']>[number]

/** Register an additional shiki theme for `highlightSolidity`. */
export async function loadSyntaxTheme(theme: SyntaxTheme): Promise<void> {
  await (await loadHighlighter()).loadTheme(theme)
}

/** Set the theme used by `highlightSolidity` when none is passed explicitly.
 * The theme must have been registered via `loadSyntaxTheme` first (the
 * bundled default is `one-light`). */
export function setSyntaxTheme(name: string): void {
  activeTheme = name || DEFAULT_THEME
}

export function getSyntaxTheme(): string {
  return activeTheme
}

export function escapeCodeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderToken(content: string, style: unknown): string {
  const text = escapeCodeHtml(content)
  if (!style) return text

  if (typeof style === 'string') {
    return style ? `<span style="${style}">${text}</span>` : text
  }

  if (typeof style !== 'object') return text

  const color = (style as Record<string, string>).color
  return color ? `<span style="color:${color}">${text}</span>` : text
}

export function highlightSolidity(source: string, theme?: string): string[] {
  const sourceLines = source.split('\n')

  // Escaped plain text until the lazy highlighter is ready (see
  // `loadHighlighter`); callers re-run once it resolves.
  if (!highlighter) return sourceLines.map(escapeCodeHtml)

  try {
    const { tokens } = highlighter.codeToTokens(source, {
      lang: 'solidity',
      theme: theme || activeTheme,
    })

    return sourceLines.map((line, index) => {
      const tokenLine = tokens[index]
      if (!tokenLine?.length) return escapeCodeHtml(line)

      return tokenLine
        .map((token) => renderToken(token.content, token.htmlStyle || token))
        .join('')
    })
  } catch {
    return sourceLines.map(escapeCodeHtml)
  }
}
