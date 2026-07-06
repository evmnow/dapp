import { describe, expect, it } from 'vitest'
import {
  deduplicateEntries,
  parseChangelog,
  stripMarkdownLinks,
  type ChangelogEntry,
} from './generate-changelog'

const GITHUB_SHAPED = `# my-package

## 1.2.3

### Minor Changes

- [#12](https://github.com/evmnow/dapp/pull/12) [\`abcdef1234\`](https://github.com/evmnow/dapp/commit/abcdef1234) Thanks [@jalil](https://github.com/jalil)! - Add a shiny thing

  With a continuation line.

### Patch Changes

- [#13](https://github.com/evmnow/dapp/pull/13) [\`fedcba4321\`](https://github.com/evmnow/dapp/commit/fedcba4321) Thanks [@jalil](https://github.com/jalil)! - Fix a bug
- Updated dependencies [[\`abcdef1234\`](https://github.com/evmnow/dapp/commit/abcdef1234)]:
  - @evmnow/contract-reader@0.7.0
`

describe('parseChangelog', () => {
  it('parses changelog-github shaped bullets', () => {
    const entries = parseChangelog(GITHUB_SHAPED, 'my-package')

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      package: 'my-package',
      version: '1.2.3',
      type: 'minor',
      description: 'Add a shiny thing\n  With a continuation line.',
      commit: 'abcdef1234',
      pr: { number: 12, url: 'https://github.com/evmnow/dapp/pull/12' },
    })
    expect(entries[1]).toMatchObject({
      type: 'patch',
      description: 'Fix a bug',
      commit: 'fedcba4321',
    })
  })

  it('skips internal dependency bumps and their continuation lines', () => {
    const entries = parseChangelog(GITHUB_SHAPED, 'my-package')
    const descriptions = entries.map((entry) => entry.description)

    expect(descriptions.join('\n')).not.toContain('Updated dependencies')
    expect(descriptions.join('\n')).not.toContain('@evmnow/contract-reader')
  })

  it('falls back to the raw bullet with links stripped', () => {
    const entries = parseChangelog(
      `## 0.1.0\n\n### Patch Changes\n\n- Just a plain bullet with a [link](https://example.com)\n`,
      'pkg',
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      version: '0.1.0',
      type: 'patch',
      description: 'Just a plain bullet with a link',
      commit: null,
      pr: null,
    })
  })

  it('ignores bullets outside a version/type section', () => {
    expect(parseChangelog('- stray bullet\n', 'pkg')).toEqual([])
    expect(
      parseChangelog('## 1.0.0\n\n- bullet without a type header\n', 'pkg'),
    ).toEqual([])
  })
})

describe('stripMarkdownLinks', () => {
  it('replaces links with their text', () => {
    expect(stripMarkdownLinks('see [docs](https://example.com) now')).toBe(
      'see docs now',
    )
    expect(stripMarkdownLinks('no links here')).toBe('no links here')
  })
})

describe('deduplicateEntries', () => {
  function entry(overrides: Partial<ChangelogEntry>): ChangelogEntry {
    return {
      package: 'pkg-a',
      version: '1.0.0',
      type: 'patch',
      description: 'Change',
      commit: null,
      pr: null,
      ...overrides,
    }
  }

  it('merges entries sharing a commit and keeps the highest bump type', () => {
    const unified = deduplicateEntries([
      entry({ commit: '0000000000', type: 'patch' }),
      entry({
        commit: '0000000000',
        type: 'minor',
        package: 'pkg-b',
        version: '2.0.0',
      }),
    ])

    expect(unified).toHaveLength(1)
    expect(unified[0]!.type).toBe('minor')
    expect(unified[0]!.packages).toEqual([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ])
  })

  it('keeps commit-less entries as separate orphans', () => {
    const unified = deduplicateEntries([
      entry({ description: 'One' }),
      entry({ description: 'Two' }),
    ])

    expect(unified).toHaveLength(2)
  })
})
