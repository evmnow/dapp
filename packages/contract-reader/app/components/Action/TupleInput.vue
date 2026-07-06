<template>
  <div class="cr-tuple-input">
    <div
      v-for="(component, index) in components"
      :key="fieldKey(component, index)"
    >
      <!-- `values` is the shared reactive input record owned by ActionDetail;
           writing member fields through it is this component's contract
           (mirroring the `set-value` surface of the field slot). -->
      <!-- eslint-disable vue/no-mutating-props -->
      <ActionInput
        v-if="!isTuple(component)"
        v-model="values[fieldKey(component, index)]"
        :input="component"
        :meta="component.meta"
        :amount="amountMeta?.(component) ?? null"
        :error="errors[fieldKey(component, index)]"
      />
      <!-- eslint-enable vue/no-mutating-props -->

      <ActionTupleInput
        v-else
        :components="tupleComponents(component)"
        :prefix="fieldKey(component, index)"
        :values="values"
        :errors="errors"
        :amount-meta="amountMeta"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContractActionParam } from '../../types/contract'
import type { AmountInputInfo } from '../../utils/format'
import ActionInput from './Input.vue'
import { buildInputKey } from '../../utils/inputs'

defineOptions({ name: 'ActionTupleInput' })

const props = defineProps<{
  components: ContractActionParam[]
  prefix: string
  values: Record<string, string>
  errors: Record<string, string | null>
  /**
   * Resolves amount rendering info for a member (see `Detail.vue`'s
   * `amountMeta`). Must be forwarded so amount-like tuple members render the
   * same human-decimal input that `buildInputArgs` scales on submit —
   * otherwise the field collects raw units and submits them multiplied by
   * 10^decimals.
   */
  amountMeta?: (input: ContractActionParam) => AmountInputInfo | null
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
