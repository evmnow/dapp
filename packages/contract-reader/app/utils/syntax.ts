import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import solidity from 'shiki/langs/solidity.mjs'
import oneLight from 'shiki/themes/one-light.mjs'

const highlighter = createHighlighterCoreSync({
  themes: [oneLight],
  langs: [solidity],
  engine: createJavaScriptRegexEngine(),
})

const DEFAULT_THEME = 'one-light'
let activeTheme = DEFAULT_THEME

type SyntaxTheme = Parameters<(typeof highlighter)['loadTheme']>[number]

/** Register an additional shiki theme for `highlightSolidity`. */
export async function loadSyntaxTheme(theme: SyntaxTheme): Promise<void> {
  await highlighter.loadTheme(theme)
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
