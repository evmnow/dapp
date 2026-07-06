<template>
  <!-- Always-mounted live region so screen readers announce read
       completions and errors; display: contents keeps the action
       detail grid in charge of spacing. -->
  <div
    class="cr-action-results"
    role="status"
    aria-live="polite"
  >
    <ActionResult
      v-if="autoRead && (pending || !hasResult)"
      label="result"
      value="loading..."
      :address-href="addressHref"
    />

    <template v-else-if="autoRead || result !== null">
      <ActionResultFields
        v-if="hasResultFields"
        :result="result"
        :outputs="outputs"
        :returns-meta="returnsMeta"
        :address-href="addressHref"
        :token-info="tokenInfo"
        :contract-address="contractAddress"
      >
        <template #address="slotProps">
          <slot
            name="address"
            v-bind="slotProps"
          >
            {{ slotProps.value }}
          </slot>
        </template>
      </ActionResultFields>

      <ActionResult
        v-else
        label="result"
        :value="formatValue(result)"
        :address-href="addressHref"
      >
        <template #address="slotProps">
          <slot
            name="address"
            v-bind="slotProps"
          >
            {{ slotProps.value }}
          </slot>
        </template>
      </ActionResult>
    </template>

    <ActionResult
      v-if="error"
      label="error"
      :value="error"
      is-error
    />
  </div>
</template>

<script setup lang="ts">
import type { ContractActionParam } from '../../types/contract'
import type { ParamMeta } from '../../types/metadata'
import type { TokenInfo } from '../../utils/format'
import ActionResult from './Result.vue'
import ActionResultFields from './ResultFields.vue'

defineProps<{
  /** Read state — while pending (or before the first auto-read result). */
  pending: boolean
  hasResult: boolean
  /** Zero-input reads render a loading placeholder instead of nothing. */
  autoRead: boolean
  result: unknown
  error: string
  outputs: ContractActionParam[]
  returnsMeta?: Record<string, ParamMeta>
  /** Multi-output results render per-field rows instead of a single value. */
  hasResultFields: boolean
  addressHref?: (address: string) => string | undefined | null
  tokenInfo?: Record<string, TokenInfo>
  contractAddress?: string
  formatValue: (value: unknown) => string
}>()

defineSlots<{
  address?: (props: {
    address: string
    value: string
    href: string | null
  }) => unknown
}>()
</script>

<style>
/* The result live region must not affect the action detail grid: its
   children stay direct grid items via display: contents, and their margins
   are neutralized like every other detail block (see assets/css/action.css —
   the grid's `> *` margin reset no longer reaches through the wrapper). */
.cr-action-results {
  display: contents;
}

.cr-action-results > * {
  margin-block: 0 !important;
}
</style>
