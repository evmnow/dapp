export function renderInlineMarkdown(text: string): string {
  if (!text) return ''

  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )
  html = html.replace(/\*{3}([^*]+)\*{3}/g, '<strong><em>$1</em></strong>')
  html = html.replace(/_{3}([^_]+)_{3}/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*{2}([^*]+)\*{2}/g, '<strong>$1</strong>')
  html = html.replace(/_{2}([^_]+)_{2}/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(
    /(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g,
    '<em>$1</em>',
  )
  return html
}

export function renderMarkdown(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n')
  const blocks: string[] = []

  for (let index = 0; index < lines.length; ) {
    const line = lines[index]!

    if (!line.trim()) {
      index++
      continue
    }

    if (line.trim().startsWith('```')) {
      const code: string[] = []
      index++
      while (index < lines.length && !lines[index]!.trim().startsWith('```')) {
        code.push(lines[index]!)
        index++
      }
      if (index < lines.length) index++
      blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1]!.length
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2]!)}</h${level}>`)
      index++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index]!)) {
        items.push(
          `<li>${renderInlineMarkdown(lines[index]!.replace(/^\s*[-*]\s+/, ''))}</li>`,
        )
        index++
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index]!)) {
        items.push(
          `<li>${renderInlineMarkdown(lines[index]!.replace(/^\s*\d+\.\s+/, ''))}</li>`,
        )
        index++
      }
      blocks.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quotes: string[] = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index]!)) {
        quotes.push(renderInlineMarkdown(lines[index]!.replace(/^\s*>\s?/, '')))
        index++
      }
      blocks.push(`<blockquote>${quotes.join('<br>')}</blockquote>`)
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index]!.trim() &&
      !/^(#{1,6})\s+/.test(lines[index]!) &&
      !/^\s*[-*]\s+/.test(lines[index]!) &&
      !/^\s*\d+\.\s+/.test(lines[index]!) &&
      !/^\s*>\s?/.test(lines[index]!) &&
      !lines[index]!.trim().startsWith('```')
    ) {
      paragraph.push(renderInlineMarkdown(lines[index]!.trim()))
      index++
    }
    blocks.push(`<p>${paragraph.join('<br>')}</p>`)
  }

  return blocks.join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
