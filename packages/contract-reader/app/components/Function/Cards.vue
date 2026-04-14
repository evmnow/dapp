<template>
  <nav class="cr-function-cards">
    <FunctionGroups
      :functions="functions"
      :metadata="metadata"
      :all-function-names="allFunctionNames"
      :title="title"
    >
      <template #group="{ functions: fns }">
        <div class="cr-function-card-grid">
          <article
            v-for="fn in fns"
            :key="fn.slug"
            class="cr-function-card"
            :class="{ expanded: isExpanded(fn.slug) }"
          >
            <button
              class="cr-function-card-header"
              type="button"
              @click="toggleFunction(fn.slug)"
            >
              <span class="cr-function-card-title">{{ fn.title }}</span>
              <span
                v-if="fn.title !== fn.name"
                class="cr-function-card-signature"
              >
                {{ fn.name }}()
              </span>
            </button>

            <div
              class="cr-function-card-expand"
              :class="{ open: isExpanded(fn.slug) }"
            >
              <div class="cr-function-card-collapse">
                <div class="cr-function-card-body">
                  <FunctionDetail
                    v-if="rendered.has(fn.slug)"
                    :address="address"
                    :abi="abi"
                    :chain-id="chainId"
                    :fn="fn"
                    :args="selected === fn.slug ? args : undefined"
                    :read-function="readFunction"
                    :write-function="writeFunction"
                    :resolve-metadata="resolveMetadata"
                    :wallet-connected="walletConnected"
                    :connected-address="connectedAddress"
                    @update:args="updateArgs(fn.slug, $event)"
                    @error="emit('error', $event)"
                  />
                </div>
              </div>
            </div>
          </article>
        </div>
      </template>
    </FunctionGroups>
  </nav>
</template>

<script setup lang="ts">
import type { Abi } from 'viem'
import FunctionDetail from './Detail.vue'
import FunctionGroups from './Groups.vue'
import type { ContractFunction } from '../../types/contract'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '../../types/actions'
import type { ContractUIMetadata } from '../../types/metadata'

const props = withDefaults(
  defineProps<{
    functions: ContractFunction[]
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
    title: 'functions',
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

function toggleFunction(slug: string) {
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
