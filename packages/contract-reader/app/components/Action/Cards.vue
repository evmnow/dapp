<template>
  <nav class="cr-action-cards">
    <ActionGroups
      :actions="actions"
      :metadata="metadata"
      :all-function-names="allFunctionNames"
      :title="title"
    >
      <template #group="{ actions: items }">
        <div class="cr-action-card-grid">
          <article
            v-for="action in items"
            :key="action.slug"
            class="cr-action-card"
            :class="{ expanded: isExpanded(action.slug) }"
          >
            <button
              class="cr-action-card-header"
              type="button"
              @click="toggleAction(action.slug)"
            >
              <span class="cr-action-card-title">{{ action.title }}</span>
              <span
                v-if="action.title !== action.name"
                class="cr-action-card-signature"
              >
                {{ action.name }}()
              </span>
            </button>

            <div
              class="cr-action-card-expand"
              :class="{ open: isExpanded(action.slug) }"
            >
              <div class="cr-action-card-collapse">
                <div class="cr-action-card-body">
                  <ActionDetail
                    v-if="rendered.has(action.slug)"
                    :address="address"
                    :abi="abi"
                    :chain-id="chainId"
                    :action="action"
                    :args="selected === action.slug ? args : undefined"
                    :read-function="readFunction"
                    :write-function="writeFunction"
                    :resolve-metadata="resolveMetadata"
                    :wallet-connected="walletConnected"
                    :connected-address="connectedAddress"
                    @update:args="updateArgs(action.slug, $event)"
                    @error="emit('error', $event)"
                  />
                </div>
              </div>
            </div>
          </article>
        </div>
      </template>
    </ActionGroups>
  </nav>
</template>

<script setup lang="ts">
import type { Abi } from 'viem'
import ActionDetail from './Detail.vue'
import ActionGroups from './Groups.vue'
import type { ContractAction } from '../../types/contract'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '../../types/actions'
import type { ContractUIMetadata } from '../../types/metadata'

const props = withDefaults(
  defineProps<{
    actions: ContractAction[]
    address: string
    abi: Abi
    chainId?: number
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    selected?: string | null
    args?: string[]
    readFunction?: ContractReadFn
    writeFunction?: ContractWriteFn
    resolveMetadata?: MetadataResolveFn
    walletConnected?: boolean
    connectedAddress?: string
    title?: string
  }>(),
  {
    selected: null,
    title: 'actions',
    walletConnected: false,
  },
)

const emit = defineEmits<{
  select: [slug: string | undefined]
  'update:args': [args: string[]]
  error: [error: unknown]
}>()

const rendered = ref(new Set<string>())

function isExpanded(slug: string): boolean {
  return props.selected === slug
}

function toggleAction(slug: string) {
  emit('select', props.selected === slug ? undefined : slug)
}

function updateArgs(slug: string, args: string[]) {
  if (props.selected === slug) emit('update:args', args)
}

watch(
  () => props.selected,
  (slug, previous) => {
    if (slug) rendered.value.add(slug)

    if (previous) {
      const closing = previous
      globalThis.setTimeout(() => {
        if (props.selected !== closing) rendered.value.delete(closing)
      }, 300)
    }
  },
  { immediate: true },
)
</script>
