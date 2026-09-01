<template>
  <AppPage :content-class="contentClass">
    <AppSearchPanel v-if="!isReaderMode" />

    <template v-else>
      <Alert
        v-if="rpcOverride"
        type="info"
        dismissable
      >
        <p>
          This link set the RPC endpoint for chain {{ rpcOverride.chainId }} to
          <code>{{ rpcOverride.rpc }}</code
          >. Contract data is read through it instead of your saved settings —
          only trust results if you trust the link.
        </p>
      </Alert>

      <Alert
        v-if="!hasRpc"
        type="info"
      >
        <p>
          Repository and Sourcify metadata can load verified addresses without
          RPC. Set an RPC URL in settings for ENS, GNS, and WNS lookup and
          contractURI metadata, or connect a wallet for provider-backed metadata
          and reads.
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
              :key="tab"
              :class="{ active: currentView === tab }"
              :to="routeForView(tab)"
              active-class=""
              exact-active-class=""
              :aria-current-value="currentView === tab ? 'page' : undefined"
            >
              {{ tab }}
            </Button>
          </nav>
        </header>

        <Overview
          v-if="currentView === 'overview'"
          :contract="contractData"
          :link-resolver="resolveStatLink"
        />

        <ActionPanel
          v-else-if="currentView === 'read' || currentView === 'interact'"
          :actions="visibleActions"
          :address="contractData.address"
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
          :title="actionsTitle"
          :empty-text="emptyActionText"
          :action-selection-route="actionSelectionRoute"
          :action-code-route="actionCodeRoute"
          @select="selectAction"
          @update:args="updateArgs"
          @error="onReadError"
        />

        <Source
          v-else-if="currentView === 'code'"
          :files="contractData.sourceFiles"
          :selected-source="activeSourceSelection"
          :file-href="sourceFileHref"
          @update:source="selectSource"
        >
          <template #line="{ fileIndex, lineNumber, highlightedLine, active }">
            <td class="cr-source-line-number-cell">
              <NuxtLink
                :to="sourceLineRoute(fileIndex, lineNumber)"
                class="cr-line-number"
                :class="{ active }"
                active-class=""
                exact-active-class=""
              >
                {{ lineNumber }}
              </NuxtLink>
            </td>
            <td class="cr-source-code-cell">
              <!-- Shiki output: source text arrives fully escaped inside
                   generated span markup. -->
              <!-- eslint-disable vue/no-v-html -->
              <pre
                class="cr-source-code-block"
                v-html="highlightedLine"
              />
              <!-- eslint-enable vue/no-v-html -->
            </td>
          </template>
        </Source>
      </section>
    </template>
  </AppPage>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const mainnetEnsRpc = computed(() =>
  String(config.public.mainnetEnsRpc ?? '').trim(),
)
const { effectiveChainId, effectiveRpc, rpcOverride, rpcOverrides } =
  useReaderRpc()
const wallet = useContractWallet({
  chainId: effectiveChainId,
  rpc: effectiveRpc,
})
const walletConnected = wallet.walletConnected
const connectedAddress = wallet.walletAddress
const { resolveMetadata } = useTokenMetadataResolver()
const metadataRpc = computed(() => wallet.metadataOptions.value.rpc ?? '')
const mainnetRpcOverride = computed(
  () =>
    rpcOverrides.value.find((override) => override.chainId === 1)?.rpc ?? '',
)
const { contract, error, get, pending, clear } = useContractMetadataSdk({
  chainId: wallet.chainId,
  rpc: metadataRpc,
  ensRpc: computed(
    () =>
      mainnetRpcOverride.value ||
      mainnetEnsRpc.value ||
      (wallet.metadataOptions.value.chainId === 1 ? metadataRpc.value : ''),
  ),
  fetch: wallet.metadataFetch,
})

const {
  viewState,
  readerAddress,
  isReaderMode,
  contractData,
  contractName,
  fallbackFileName,
  tabs,
  currentView,
  routeForView,
  visibleActions,
  allFunctionNames,
  selectAction,
  updateArgs,
  actionSelectionRoute,
  actionCodeRoute,
  activeSourceSelection,
  selectSource,
  sourceFileHref,
  sourceLineRoute,
  resolveStatLink,
  callError,
  onReadError,
} = useContractReaderView({
  metadata: { contract, get, clear },
  refetchOn: [
    () => wallet.metadataOptions.value.chainId,
    () => wallet.metadataOptions.value.rpc,
  ],
  walletConnected,
  fallbackChainId: wallet.chainId,
})

const hasRpc = computed(() => Boolean(wallet.metadataOptions.value.rpc))
const isMetadataNotFound = computed(
  () => error.value?.name === 'ContractMetadataNotFoundError',
)

const title = computed(
  () => contractName.value || fallbackFileName.value || 'Contract',
)
const emptyActionText = computed(() =>
  currentView.value === 'interact'
    ? 'select an interaction'
    : 'select a read action',
)
const actionsTitle = computed(() =>
  currentView.value === 'interact' ? 'interaction actions' : 'read actions',
)
const contentClass = computed(() =>
  isReaderMode.value ? undefined : 'home-page',
)

useHead({
  title: computed(() => {
    if (!isReaderMode.value) return undefined
    return contractName.value || fallbackFileName.value || readerAddress.value
  }),
})
</script>
