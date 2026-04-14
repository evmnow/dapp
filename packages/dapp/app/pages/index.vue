<template>
  <AppPage :content-class="contentClass">
    <AppSearchPanel v-if="!isReaderMode" />

    <template v-else>
      <Alert
        v-if="!hasRpc"
        type="info"
      >
        <p>
          Repository and Sourcify metadata can load verified addresses without
          RPC. Set an RPC URL in settings for ENS lookup and contractURI
          metadata, or connect a wallet for provider-backed metadata and reads.
        </p>

        <Actions>
          <Button
            to="/settings"
            class="tertiary small"
            >View Settings</Button
          >
        </Actions>
      </Alert>

      <Alert v-if="pending"> Loading contract metadata... </Alert>

      <Alert
        v-else-if="isMetadataNotFound"
        type="error"
      >
        <p>
          This contract is not verified on Sourcify. If you have the source
          code, or if the contract is verified somewhere else, you can verify it
          here:
          <a
            href="https://verify.sourcify.dev/"
            class="app-link"
            target="_blank"
            rel="noreferrer"
            >verify.sourcify.dev</a
          >.
        </p>
      </Alert>

      <Alert
        v-else-if="error"
        type="error"
        dismissable
      >
        {{ error.message }}
      </Alert>

      <Alert
        v-if="callError"
        type="error"
        dismissable
      >
        {{ callError }}
      </Alert>

      <section
        v-if="contractData"
        class="cr-shell"
      >
        <header class="cr-header cr-panel">
          <div>
            <h1>{{ title }}</h1>
            <code>{{ contractData.address }}</code>
          </div>

          <nav class="cr-tabs">
            <Button
              v-for="tab in tabs"
              :key="tab.value"
              :class="{ active: currentView === tab.value }"
              type="button"
              @click="setView(tab.value)"
            >
              {{ tab.label }}
            </Button>
          </nav>
        </header>

        <Overview
          v-if="currentView === 'overview'"
          :contract="contractData"
          :link-resolver="resolveStatLink"
        />

        <ContractFunctions
          v-else-if="currentView === 'read' || currentView === 'interact'"
          :functions="visibleFunctions"
          :contract-address="contractData.address"
          :abi="contractData.abi"
          :chain-id="contractData.chainId"
          :metadata="contractData.metadata"
          :all-function-names="allFunctionNames"
          :selected="viewState.fn"
          :args="viewState.args"
          :read-function="wallet.readContractFunction"
          :resolve-metadata="resolveMetadata"
          :write-function="
            currentView === 'interact'
              ? wallet.writeContractFunction
              : undefined
          "
          :wallet-connected="walletConnected"
          :connected-address="connectedAddress"
          :empty-text="emptyFunctionText"
          @select="selectFunction"
          @update:args="updateArgs"
          @read-error="onReadError"
        />

        <Source
          v-else-if="currentView === 'code'"
          :files="contractData.sourceFiles"
          :selected-source="selectedSource"
          @update:source="updateSource"
        />
      </section>
    </template>
  </AppPage>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type {
  ContractView,
  ContractViewState,
  SourceSelection,
} from '~/types/view'
import { toContractData } from '@evmnow/contract-reader/utils/contract'
import {
  findFunctionSourceSelection,
  isSameSourceSelection,
} from '@evmnow/contract-reader/utils/source'

const config = useRuntimeConfig()
const mainnetEnsRpc = computed(() =>
  String(config.public.mainnetEnsRpc ?? '').trim(),
)
const { state, routeFor } = useReaderQueryState()
const readerAddress = computed(() => state.value.address?.trim() || '')
const isReaderMode = computed(() => Boolean(readerAddress.value))
const { effectiveChainId, rpc } = useReaderRpc()
const wallet = useContractWallet({ chainId: effectiveChainId, rpc })
const walletConnected = wallet.walletConnected
const connectedAddress = wallet.walletAddress
const { resolveMetadata } = useTokenMetadataResolver()
const metadataRpc = computed(() => wallet.metadataOptions.value.rpc ?? '')
const { contract, error, get, pending, clear } = useContractMetadataSdk({
  chainId: wallet.chainId,
  rpc: metadataRpc,
  ensRpc: computed(
    () =>
      mainnetEnsRpc.value ||
      (wallet.metadataOptions.value.chainId === 1 ? metadataRpc.value : ''),
  ),
  fetch: wallet.metadataFetch,
})
const callError = shallowRef('')
const hasRpc = computed(() => Boolean(wallet.metadataOptions.value.rpc))
const isMetadataNotFound = computed(
  () => error.value?.name === 'ContractMetadataNotFoundError',
)

const contractData = computed(() => {
  const normalized = toContractData(contract.value, readerAddress.value)
  if (!normalized || normalized.chainId) return normalized
  return { ...normalized, chainId: wallet.chainId.value }
})

const viewState = computed<ContractViewState>({
  get() {
    return {
      view: state.value.view,
      fn: state.value.fn,
      args: state.value.args,
      source: state.value.source,
    }
  },
  set(nextState) {
    state.value = {
      ...state.value,
      view: nextState.view,
      fn: nextState.fn,
      args: nextState.args ?? [],
      source: nextState.source,
    }
  },
})
const hasAbi = computed(() => Boolean(contractData.value?.abi.length))
const tabs = computed<{ value: ContractView; label: string }[]>(() => [
  { value: 'overview', label: 'overview' },
  ...(hasAbi.value
    ? ([
        { value: 'read', label: 'read' },
        { value: 'interact', label: 'interact' },
      ] satisfies { value: ContractView; label: string }[])
    : []),
  { value: 'code', label: 'code' },
])
const currentView = computed<ContractView>(() => {
  if (!hasAbi.value && ['read', 'interact'].includes(viewState.value.view)) {
    return 'overview'
  }

  return viewState.value.view
})
const selectedFunctionSlug = computed(() =>
  currentView.value === 'code' ? viewState.value.fn : undefined,
)
const selectedSource = computed(() => {
  return state.value.source
})
const visibleFunctions = computed(() => {
  return functionsForView(currentView.value)
})
const allFunctionNames = computed(() => {
  if (!contractData.value) return undefined
  return new Set(
    [
      ...contractData.value.functions.read,
      ...contractData.value.functions.write,
    ].map((fn) => fn.name),
  )
})
const STAT_VIEW_MAP: Record<string, ContractView> = {
  read: 'read',
  write: 'interact',
  source: 'code',
}

function resolveStatLink(stat: {
  key: string
  value: string | number
}): RouteLocationRaw | undefined {
  const view = STAT_VIEW_MAP[stat.key]
  if (!view || !stat.value) return undefined
  return routeFor({ view })
}

const fallbackFileName = computed(() => {
  const sources = contractData.value?.sources
  if (!sources?.length) return undefined
  const main = sources.find((source) => source.role === 'main') ?? sources[0]
  const path = main?.entryFileName
  if (!path) return undefined
  const slash = path.lastIndexOf('/')
  return slash === -1 ? path : path.slice(slash + 1)
})
const title = computed(
  () =>
    contractData.value?.metadata?.name ||
    contractData.value?.name ||
    fallbackFileName.value ||
    'Contract',
)
const emptyFunctionText = computed(() =>
  currentView.value === 'interact'
    ? 'select an interaction function'
    : 'select a read function',
)
const contentClass = computed(() =>
  isReaderMode.value ? undefined : 'home-page',
)

useHead({
  title: computed(() => {
    if (!isReaderMode.value) return undefined
    const name =
      contractData.value?.metadata?.name ||
      contractData.value?.name ||
      fallbackFileName.value
    return name || readerAddress.value
  }),
})

watch(
  [readerAddress, wallet.metadataOptions],
  ([input]) => {
    callError.value = ''

    if (!input) {
      clear()
      return
    }

    void get(input)
  },
  { immediate: true },
)

watch(
  [selectedFunctionSlug, () => contractData.value?.sourceFiles],
  ([slug, files]) => {
    if (!slug || !files?.length) return

    const source = findFunctionSourceSelection(files, slug)
    if (!source || isSameSourceSelection(state.value.source, source)) return

    viewState.value = {
      ...viewState.value,
      source,
    }
  },
  { immediate: true },
)

function onReadError(cause: unknown) {
  callError.value =
    cause instanceof Error ? cause.message : String(cause || 'Read failed')
}

function setView(view: ContractView) {
  const nextState = { ...viewState.value, view }
  const functions = functionsForView(view)

  if (
    (view === 'read' || view === 'interact') &&
    nextState.fn &&
    !functions.some((fn) => fn.slug === nextState.fn)
  ) {
    nextState.fn = undefined
    nextState.args = []
  }

  viewState.value = nextState
}

function selectFunction(fn: string | undefined) {
  viewState.value = { ...viewState.value, fn, args: [] }
}

function updateArgs(args: string[]) {
  viewState.value = { ...viewState.value, args }
}

function updateSource(source: SourceSelection) {
  viewState.value = {
    ...viewState.value,
    view: 'code',
    source,
  }
}

function functionsForView(view: ContractView) {
  if (!contractData.value) return []
  return view === 'interact'
    ? contractData.value.functions.write
    : contractData.value.functions.read
}
</script>
