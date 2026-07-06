#!/usr/bin/env node

// Generate a unified CHANGELOG.md from all package changelogs.
//
// Parses every packages/*/CHANGELOG.md, skips internal dependency bump noise,
// deduplicates entries that share a commit hash across packages, and groups
// by commit date (from git).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChangelogEntry {
  package: string
  version: string
  type: ChangeType
  description: string
  commit: string | null
  pr: { number: number; url: string } | null
}

export interface UnifiedEntry {
  packages: Array<{ name: string; version: string }>
  type: ChangeType
  description: string
  commit: string | null
  pr: { number: number; url: string } | null
  date: string | null
}

export type ChangeType = 'major' | 'minor' | 'patch'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const OUTPUT = join(ROOT, 'CHANGELOG.md')

const TYPE_RANK: Record<ChangeType, number> = { major: 3, minor: 2, patch: 1 }

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseChangelog(
  content: string,
  packageName: string,
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let version: string | null = null
  let type: ChangeType | null = null
  let current: ChangelogEntry | null = null
  let skipping = false

  const flush = () => {
    if (current) entries.push(current)
    current = null
    skipping = false
  }

  for (const line of content.split('\n')) {
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+)/)
    if (versionMatch) {
      flush()
      version = versionMatch[1]
      type = null
      continue
    }

    const typeMatch = line.match(/^### (Major|Minor|Patch) Changes/)
    if (typeMatch) {
      flush()
      type = typeMatch[1].toLowerCase() as ChangeType
      continue
    }

    if (line.startsWith('- ') && version && type) {
      flush()

      if (line.includes('Updated dependencies')) {
        skipping = true
        continue
      }

      const commit = line.match(/\[`([a-f0-9]{7,})`\]/)?.[1] ?? null
      const prMatch = line.match(/\[#(\d+)\]\(([^)]+)\)/)
      // Bullets usually follow the changelog-github shape
      // (`- [#PR](url) [`hash`](url) Thanks ...! - Description`); anything
      // else falls back to the raw bullet text with links stripped so the
      // entry is never silently dropped.
      const description =
        line.match(/! - (.+)$/)?.[1]?.trim() ||
        stripMarkdownLinks(line.slice(2)).trim() ||
        null

      if (description) {
        current = {
          package: packageName,
          version,
          type,
          description,
          commit,
          pr: prMatch
            ? { number: parseInt(prMatch[1]), url: prMatch[2] }
            : null,
        }
      }
      continue
    }

    if (skipping) continue

    if (current && line.startsWith('  ') && line.trim()) {
      current.description += '\n  ' + line.trim()
    }
  }

  flush()
  return entries
}

/** Replace markdown links (`[text](url)`) with their text. */
export function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

function getCommitDate(hash: string): string | null {
  try {
    return execSync(`git log -1 --format=%ci ${hash} 2>/dev/null`, {
      encoding: 'utf-8',
      cwd: ROOT,
    })
      .trim()
      .split(' ')[0]
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

export function deduplicateEntries(entries: ChangelogEntry[]): UnifiedEntry[] {
  const byCommit = new Map<string, UnifiedEntry>()
  const orphans: UnifiedEntry[] = []

  for (const entry of entries) {
    const pkg = { name: entry.package, version: entry.version }

    if (!entry.commit) {
      orphans.push({ ...entry, packages: [pkg], date: null })
      continue
    }

    const existing = byCommit.get(entry.commit)
    if (existing) {
      if (!existing.packages.some((p) => p.name === entry.package)) {
        existing.packages.push(pkg)
      }
      if (TYPE_RANK[entry.type] > TYPE_RANK[existing.type]) {
        existing.type = entry.type
      }
    } else {
      byCommit.set(entry.commit, {
        ...entry,
        packages: [pkg],
        date: getCommitDate(entry.commit),
      })
    }
  }

  return [...byCommit.values(), ...orphans]
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export function renderChangelog(entries: UnifiedEntry[]): string {
  entries.sort((a, b) => (b.date || '0').localeCompare(a.date || '0'))

  const groups = new Map<string, UnifiedEntry[]>()
  for (const entry of entries) {
    const date = entry.date || 'Unknown'
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(entry)
  }

  let md = '# Changelog\n\n'
  md += 'All notable changes across all packages in this monorepo.\n'
  md +=
    'Generated from individual package changelogs — do not edit manually.\n\n'

  for (const [date, dateEntries] of groups) {
    md += `## ${date}\n\n`

    for (const entry of dateEntries) {
      const pkgs = entry.packages.map((p) => `\`${p.name}\``).join(', ')
      const tag =
        entry.type === 'major'
          ? '**Breaking** '
          : entry.type === 'minor'
            ? '**Minor** '
            : ''
      const prLink = entry.pr ? ` ([#${entry.pr.number}](${entry.pr.url}))` : ''
      const commitLink = entry.commit
        ? ` [\`${entry.commit.slice(0, 7)}\`](https://github.com/evmnow/dapp/commit/${entry.commit})`
        : ''

      const [firstLine, ...extraLines] = entry.description.split('\n')
      md += `- ${tag}${firstLine}${prLink}${commitLink}\n`
      for (const extra of extraLines) {
        md += `${extra}\n`
      }
      md += `  _${pkgs}_\n\n`
    }
  }

  return md
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const allEntries: ChangelogEntry[] = []

  for (const dir of readdirSync(PACKAGES_DIR)) {
    const clPath = join(PACKAGES_DIR, dir, 'CHANGELOG.md')
    try {
      allEntries.push(...parseChangelog(readFileSync(clPath, 'utf-8'), dir))
    } catch {
      continue
    }
  }

  const unified = deduplicateEntries(allEntries)
  writeFileSync(OUTPUT, renderChangelog(unified))
  console.log(
    `Generated unified changelog (${unified.length} entries from ${new Set(allEntries.map((e) => e.package)).size} packages)`,
  )
}

// Only run the CLI when executed directly (`node scripts/generate-changelog.ts`),
// not when the parsing helpers are imported by tests.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
