<template>
  <nav class="cr-functions">
    <FunctionGroups
      :functions="functions"
      :metadata="metadata"
      :all-function-names="allFunctionNames"
      :title="title"
    >
      <template
        v-if="slots.header"
        #header="slotProps"
      >
        <slot
          name="header"
          v-bind="slotProps"
        />
      </template>

      <template #group="{ group, functions: fns }">
        <slot
          name="group"
          :group="group"
          :functions="fns"
          :selected="selected"
          :select="selectFunction"
        >
          <template
            v-for="fn in fns"
            :key="fn.slug"
          >
            <slot
              name="item"
              :fn="fn"
              :selected="selected === fn.slug"
              :select="selectFunction"
            >
              <Button
                class="unstyled cr-function-item"
                :class="{ active: selected === fn.slug }"
                type="button"
                @click="selectFunction(fn.slug)"
              >
                <span class="cr-function-item-title">{{ fn.title }}</span>
                <span
                  v-if="fn.title !== fn.name"
                  class="cr-function-item-signature"
                >
                  {{ fn.name }}()
                </span>
              </Button>
            </slot>
          </template>
        </slot>
      </template>
    </FunctionGroups>
  </nav>
</template>

<script setup lang="ts">
import FunctionGroups from './Groups.vue'
import type { ContractFunction } from '../../types/contract'
import type { ContractUIMetadata } from '../../types/metadata'

const slots = defineSlots<{
  header?: (props: Record<string, unknown>) => unknown
  group?: (props: {
    group: { key: string; label: string; functions: ContractFunction[] }
    functions: ContractFunction[]
    selected?: string | null
    select: (slug: string) => void
  }) => unknown
  item?: (props: {
    fn: ContractFunction
    selected: boolean
    select: (slug: string) => void
  }) => unknown
}>()

const props = withDefaults(
  defineProps<{
    functions: ContractFunction[]
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    selected?: string | null
    title?: string
  }>(),
  {
    selected: null,
    title: 'functions',
  },
)

const emit = defineEmits<{
  select: [slug: string]
}>()

function selectFunction(slug: string) {
  emit('select', slug)
}
</script>
