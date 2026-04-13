<template>
  <section
    v-if="fields.length"
    class="cr-result-fields"
  >
    <div
      v-for="field in fields"
      :key="field.key"
      class="cr-result-field"
      :style="fieldIndentStyle(field.depth)"
    >
      <span class="cr-result-field-label">{{ field.label }}</span>
      <span class="cr-result-field-value">
        <template v-if="field.kind === 'address'">
          <slot
            name="address"
            :address="String(field.raw)"
            :value="field.value"
            :raw="field.raw"
            :href="field.href ?? null"
            :field="field"
          >
            <a
              v-if="field.href"
              :href="field.href"
              class="cr-result-address"
            >
              {{ field.value }}
            </a>
            <template v-else>
              {{ field.value }}
            </template>
          </slot>
        </template>
        <span
          v-else-if="field.kind === 'boolean'"
          class="cr-result-bool"
          :class="field.raw ? 'cr-result-bool--true' : 'cr-result-bool--false'"
        >
          {{ field.raw ? 'true' : 'false' }}
        </span>
        <template v-else>
          {{ field.value }}
        </template>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ContractFunctionParam } from '../../types/contract'
import type { ParamMeta } from '../../types/metadata'
import {
  formatArgValue,
  formatSemanticValue,
  getResultFieldLabel,
  getResultValue,
  isTupleType,
  resultFieldKind,
  resolveSemanticType,
} from '../../utils/format'

const props = defineProps<{
  result: unknown
  outputs: ContractFunctionParam[]
  returnsMeta?: Record<string, ParamMeta>
  addressHref?: (address: string) => string | undefined | null
}>()

interface ResultField {
  key: string
  name: string
  label: string
  kind:
    | 'default'
    | 'eth'
    | 'percentage'
    | 'basis-points'
    | 'timestamp'
    | 'address'
    | 'boolean'
  value: string
  raw: unknown
  depth: number
  href?: string | null
}

function buildFields(
  result: unknown,
  outputs: ContractFunctionParam[],
  depth = 0,
  prefix = '',
): ResultField[] {
  if (result == null || !outputs.length) return []

  return outputs.flatMap((output, index) => {
    const value = getResultValue(result, output, index)
    const meta = props.returnsMeta?.[output.name]
    const semanticType = resolveSemanticType(meta?.type)
    const key = `${prefix}${output.name || 'field'}-${index}`
    const kind = resultFieldKind(output, semanticType)
    const label = getResultFieldLabel(output, index)

    const baseField: ResultField = {
      key,
      name: output.name || String(index),
      label,
      kind,
      value: semanticType
        ? formatSemanticValue(value, semanticType)
        : formatArgValue(value),
      raw: value,
      depth,
      href:
        kind === 'address' && value && props.addressHref
          ? props.addressHref(String(value))
          : null,
    }

    if (isTupleType(output) && value != null) {
      return [
        baseField,
        ...buildFields(value, output.components ?? [], depth + 1, `${key}.`),
      ]
    }

    return [baseField]
  })
}

function fieldIndentStyle(depth: number) {
  if (depth <= 0) return {}

  const indent = Array.from({ length: depth }, () => 'var(--size-5)').join(
    ' + ',
  )

  return {
    paddingInlineStart: `calc(var(--cr-result-field-padding-inline) + ${indent})`,
  }
}

const fields = computed(() => buildFields(props.result, props.outputs))
</script>
