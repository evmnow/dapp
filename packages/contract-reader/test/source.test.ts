import { describe, expect, it } from 'vitest'
import type { SourceFile } from '../app/types/contract'
import {
  findFunctionSourceSelection,
  isSameSourceSelection,
  parseSourceCode,
  sortSourceFiles,
} from '../app/utils/source'

function file(path: string, content: string): SourceFile {
  return { path, content }
}

describe('sortSourceFiles', () => {
  it('returns short lists untouched', () => {
    const files = [file('A.sol', 'contract A {}')]
    expect(sortSourceFiles(files)).toBe(files)
  })

  it('orders files along the import graph from the entry file', () => {
    const files = [
      file('lib/C.sol', 'contract C {}'),
      file('B.sol', "import './lib/C.sol';\ncontract B {}"),
      file('A.sol', "import './B.sol';\ncontract A {}"),
    ]

    const sorted = sortSourceFiles(files, 'A.sol')
    expect(sorted.map((entry) => entry.path)).toEqual([
      'A.sol',
      'B.sol',
      'lib/C.sol',
    ])
  })

  it('resolves relative parent imports', () => {
    const files = [
      file('lib/util/Math.sol', 'contract Math {}'),
      file('src/Main.sol', "import '../lib/util/Math.sol';\ncontract Main {}"),
    ]

    const sorted = sortSourceFiles(files, 'src/Main.sol')
    expect(sorted.map((entry) => entry.path)).toEqual([
      'src/Main.sol',
      'lib/util/Math.sol',
    ])
  })

  it('matches imports by basename when full paths differ', () => {
    const files = [
      file('deps/openzeppelin/ERC20.sol', 'contract ERC20 {}'),
      file(
        'Token.sol',
        "import '@openzeppelin/contracts/token/ERC20.sol';\ncontract Token {}",
      ),
    ]

    const sorted = sortSourceFiles(files, 'Token.sol')
    expect(sorted.map((entry) => entry.path)).toEqual([
      'Token.sol',
      'deps/openzeppelin/ERC20.sol',
    ])
  })

  it('appends files unreachable from the entry', () => {
    const files = [
      file('Orphan.sol', 'contract Orphan {}'),
      file('A.sol', 'contract A {}'),
    ]

    const sorted = sortSourceFiles(files, 'A.sol')
    expect(sorted.map((entry) => entry.path)).toEqual(['A.sol', 'Orphan.sol'])
  })

  it('ignores imports inside comments', () => {
    const files = [
      file('B.sol', 'contract B {}'),
      file('A.sol', "// import './B.sol';\ncontract A {}"),
      file('C.sol', "import './A.sol';\ncontract C {}"),
    ]

    const sorted = sortSourceFiles(files, 'C.sol')
    expect(sorted.map((entry) => entry.path)).toEqual([
      'C.sol',
      'A.sol',
      'B.sol',
    ])
  })
})

describe('findFunctionSourceSelection', () => {
  const files = [
    file(
      'Token.sol',
      [
        'contract Token {',
        '  function balanceOf(address owner) public view returns (uint256) {',
        '    return _balances[owner];',
        '  }',
        '}',
      ].join('\n'),
    ),
  ]

  it('locates a function body by name (1-based lines)', () => {
    expect(findFunctionSourceSelection(files, 'balanceOf')).toEqual({
      file: 0,
      line: 2,
      end: 4,
    })
  })

  it('returns null for unknown targets', () => {
    expect(findFunctionSourceSelection(files, 'missing')).toBeNull()
    expect(findFunctionSourceSelection(files, undefined)).toBeNull()
  })
})

describe('isSameSourceSelection', () => {
  it('compares file/line/end triples', () => {
    expect(
      isSameSourceSelection({ file: 0, line: 1 }, { file: 0, line: 1 }),
    ).toBe(true)
    expect(
      isSameSourceSelection({ file: 0, line: 1 }, { file: 0, line: 2 }),
    ).toBe(false)
    expect(isSameSourceSelection(undefined, null)).toBe(true)
  })
})

describe('parseSourceCode', () => {
  it('parses double-brace standard-json sources', () => {
    const rawSource = `{${JSON.stringify({
      language: 'Solidity',
      sources: { 'A.sol': { content: 'contract A {}' } },
    })}}`

    expect(parseSourceCode(rawSource)).toEqual([
      { path: 'A.sol', content: 'contract A {}' },
    ])
  })

  it('parses plain source maps and falls back to a single file', () => {
    expect(parseSourceCode('{"B.sol": {"content": "contract B {}"}}')).toEqual([
      { path: 'B.sol', content: 'contract B {}' },
    ])
    expect(parseSourceCode('contract C {}', 'C')).toEqual([
      { path: 'C.sol', content: 'contract C {}' },
    ])
    expect(parseSourceCode('')).toEqual([])
  })
})
