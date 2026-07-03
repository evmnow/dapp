<template>
  <div class="cr-tuple-input">
    <div
      v-for="(component, index) in components"
      :key="fieldKey(component, index)"
    >
      <ActionInput
        v-if="!isTuple(component)"
        :input="component"
        :error="errors[fieldKey(component, index)]"
        v-model="values[fieldKey(component, index)]"
      />

      <ActionTupleInput
        v-else
        :components="tupleComponents(component)"
        :prefix="fieldKey(component, index)"
        :values="values"
        :errors="errors"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContractActionParam } from '../../types/contract'
import ActionInput from './Input.vue'
import { buildInputKey } from '../../utils/inputs'

defineOptions({ name: 'ActionTupleInput' })

const props = defineProps<{
  components: ContractActionParam[]
  prefix: string
  values: Record<string, string>
  errors: Record<string, string | null>
}>()

function isTuple(component: ContractActionParam): boolean {
  return component.type === 'tuple' && !!component.components?.length
}

function tupleComponents(
  component: ContractActionParam,
): ContractActionParam[] {
  return component.components || []
}

function fieldKey(component: ContractActionParam, index: number): string {
  return buildInputKey(props.prefix, component.name, index)
}
</script>
