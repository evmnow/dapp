<template>
  <ClientOnly>
    <EvmTransactionFlowDialog
      v-if="props.request"
      :chain="props.chain"
      :request="props.request"
      :keep-open="true"
    >
      <template #start="{ start, open }">
        <button
          :class="['cr-button cr-button-primary', props.buttonClass]"
          type="button"
          :disabled="props.disabled || open"
          @click="start"
        >
          {{ open ? props.busyLabel : props.label }}
        </button>
      </template>
    </EvmTransactionFlowDialog>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { Hash } from 'viem'

const props = withDefaults(
  defineProps<{
    request: () => Promise<Hash>
    chain?: string | number
    label?: string
    busyLabel?: string
    disabled?: boolean
    buttonClass?: string
  }>(),
  {
    label: 'send',
    busyLabel: 'sending...',
    disabled: false,
  },
)
</script>
