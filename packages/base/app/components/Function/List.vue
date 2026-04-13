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
              :href="itemHref(fn)"
              :select="selectFunction"
            >
              <component
                :is="itemHref(fn) ? 'a' : 'button'"
                class="cr-function-item"
                :class="{ active: selected === fn.slug }"
                :href="itemHref(fn) || undefined"
                :type="itemHref(fn) ? undefined : 'button'"
                @click="selectFunction(fn.slug)"
              >
                <span>{{ fn.title }}</span>
                <code v-if="fn.title !== fn.name">{{ fn.name }}()</code>
              </component>
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
    href: string | null
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
    itemHref?: (fn: ContractFunction) => string | undefined | null
  }>(),
  {
    selected: null,
    title: 'functions',
  },
)

const emit = defineEmits<{
  select: [slug: string]
}>()

function itemHref(fn: ContractFunction) {
  return props.itemHref?.(fn) ?? null
}

function selectFunction(slug: string) {
  emit('select', slug)
}
</script>
