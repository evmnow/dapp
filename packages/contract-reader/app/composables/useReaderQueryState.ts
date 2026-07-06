import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { ContractView, ReaderQueryState } from '../types/view'

const READER_QUERY_KEYS = [
  'address',
  'view',
  'fn',
  'args[]',
  'file',
  'line',
  'end',
] as const

const DEFAULT_VIEWS: readonly ContractView[] = [
  'overview',
  'read',
  'interact',
  'code',
]

function firstQueryValue(value: LocationQuery[string] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function queryValues(value: LocationQuery[string] | undefined) {
  const values = Array.isArray(value) ? value : [value]
  return values
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseArgs(query: LocationQuery) {
  return queryValues(query['args[]'])
}

function parsePositiveInteger(value: LocationQuery[string] | undefined) {
  const raw = firstQueryValue(value)
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

/**
 * Reader state serialized into route query params
 * (`?address=…&view=…&fn=…&args[]=…&file=…&line=…&end=…`). Suited to apps
 * that render the reader on a single route; apps with path- or hash-based
 * routing should keep their own state mapping instead.
 */
export function useReaderQueryState<View extends string = ContractView>(
  options: {
    path?: string
    /** Accepted views; the first entry is the default. */
    views?: readonly View[]
  } = {},
) {
  const route = useRoute()
  const router = useRouter()

  const views = (options.views ?? DEFAULT_VIEWS) as readonly View[]
  const defaultView = views[0] as View

  function normalizeView(value: unknown): View {
    return views.includes(value as View) ? (value as View) : defaultView
  }

  function normalizeState(state: ReaderQueryState<View>) {
    const address = state.address?.trim() || undefined
    const view = normalizeView(state.view)
    const fn = state.fn?.trim() || undefined
    const args = state.args.map((entry) => String(entry))
    const source = state.source
      ? {
          file: state.source.file,
          line: state.source.line,
          end: state.source.end,
        }
      : undefined

    if (view === defaultView) {
      return {
        address,
        view,
        args: [],
      } satisfies ReaderQueryState<View>
    }

    if (view === 'code') {
      return {
        address,
        view,
        fn,
        args: [],
        source,
      } satisfies ReaderQueryState<View>
    }

    return {
      address,
      view,
      fn,
      args: fn ? args : [],
    } satisfies ReaderQueryState<View>
  }

  function parseQuery(query: LocationQuery): ReaderQueryState<View> {
    const address = firstQueryValue(query.address)?.trim() || undefined
    const source = {
      file: parsePositiveInteger(query.file),
      line: parsePositiveInteger(query.line),
      end: parsePositiveInteger(query.end),
    }
    const hasSource = Object.values(source).some(
      (value) => typeof value === 'number',
    )

    return normalizeState({
      address,
      view: normalizeView(firstQueryValue(query.view)),
      fn: firstQueryValue(query.fn)?.trim() || undefined,
      args: parseArgs(query),
      source: hasSource ? source : undefined,
    })
  }

  function serializeQuery(state: ReaderQueryState<View>): LocationQuery {
    const query: LocationQuery = {}

    if (state.address?.trim()) {
      query.address = state.address.trim()
    }

    if (state.view !== defaultView) {
      query.view = state.view
    }

    if (state.fn?.trim()) {
      query.fn = state.fn.trim()
    }

    if (state.args.length > 0) {
      query['args[]'] = state.args
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

  const state = computed(() => parseQuery(route.query))

  function routeForState(nextState: ReaderQueryState<View>): RouteLocationRaw {
    const normalizedState = normalizeState(nextState)
    const nextQuery: LocationQuery = Object.fromEntries(
      Object.entries(route.query).filter(
        ([key]) => !(READER_QUERY_KEYS as readonly string[]).includes(key),
      ),
    )
    Object.assign(nextQuery, serializeQuery(normalizedState))
    return { path: options.path ?? route.path, query: nextQuery }
  }

  function navigate(
    partial: Partial<ReaderQueryState<View>>,
    options: { replace?: boolean } = {},
  ) {
    const nextState = {
      ...state.value,
      ...partial,
    }
    const nextRoute = routeForState(nextState)
    void navigateTo(nextRoute, options)
  }

  function routeFor(
    partial: Partial<ReaderQueryState<View>>,
  ): RouteLocationRaw {
    return routeForState({
      address: state.value.address,
      view: defaultView,
      args: [],
      ...partial,
    })
  }

  function hrefFor(partial: Partial<ReaderQueryState<View>>) {
    return router.resolve(routeFor(partial)).href
  }

  return {
    state,
    navigate,
    routeFor,
    hrefFor,
  }
}
