<template>
  <section
    ref="root"
    class="contract-functions"
    :class="{ 'is-card-view': isCardView }"
  >
    <FunctionCards
      v-if="isCardView"
      class="contract-functions__cards"
      :functions="functions"
      :address="contractAddress"
      :abi="abi"
      :chain-id="chainId"
      :metadata="metadata"
      :all-function-names="allFunctionNames"
      :selected="selected"
      :args="args"
      :read-function="readFunction"
      :write-function="writeFunction"
      :wallet-connected="walletConnected"
      :connected-address="connectedAddress"
      :title="functionTitle"
      @select="selectFunction"
      @update:args="updateArgs"
      @error="emit('read-error', $event)"
    />

    <template v-else>
      <FunctionList
        class="contract-functions__list cr-panel"
        :functions="functions"
        :metadata="metadata"
        :all-function-names="allFunctionNames"
        :selected="selectedFunction?.slug"
        @select="selectFunction"
      />

      <div class="contract-functions__detail cr-panel">
        <template v-if="selectedFunction">
          <header class="contract-functions__heading">
            <h2>{{ selectedFunction.title }}</h2>
            <code>{{ signature }}</code>
          </header>

          <FunctionDetail
            :address="contractAddress"
            :abi="abi"
            :chain-id="chainId"
            :fn="selectedFunction"
            :args="args"
            :read-function="readFunction"
            :write-function="writeFunction"
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
import FunctionCards from '@evmnow/contract-reader/components/Function/Cards'
import FunctionDetail from '@evmnow/contract-reader/components/Function/Detail'
import FunctionList from '@evmnow/contract-reader/components/Function/List'
import type {
  ContractData,
  ContractFunction,
} from '@evmnow/contract-reader/types/contract'
import type { ContractUIMetadata } from '@evmnow/contract-reader/types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
} from '@evmnow/contract-reader/types/actions'

const props = withDefaults(
  defineProps<{
    functions: ContractFunction[]
    contractAddress: string
    abi: ContractData['abi']
    chainId?: number
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    selected?: string
    args?: string[]
    readFunction?: ContractReadFn
    writeFunction?: ContractWriteFn
    walletConnected?: boolean
    connectedAddress?: string
    emptyText?: string
  }>(),
  {
    emptyText: 'select a function',
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

const selectedFunction = computed(
  () =>
    props.functions.find((fn) => fn.slug === props.selected) ||
    props.functions[0] ||
    null,
)

const signature = computed(() => {
  if (!selectedFunction.value) return ''

  return `${selectedFunction.value.name}(${selectedFunction.value.inputs
    .map((input) => input.type)
    .join(', ')})`
})

const functionTitle = computed(() =>
  props.emptyText.includes('interaction')
    ? 'interaction functions'
    : 'read functions',
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

function selectFunction(slug: string | undefined) {
  emit('select', slug)
}

function updateArgs(nextArgs: string[]) {
  emit('update:args', nextArgs)
}
</script>
