import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type {
  ContractAction,
  ContractData,
  SourceFile,
} from '../types/contract'
import type { ContractMetadataResult } from '../types/metadata-result'
import type {
  ContractView,
  ContractViewState,
  SourceSelection,
} from '../types/view'
import { actionRequiresConnectedWallet } from '../utils/abi'
import { toContractData } from '../utils/contract'
import { normalizeReadError } from '../utils/errors'
import { findFunctionSourceSelection } from '../utils/source'

/**
 * The metadata source driving the reader — structurally the return value of
 * `useContractMetadataSdk`, but any object with the same surface works.
 */
export interface ContractReaderMetadataSource {
  contract: Ref<ContractMetadataResult | null>
  get: (input: string) => Promise<ContractMetadataResult | null>
  clear: () => void
}

export interface UseContractReaderViewOptions {
  /** Metadata loader, usually the return value of `useContractMetadataSdk`. */
  metadata: ContractReaderMetadataSource
  /**
   * Extra watch sources that re-trigger the metadata fetch. Pass discrete
   * primitives (e.g. `() => wallet.metadataOptions.value.chainId` and
   * `() => wallet.metadataOptions.value.rpc`), not an object-returning
   * computed — a computed that returns a fresh object per evaluation would
   * refetch even when neither the chain nor the RPC actually changed.
   */
  refetchOn?: WatchSource<unknown>[]
  /** Gates actions that autofill from the connected address. */
  walletConnected?: MaybeRefOrGetter<boolean>
  /** Applied when the loaded metadata carries no chain id of its own. */
  fallbackChainId?: MaybeRefOrGetter<number | undefined>
  /** Route path the reader query state is serialized onto. */
  path?: string
}

const STAT_VIEW_MAP: Record<string, ContractView> = {
  read: 'read',
  write: 'interact',
  source: 'code',
}

/**
 * Generic orchestration for a contract reader page: tab derivation from the
 * ABI, view-state mapping, wallet-gated action filtering, source selection
 * and read-error bookkeeping. Hosts wire it to their own wallet/metadata
 * configuration and keep only branding and layout in the page component.
 */
export function useContractReaderView(options: UseContractReaderViewOptions) {
  const { metadata } = options
  const {
    state: viewState,
    navigate,
    routeFor,
    hrefFor,
  } = useReaderQueryState({ path: options.path })

  const readerAddress = computed(() => viewState.value.address ?? '')
  const isReaderMode = computed(() => Boolean(readerAddress.value))

  const contractData = computed<ContractData | null>(() => {
    const normalized = toContractData(
      metadata.contract.value,
      readerAddress.value,
    )
    if (!normalized || normalized.chainId) return normalized
    const fallbackChainId = toValue(options.fallbackChainId)
    return fallbackChainId
      ? { ...normalized, chainId: fallbackChainId }
      : normalized
  })

  const hasAbi = computed(() => Boolean(contractData.value?.abi.length))
  const tabs = computed<ContractView[]>(() => [
    'overview',
    ...(hasAbi.value ? (['read', 'interact'] as ContractView[]) : []),
    'code',
  ])
  const currentView = computed<ContractView>(() =>
    tabs.value.includes(viewState.value.view)
      ? viewState.value.view
      : 'overview',
  )

  const activeSourceSelection = computed(() => {
    if (viewState.value.source) return viewState.value.source
    if (currentView.value !== 'code') return undefined

    return (
      findFunctionSourceSelection(
        contractData.value?.sourceFiles ?? [],
        viewState.value.fn,
      ) ?? undefined
    )
  })

  const walletConnected = computed(() =>
    Boolean(toValue(options.walletConnected)),
  )

  function actionsForView(view: ContractView) {
    if (!contractData.value) return []
    const actions =
      view === 'interact'
        ? contractData.value.actions.write
        : contractData.value.actions.read

    // Actions locked to the connected address (e.g. "My Balance") have nothing
    // to autofill without a wallet — list them only once one is connected.
    if (walletConnected.value) return actions
    return actions.filter((action) => !actionRequiresConnectedWallet(action))
  }

  const visibleActions = computed(() => actionsForView(currentView.value))

  const allFunctionNames = computed(() => {
    if (!contractData.value) return undefined
    return new Set(
      [
        ...contractData.value.actions.read,
        ...contractData.value.actions.write,
      ].map((action) => action.name),
    )
  })

  const contractName = computed(
    () => contractData.value?.metadata?.name || contractData.value?.name,
  )

  const fallbackFileName = computed(() => {
    const sources = contractData.value?.sources
    if (!sources?.length) return undefined
    const main = sources.find((source) => source.role === 'main') ?? sources[0]
    const path = main?.entryFileName
    if (!path) return undefined
    const slash = path.lastIndexOf('/')
    return slash === -1 ? path : path.slice(slash + 1)
  })

  const callError = shallowRef('')

  function onReadError(cause: unknown) {
    callError.value = normalizeReadError(cause)
  }

  watch(
    [readerAddress, ...(options.refetchOn ?? [])],
    () => {
      callError.value = ''

      const input = readerAddress.value
      if (!input) {
        metadata.clear()
        return
      }

      void metadata.get(input)
    },
    { immediate: true },
  )

  // A read error belongs to the action/view it happened in — clear it when
  // the user navigates elsewhere, not only when the address or RPC changes.
  watch(
    () => [viewState.value.fn, currentView.value] as const,
    () => {
      callError.value = ''
    },
  )

  function viewStateForTab(view: ContractView) {
    const nextState: Partial<ContractViewState> = { ...viewState.value, view }
    const actions = actionsForView(view)

    if (
      (view === 'read' || view === 'interact') &&
      nextState.fn &&
      !actions.some((action) => action.slug === nextState.fn)
    ) {
      nextState.fn = undefined
      nextState.args = []
    }

    return nextState
  }

  function routeForView(view: ContractView): RouteLocationRaw {
    return routeFor(viewStateForTab(view))
  }

  function selectAction(fn: string | undefined) {
    if (fn === viewState.value.fn) return
    navigate({ fn, args: [] })
  }

  function updateArgs(args: string[]) {
    navigate({ args }, { replace: true })
  }

  function selectSource(source: SourceSelection) {
    navigate({
      view: 'code',
      fn: undefined,
      source,
    })
  }

  function actionSelectionRoute(action: ContractAction): RouteLocationRaw {
    return routeFor({
      view: currentView.value,
      fn: action.slug,
      args: action.slug === viewState.value.fn ? viewState.value.args : [],
    })
  }

  function actionCodeRoute(
    action: ContractAction,
  ): RouteLocationRaw | undefined {
    const files = contractData.value?.sourceFiles ?? []
    if (!findFunctionSourceSelection(files, action.slug)) return undefined

    return routeFor({ view: 'code', fn: action.slug })
  }

  function sourceSelectionState(
    source: SourceSelection,
  ): Partial<ContractViewState> {
    return {
      view: 'code',
      source,
    }
  }

  function sourceFileHref(_file: SourceFile, file: number) {
    return hrefFor(sourceSelectionState({ file }))
  }

  function sourceLineRoute(file: number, line: number): RouteLocationRaw {
    return routeFor(sourceSelectionState({ file, line }))
  }

  function resolveStatLink(stat: {
    key: string
    value: string | number
  }): RouteLocationRaw | undefined {
    const view = STAT_VIEW_MAP[stat.key]
    if (!view || !stat.value) return undefined
    return routeFor({ view })
  }

  return {
    // query state
    viewState,
    navigate,
    routeFor,
    hrefFor,
    readerAddress,
    isReaderMode,
    // contract data
    contractData,
    hasAbi,
    contractName,
    fallbackFileName,
    // tabs / views
    tabs,
    currentView,
    viewStateForTab,
    routeForView,
    // actions
    visibleActions,
    allFunctionNames,
    selectAction,
    updateArgs,
    actionSelectionRoute,
    actionCodeRoute,
    // source view
    activeSourceSelection,
    selectSource,
    sourceFileHref,
    sourceLineRoute,
    // overview stats
    resolveStatLink,
    // read errors
    callError,
    onReadError,
  }
}
