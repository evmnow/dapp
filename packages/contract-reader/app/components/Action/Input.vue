<template>
  <div class="cr-field">
    <span class="cr-field-label">
      {{ label }}
      <span class="cr-field-type">({{ input.type }})</span>
    </span>

    <select
      v-if="input.type === 'bool'"
      v-model="model"
      class="cr-input"
    >
      <option value="false">false</option>
      <option value="true">true</option>
    </select>

    <EvmAddressInput
      v-else-if="input.type === 'address'"
      v-model="model"
      class="cr-input"
    />

    <textarea
      v-else-if="input.type.endsWith('[]')"
      v-model="model"
      class="cr-input"
      placeholder="JSON array or comma-separated values"
      rows="3"
      spellcheck="false"
      autocomplete="off"
    />

    <input
      v-else
      v-model="model"
      class="cr-input"
      :placeholder="input.type"
      spellcheck="false"
      autocomplete="off"
    />

    <small
      v-if="description && input.type !== 'bool'"
      class="cr-input-help cr-muted"
    >
      <InlineMarkdown :text="description" />
    </small>

    <small
      v-if="error"
      class="cr-input-help cr-error"
    >
      {{ error }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ContractFunctionParam } from '../../types/contract'
import type { ParamMeta } from '../../types/metadata'

const props = defineProps<{
  input: ContractFunctionParam
  meta?: ParamMeta
  error?: string | null
}>()

const model = defineModel<string>({ default: '' })

const label = computed(() => props.meta?.label || props.input.label)
const description = computed(
  () => props.meta?.description || props.input.description,
)
</script>
