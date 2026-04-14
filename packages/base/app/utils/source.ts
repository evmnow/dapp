import type { SourceFile, ContractSourceUnit } from '../types/contract'

export interface FunctionLocation {
  fileIndex: number
  startLine: number
  endLine: number
}

export interface SourceSelection {
  file?: number
  line?: number
  end?: number
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function stripSourcePrefix(path: string): string {
  return path.replace(/^\[[^\]]*\]\s*/, '')
}

const IMPORT_RE =
  /^\s*import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/gm

function extractImportPaths(content: string): string[] {
  const cleaned = stripComments(content)
  return [...cleaned.matchAll(IMPORT_RE)].map((match) => match[1]!)
}

function dirname(path: string): string {
  const clean = stripSourcePrefix(path)
  const index = clean.lastIndexOf('/')
  return index === -1 ? '' : clean.slice(0, index)
}

function resolveImportPath(importPath: string, importerPath: string): string {
  if (!importPath.startsWith('.')) return importPath

  const parts = `${dirname(importerPath)}/${importPath}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

function basename(path: string): string {
  const clean = stripSourcePrefix(path)
  const index = clean.lastIndexOf('/')
  return index === -1 ? clean : clean.slice(index + 1)
}

function buildPathIndex(files: SourceFile[]): Map<string, number> {
  const index = new Map<string, number>()
  for (let i = 0; i < files.length; i++) {
    const path = files[i]!.path
    index.set(path, i)
    const name = basename(path)
    if (!index.has(name)) index.set(name, i)
  }
  return index
}

function matchFileByImport(
  resolvedPath: string,
  pathIndex: Map<string, number>,
): number | null {
  return (
    pathIndex.get(resolvedPath) ?? pathIndex.get(basename(resolvedPath)) ?? null
  )
}

export function sortSourceFiles(
  files: SourceFile[],
  entryFileName?: string | null,
): SourceFile[] {
  if (files.length <= 1) return files

  const pathIndex = buildPathIndex(files)

  let primaryIndex = 0
  if (entryFileName) {
    const found = pathIndex.get(entryFileName)
    if (found !== undefined) primaryIndex = found
  }

  const adjacency = files.map((file) => {
    const neighbors: number[] = []
    for (const importPath of extractImportPaths(file.content)) {
      const resolved = resolveImportPath(importPath, file.path)
      const target = matchFileByImport(resolved, pathIndex)
      if (target !== null) neighbors.push(target)
    }
    return neighbors
  })

  const visited = new Set<number>()
  const order: number[] = []

  function visit(index: number) {
    if (visited.has(index)) return
    visited.add(index)
    order.push(index)
    for (const neighbor of adjacency[index]!) visit(neighbor)
  }

  visit(primaryIndex)

  for (let i = 0; i < files.length; i++) {
    if (!visited.has(i)) order.push(i)
  }

  return order.map((index) => files[index]!)
}

function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    return target
  }
}

function buildPatterns(target: string): RegExp[] {
  const decoded = decodeTarget(target)
  const patterns: RegExp[] = []

  if (decoded.includes('-')) {
    const [name, ...types] = decoded.split('-')
    if (name && types.length) {
      patterns.push(
        new RegExp(
          `\\bfunction\\s+${escapeRegex(name)}\\s*\\(\\s*${types
            .map(
              (type) =>
                `${escapeRegex(type)}(?:\\s+(?:memory|calldata|storage))?(?:\\s+[A-Za-z_$][\\w$]*)?`,
            )
            .join('\\s*,\\s*')}\\s*\\)`,
        ),
      )
    }
  }

  patterns.push(new RegExp(`\\bfunction\\s+${escapeRegex(decoded)}\\s*\\(`))
  return patterns
}

export function findFunctionInSource(
  files: SourceFile[],
  functionTarget: string,
): FunctionLocation | null {
  const patterns = buildPatterns(functionTarget)
  const variablePattern = new RegExp(
    `\\b${escapeRegex(decodeTarget(functionTarget))}\\b.*\\bpublic\\b|\\bpublic\\b.*\\b${escapeRegex(decodeTarget(functionTarget))}\\b`,
  )

  for (let fileIndex = files.length - 1; fileIndex >= 0; fileIndex--) {
    const lines = files[fileIndex]!.content.split('\n')
    for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex--) {
      if (!patterns.some((pattern) => pattern.test(lines[lineIndex]!))) continue
      return extractBody(fileIndex, lines, lineIndex)
    }
  }

  for (let fileIndex = files.length - 1; fileIndex >= 0; fileIndex--) {
    const lines = files[fileIndex]!.content.split('\n')
    for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex--) {
      if (variablePattern.test(lines[lineIndex]!)) {
        return { fileIndex, startLine: lineIndex, endLine: lineIndex }
      }
    }
  }

  return null
}

export function findFunctionSourceSelection(
  files: SourceFile[],
  functionTarget: string | undefined,
): SourceSelection | null {
  if (!functionTarget) return null

  const location = findFunctionInSource(files, functionTarget)
  if (!location) return null

  return {
    file: location.fileIndex,
    line: location.startLine + 1,
    end: location.endLine + 1,
  }
}

export function isSameSourceSelection(
  current: SourceSelection | undefined,
  next: SourceSelection | undefined | null,
) {
  return (
    current?.file === next?.file &&
    current?.line === next?.line &&
    current?.end === next?.end
  )
}

function extractBody(
  fileIndex: number,
  lines: string[],
  startLine: number,
): FunctionLocation {
  let braces = 0
  let foundOpen = false

  for (let i = startLine; i < lines.length; i++) {
    for (const char of lines[i]!) {
      if (char === '{') {
        braces++
        foundOpen = true
      } else if (char === '}') {
        braces--
      }
    }
    if (foundOpen && braces === 0) return { fileIndex, startLine, endLine: i }
  }

  return { fileIndex, startLine, endLine: startLine }
}

export function parseSourceCode(
  raw: string,
  contractName?: string,
): SourceFile[] {
  if (!raw) return []
  const trimmed = raw.trim()

  if (trimmed.startsWith('{{')) {
    try {
      const json = JSON.parse(trimmed.slice(1, -1))
      if (json.sources) {
        return Object.entries(json.sources).map(
          ([path, value]: [string, any]) => ({
            path,
            content: value.content,
          }),
        )
      }
    } catch {}
  }

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed)
      const entries = Object.entries(json)
      if (typeof (entries[0]?.[1] as any)?.content === 'string') {
        return entries.map(([path, value]: [string, any]) => ({
          path,
          content: value.content,
        }))
      }
    } catch {}
  }

  return [
    {
      path: contractName ? `${contractName}.sol` : 'Contract.sol',
      content: trimmed,
    },
  ]
}

export function parseSourcesIntoFiles(
  sources?: ContractSourceUnit[] | null,
): SourceFile[] {
  if (!sources) return []
  const hasMultipleSources =
    sources.filter((source) => source.sourceCode).length > 1
  const files: SourceFile[] = []

  for (const source of sources) {
    if (!source.sourceCode) continue
    const parsed = sortSourceFiles(
      parseSourceCode(source.sourceCode, source.name),
      source.entryFileName,
    )
    for (const file of parsed) {
      files.push({
        path: hasMultipleSources
          ? `[${source.name || source.address.slice(0, 10)}] ${file.path}`
          : file.path,
        content: file.content,
      })
    }
  }

  return files
}
