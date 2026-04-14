import type { LocationQuery } from 'vue-router'
import type { ReaderQueryState } from '~/types/reader-query'

const DEFAULT_STATE: ReaderQueryState = {
  view: 'overview',
  args: [],
}
const READER_QUERY_KEYS = [
  'address',
  'view',
  'fn',
  'args',
  'file',
  'line',
  'end',
] as const

function firstQueryValue(value: LocationQuery[string] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parseArgs(value: LocationQuery[string] | undefined) {
  const raw = firstQueryValue(value)
  if (typeof raw !== 'string' || !raw.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry))
    }
  } catch {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

function parsePositiveInteger(value: LocationQuery[string] | undefined) {
  const raw = firstQueryValue(value)
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function parseReaderQuery(query: LocationQuery): ReaderQueryState {
  const address = firstQueryValue(query.address)?.trim() || undefined
  const view = firstQueryValue(query.view)
  const normalizedView =
    view === 'read' || view === 'interact' || view === 'code'
      ? view
      : DEFAULT_STATE.view
  const source = {
    file: parsePositiveInteger(query.file),
    line: parsePositiveInteger(query.line),
    end: parsePositiveInteger(query.end),
  }
  const hasSource = Object.values(source).some(
    (value) => typeof value === 'number',
  )

  return normalizeReaderQueryState({
    address,
    view: normalizedView,
    fn: firstQueryValue(query.fn)?.trim() || undefined,
    args: parseArgs(query.args),
    source: hasSource ? source : undefined,
  })
}

function normalizeReaderQueryState(state: ReaderQueryState): ReaderQueryState {
  const address = state.address?.trim() || undefined
  const normalizedView =
    state.view === 'read' || state.view === 'interact' || state.view === 'code'
      ? state.view
      : DEFAULT_STATE.view

  const fn = state.fn?.trim() || undefined
  const args = state.args.map((entry) => String(entry))
  const source = state.source
    ? {
        file: state.source.file,
        line: state.source.line,
        end: state.source.end,
      }
    : undefined

  if (normalizedView === 'overview') {
    return {
      address,
      view: normalizedView,
      args: [],
    }
  }

  if (normalizedView === 'code') {
    return {
      address,
      view: normalizedView,
      fn,
      args: [],
      source,
    }
  }

  return {
    address,
    view: normalizedView,
    fn,
    args: fn ? args : [],
  }
}

function serializeReaderQuery(state: ReaderQueryState): LocationQuery {
  const query: LocationQuery = {}

  if (state.address?.trim()) {
    query.address = state.address.trim()
  }

  if (state.view !== DEFAULT_STATE.view) {
    query.view = state.view
  }

  if (state.fn?.trim()) {
    query.fn = state.fn.trim()
  }

  if (state.args.length > 0) {
    query.args = JSON.stringify(state.args)
  }

  if (state.source) {
    if (typeof state.source.file === 'number') {
      query.file = String(state.source.file)
    }

    if (typeof state.source.line === 'number') {
      query.line = String(state.source.line)
    }

    if (typeof state.source.end === 'number') {
      query.end = String(state.source.end)
    }
  }

  return query
}

export function useReaderQueryState(options: { path?: string } = {}) {
  const route = useRoute()
  const router = useRouter()

  const state = computed<ReaderQueryState>({
    get() {
      return parseReaderQuery(route.query)
    },
    set(nextState) {
      const normalizedState = normalizeReaderQueryState(nextState)
      const nextQuery: LocationQuery = { ...route.query }
      for (const key of READER_QUERY_KEYS) delete nextQuery[key]
      Object.assign(nextQuery, serializeReaderQuery(normalizedState))

      router.replace({
        path: options.path ?? route.path,
        query: nextQuery,
      })
    },
  })

  return {
    state,
  }
}
