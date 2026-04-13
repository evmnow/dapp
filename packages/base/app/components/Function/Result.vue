<template>
  <div class="cr-result cr-panel">
    <div class="cr-result-header">
      <span class="cr-result-label">{{ label }}</span>
      <CopyButton
        v-if="value"
        :text="value"
      />
    </div>
    <div
      v-if="isError"
      class="cr-result-error"
    >
      {{ value }}
    </div>
    <template v-else>
      <div
        class="cr-result-value"
        :class="{ 'cr-result-truncated': isLong && !expanded }"
      >
        <a
          v-if="addressHref"
          :href="addressHref"
          class="cr-result-address"
        >
          <slot
            name="address"
            :address="value"
            :value="value"
            :href="addressHref"
          >
            {{ value }}
          </slot>
        </a>
        <slot
          v-else-if="isAddress"
          name="address"
          :address="value"
          :value="value"
          :href="null"
        >
          {{ value }}
        </slot>
        <template v-else>
          {{ value }}
        </template>
      </div>
      <button
        v-if="isLong"
        class="cr-button cr-result-toggle"
        type="button"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'show less' : 'show more' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { isAddress as checkAddress } from 'viem'

const props = defineProps<{
  label: string
  value: string
  isError?: boolean
  addressHref?: (address: string) => string | undefined | null
}>()

const expanded = ref(false)
const threshold = 200

const isAddress = computed(() => checkAddress(props.value))
const addressHref = computed(() =>
  isAddress.value ? (props.addressHref?.(props.value) ?? null) : null,
)
const isLong = computed(
  () => !props.isError && !addressHref.value && props.value.length > threshold,
)

watch(
  () => props.value,
  () => {
    expanded.value = false
  },
)
</script>
