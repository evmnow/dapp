<template>
  <nav class="cr-actions">
    <ActionGroups
      :actions="actions"
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

      <template #group="{ group, actions: items }">
        <slot
          name="group"
          :group="group"
          :actions="items"
          :selected="selected"
          :select="selectAction"
        >
          <template
            v-for="action in items"
            :key="action.slug"
          >
            <slot
              name="item"
              :action="action"
              :selected="selected === action.slug"
              :select="selectAction"
            >
              <Button
                class="unstyled cr-action-item"
                :class="{ active: selected === action.slug }"
                type="button"
                @click="selectAction(action.slug)"
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
        </slot>
      </template>
    </ActionGroups>
  </nav>
</template>

<script setup lang="ts">
import ActionGroups from './Groups.vue'
import type { ContractAction } from '../../types/contract'
import type { ContractUIMetadata } from '../../types/metadata'

const slots = defineSlots<{
  header?: (props: Record<string, unknown>) => unknown
  group?: (props: {
    group: { key: string; label: string; actions: ContractAction[] }
    actions: ContractAction[]
    selected?: string | null
    select: (slug: string) => void
  }) => unknown
  item?: (props: {
    action: ContractAction
    selected: boolean
    select: (slug: string) => void
  }) => unknown
}>()

const props = withDefaults(
  defineProps<{
    actions: ContractAction[]
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    selected?: string | null
    title?: string
  }>(),
  {
    selected: null,
    title: 'actions',
  },
)

const emit = defineEmits<{
  select: [slug: string]
}>()

function selectAction(slug: string) {
  emit('select', slug)
}
</script>
