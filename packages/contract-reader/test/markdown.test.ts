import { describe, expect, it } from 'vitest'
import { renderInlineMarkdown, renderMarkdown } from '../app/utils/markdown'

describe('renderInlineMarkdown', () => {
  it('escapes HTML before applying formatting', () => {
    expect(renderInlineMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(renderInlineMarkdown('a "quote" & more')).toBe(
      'a &quot;quote&quot; &amp; more',
    )
  })

  it('renders inline code, bold and emphasis', () => {
    expect(renderInlineMarkdown('use `code` here')).toBe(
      'use <code>code</code> here',
    )
    expect(renderInlineMarkdown('**bold** and *em*')).toBe(
      '<strong>bold</strong> and <em>em</em>',
    )
    expect(renderInlineMarkdown('___both___')).toBe(
      '<strong><em>both</em></strong>',
    )
  })

  it('only links http(s) URLs', () => {
    expect(renderInlineMarkdown('[site](https://example.com)')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">site</a>',
    )
    // Non-http(s) schemes stay literal text — no anchor is produced.
    expect(renderInlineMarkdown('[evil](javascript:alert(1))')).not.toContain(
      '<a ',
    )
    expect(renderInlineMarkdown('[evil](data:text/html,x)')).not.toContain(
      '<a ',
    )
  })

  it('returns an empty string for empty input', () => {
    expect(renderInlineMarkdown('')).toBe('')
  })
})

describe('renderMarkdown', () => {
  it('renders headings, lists and paragraphs', () => {
    const html = renderMarkdown(
      [
        '# Title',
        '',
        'One line',
        'two line',
        '',
        '- a',
        '- b',
        '',
        '1. x',
      ].join('\n'),
    )

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<p>One line<br>two line</p>')
    expect(html).toContain('<ul><li>a</li><li>b</li></ul>')
    expect(html).toContain('<ol><li>x</li></ol>')
  })

  it('escapes fenced code blocks', () => {
    const html = renderMarkdown('```\n<b>raw</b>\n```')
    expect(html).toBe('<pre><code>&lt;b&gt;raw&lt;/b&gt;</code></pre>')
  })

  it('renders blockquotes with inline formatting', () => {
    const html = renderMarkdown('> quoted **bold**\n> second')
    expect(html).toBe(
      '<blockquote>quoted <strong>bold</strong><br>second</blockquote>',
    )
  })

  it('never emits raw HTML from the source text', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
  })
})
