<template>
  <main class="cr-playground">
    <section class="cr-shell">
      <header class="cr-header cr-panel">
        <div>
          <h1>{{ title }}</h1>
          <code v-if="contractData">{{ contractData.address }}</code>
        </div>

        <nav
          v-if="contractData"
          class="cr-tabs"
        >
          <Button
            v-for="tab in tabs"
            :key="tab"
            :class="{ active: currentView === tab }"
            @click="selectView(tab)"
          >
            {{ tab }}
          </Button>
        </nav>
      </header>

      <form
        class="playground-controls cr-panel"
        @submit.prevent="load"
      >
        <input
          v-model="addressInput"
          class="cr-input"
          placeholder="contract address or ENS name"
          spellcheck="false"
        />
        <input
          v-model="chainIdInput"
          class="cr-input playground-chain"
          placeholder="chain id"
          inputmode="numeric"
        />
        <input
          v-model="rpcInput"
          class="cr-input"
          placeholder="RPC URL (optional — metadata loads without one)"
          spellcheck="false"
        />
        <Button
          type="submit"
          class="primary"
        >
          load
        </Button>
      </form>

      <Alert v-if="pending"> loading contract metadata... </Alert>

      <Alert
        v-else-if="error"
        type="error"
      >
        {{ error.message }}
      </Alert>

      <template v-if="contractData">
        <Overview
          v-if="currentView === 'overview'"
          :contract="contractData"
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
          :write-function="
            currentView === 'interact'
              ? wallet.writeContractFunction
              : undefined
          "
          :resolve-metadata="resolveMetadata"
          :wallet-connected="wallet.walletConnected.value"
          :connected-address="wallet.walletAddress.value"
          :title="currentView === 'interact' ? 'interactions' : 'read actions'"
          @select="selectAction"
          @update:args="updateArgs"
        />

        <Source
          v-else-if="currentView === 'code'"
          :files="contractData.sourceFiles"
          :selected-source="activeSourceSelection"
          @update:source="selectSource"
        />
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { ContractView } from '../../../app/types/view'

const addressInput = ref('')
const chainIdInput = ref('1')
const rpcInput = ref('')

const chainId = computed(() => {
  const parsed = Number.parseInt(chainIdInput.value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const wallet = useContractWallet({
  chainId,
  rpc: rpcInput,
})

const { resolveMetadata } = useTokenMetadataResolver()

const { contract, error, get, pending, clear } = useContractMetadataSdk({
  chainId: computed(() => wallet.metadataOptions.value.chainId),
  rpc: computed(() => wallet.metadataOptions.value.rpc ?? ''),
  fetch: wallet.metadataFetch,
})

const {
  viewState,
  navigate,
  readerAddress,
  contractData,
  contractName,
  tabs,
  currentView,
  visibleActions,
  allFunctionNames,
  selectAction,
  updateArgs,
  activeSourceSelection,
  selectSource,
} = useContractReaderView({
  metadata: { contract, get, clear },
  refetchOn: [
    () => wallet.metadataOptions.value.chainId,
    () => wallet.metadataOptions.value.rpc,
  ],
  walletConnected: wallet.walletConnected,
})

const title = computed(() => contractName.value || 'Contract Reader Playground')

function load() {
  navigate({ address: addressInput.value.trim() })
}

function selectView(view: ContractView) {
  navigate({ view, fn: undefined, args: [], source: undefined })
}

// Keep the address form in sync with addresses arriving via the URL.
watch(
  readerAddress,
  (input) => {
    if (input) addressInput.value = input
  },
  { immediate: true },
)
</script>

<style scoped>
@layer components {
  .cr-playground {
    inline-size: min(100%, 72rem);
    margin-inline: auto;
    padding: var(--size-5) var(--size-4);
  }

  .playground-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--cr-gap);
    padding: var(--cr-gap);
  }

  .playground-controls > input {
    flex: 1 1 16rem;
  }

  .playground-controls > .playground-chain {
    flex: 0 1 6rem;
  }
}
</style>
