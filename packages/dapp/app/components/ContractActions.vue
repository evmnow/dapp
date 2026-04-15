<template>
  <section
    ref="root"
    class="contract-actions"
    :class="{ 'is-card-view': isCardView }"
  >
    <ActionCards
      v-if="isCardView"
      class="contract-actions__cards"
      :actions="actions"
      :address="contractAddress"
      :abi="abi"
      :chain-id="chainId"
      :metadata="metadata"
      :all-function-names="allFunctionNames"
      :selected="selected"
      :args="args"
      :read-function="readFunction"
      :write-function="writeFunction"
      :resolve-metadata="resolveMetadata"
      :wallet-connected="walletConnected"
      :connected-address="connectedAddress"
      :title="actionTitle"
      @select="selectAction"
      @update:args="updateArgs"
      @error="emit('read-error', $event)"
    />

    <template v-else>
      <ActionList
        class="contract-actions__list cr-panel"
        :actions="actions"
        :metadata="metadata"
        :all-function-names="allFunctionNames"
        :selected="selectedAction?.slug"
        @select="selectAction"
      />

      <div class="contract-actions__detail cr-panel">
        <template v-if="selectedAction">
          <header class="contract-actions__heading">
            <h2>{{ selectedAction.title }}</h2>
            <code>{{ signature }}</code>
          </header>

          <ActionDetail
            :address="contractAddress"
            :abi="abi"
            :chain-id="chainId"
            :action="selectedAction"
            :args="args"
            :read-function="readFunction"
            :write-function="writeFunction"
            :resolve-metadata="resolveMetadata"
            :wallet-connected="walletConnected"
            :connected-address="connectedAddress"
            @update:args="updateArgs"
            @error="emit('read-error', $event)"
          />
        </template>

        <p
          v-else
          class="cr-empty cr-muted"
        >
          {{ emptyText }}
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import ActionCards from '@evmnow/contract-reader/components/Action/Cards'
import ActionDetail from '@evmnow/contract-reader/components/Action/Detail'
import ActionList from '@evmnow/contract-reader/components/Action/List'
import type {
  ContractData,
  ContractAction,
} from '@evmnow/contract-reader/types/contract'
import type { ContractUIMetadata } from '@evmnow/contract-reader/types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '@evmnow/contract-reader/types/actions'

const props = withDefaults(
  defineProps<{
    actions: ContractAction[]
    contractAddress: string
    abi: ContractData['abi']
    chainId?: number
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    selected?: string
    args?: string[]
    readFunction?: ContractReadFn
    writeFunction?: ContractWriteFn
    resolveMetadata?: MetadataResolveFn
    walletConnected?: boolean
    connectedAddress?: string
    emptyText?: string
  }>(),
  {
    emptyText: 'select an action',
    walletConnected: false,
  },
)

const emit = defineEmits<{
  select: [slug: string | undefined]
  'update:args': [args: string[]]
  'read-error': [error: unknown]
}>()

const root = ref<HTMLElement | null>(null)
const isCardView = ref(false)

const selectedAction = computed(
  () =>
    props.actions.find((action) => action.slug === props.selected) ||
    props.actions[0] ||
    null,
)

const signature = computed(() => {
  if (!selectedAction.value) return ''

  return `${selectedAction.value.name}(${selectedAction.value.inputs
    .map((input) => input.type)
    .join(', ')})`
})

const actionTitle = computed(() =>
  props.emptyText.includes('interaction')
    ? 'interaction actions'
    : 'read actions',
)

function readSizeVariable(name: string): number {
  const rootStyle = getComputedStyle(document.documentElement)
  const value = rootStyle.getPropertyValue(name).trim()
  const rootFontSize = Number.parseFloat(rootStyle.fontSize) || 16

  if (value.endsWith('rem')) return Number.parseFloat(value) * rootFontSize
  if (value.endsWith('px')) return Number.parseFloat(value)
  return Number.parseFloat(value) || 0
}

function updateLayoutMode() {
  if (!root.value) return

  const formWidth = readSizeVariable('--form-width')
  const size4 = readSizeVariable('--size-4')
  const size7 = readSizeVariable('--size-7')
  const size8 = readSizeVariable('--size-8')
  const desktopWidth = formWidth - size7 + formWidth + size8 + size4

  isCardView.value = root.value.clientWidth < desktopWidth
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  updateLayoutMode()
  resizeObserver = new ResizeObserver(updateLayoutMode)
  if (root.value) resizeObserver.observe(root.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

function selectAction(slug: string | undefined) {
  emit('select', slug)
}

function updateArgs(nextArgs: string[]) {
  emit('update:args', nextArgs)
}
</script>

<style scoped>
@layer components {
  .contract-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--cr-gap);

    &.is-card-view {
      display: block;
    }
  }

  .contract-actions__list {
    flex: 0 1 calc(var(--form-width) - var(--size-7));
    align-self: start;
    overflow: auto;
  }

  .contract-actions__detail {
    display: grid;
    flex: 1 1 calc(var(--form-width) + var(--size-8));
    align-content: start;
    gap: var(--cr-contract-actions-detail-gap);
  }

  .contract-actions__cards {
    flex: 1 1 100%;
  }

  .contract-actions__heading h2 {
    font-size: var(--font-base);
    min-width: 50%;
  }
}
</style>
