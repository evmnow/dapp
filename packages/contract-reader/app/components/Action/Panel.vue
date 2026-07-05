<template>
  <section
    ref="root"
    class="cr-action-panel"
    :class="{ 'is-cards': isCardView }"
  >
    <ActionCards
      v-if="isCardView"
      class="cr-action-panel-cards"
      :actions="actions"
      :address="address"
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
      :title="title"
      :source-route="actionCodeRoute"
      @select="emit('select', $event)"
      @update:args="emit('update:args', $event)"
      @error="emit('error', $event)"
    >
      <template
        v-for="(_, name) in detailSlots"
        :key="name"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps"
        />
      </template>
    </ActionCards>

    <template v-else>
      <ActionList
        class="cr-action-panel-list cr-panel"
        :actions="actions"
        :metadata="metadata"
        :all-function-names="allFunctionNames"
        :selected="selectedAction?.slug"
        :title="title"
        @select="emit('select', $event)"
      >
        <template
          v-if="slots.item || actionSelectionRoute"
          #item="{ action, selected: isSelected, select }"
        >
          <slot
            name="item"
            :action="action"
            :selected="isSelected"
            :select="select"
          >
            <Button
              :to="actionSelectionRoute!(action)"
              class="unstyled cr-action-item"
              :class="{ active: isSelected }"
              active-class=""
              exact-active-class=""
            >
              <span class="cr-action-item-title">{{ action.title }}</span>
              <span
                v-if="action.title !== action.name"
                class="cr-action-item-signature"
              >
                {{ action.name }}()
              </span>
            </Button>
          </slot>
        </template>
      </ActionList>

      <div class="cr-action-panel-detail cr-panel">
        <template v-if="selectedAction">
          <slot
            name="heading"
            :action="selectedAction"
            :signature="signature"
          >
            <header class="cr-action-panel-heading">
              <h2>{{ selectedAction.title }}</h2>
              <code>{{ signature }}</code>
            </header>
          </slot>

          <ActionDetail
            :address="address"
            :abi="abi"
            :chain-id="chainId"
            :action="selectedAction"
            :args="args"
            :read-function="readFunction"
            :write-function="writeFunction"
            :resolve-metadata="resolveMetadata"
            :wallet-connected="walletConnected"
            :connected-address="connectedAddress"
            :source-route="actionCodeRoute?.(selectedAction)"
            @update:args="emit('update:args', $event)"
            @error="emit('error', $event)"
          >
            <template
              v-for="(_, name) in detailSlots"
              :key="name"
              #[name]="slotProps"
            >
              <slot
                :name="name"
                v-bind="slotProps"
              />
            </template>
          </ActionDetail>
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
import ActionCards from './Cards.vue'
import ActionDetail from './Detail.vue'
import ActionList from './List.vue'
import type { RouteLocationRaw } from 'vue-router'
import type { ContractData, ContractAction } from '../../types/contract'
import type { ContractUIMetadata } from '../../types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '../../types/actions'

const props = withDefaults(
  defineProps<{
    actions: ContractAction[]
    address: string
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
    title?: string
    emptyText?: string
    /** `auto` switches to cards below the two-column breakpoint. */
    mode?: 'auto' | 'list' | 'cards'
    /** Renders list items as links when provided; falls back to buttons. */
    actionSelectionRoute?: (action: ContractAction) => RouteLocationRaw
    actionCodeRoute?: (action: ContractAction) => RouteLocationRaw | undefined
  }>(),
  {
    title: 'actions',
    emptyText: 'select an action',
    mode: 'auto',
    walletConnected: false,
  },
)

const emit = defineEmits<{
  select: [slug: string | undefined]
  'update:args': [args: string[]]
  error: [error: unknown]
}>()

const slots = useSlots()
const PANEL_SLOTS = ['item', 'heading']
const detailSlots = computed(() =>
  Object.fromEntries(
    Object.entries(slots).filter(([name]) => !PANEL_SLOTS.includes(name)),
  ),
)

const root = ref<HTMLElement | null>(null)
const autoCardView = ref(false)
const isCardView = computed(() =>
  props.mode === 'auto' ? autoCardView.value : props.mode === 'cards',
)

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

  autoCardView.value = root.value.clientWidth < desktopWidth
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (props.mode !== 'auto') return
  updateLayoutMode()
  resizeObserver = new ResizeObserver(updateLayoutMode)
  if (root.value) resizeObserver.observe(root.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>
