<template>
  <div class="cr-tuple-input">
    <div
      v-for="(component, index) in components"
      :key="fieldKey(component, index)"
    >
      <FunctionInput
        v-if="!isTuple(component)"
        :input="component"
        :error="errors[fieldKey(component, index)]"
        v-model="values[fieldKey(component, index)]"
      />

      <FunctionTupleInput
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
import type { ContractFunctionParam } from '../../types/contract'
import FunctionInput from './Input.vue'
import { buildInputKey } from '../../utils/inputs'

defineOptions({ name: 'FunctionTupleInput' })

const props = defineProps<{
  components: ContractFunctionParam[]
  prefix: string
  values: Record<string, string>
  errors: Record<string, string | null>
}>()

function isTuple(component: ContractFunctionParam): boolean {
  return component.type === 'tuple' && !!component.components?.length
}

function tupleComponents(
  component: ContractFunctionParam,
): ContractFunctionParam[] {
  return component.components || []
}

function fieldKey(component: ContractFunctionParam, index: number): string {
  return buildInputKey(props.prefix, component.name, index)
}
</script>
