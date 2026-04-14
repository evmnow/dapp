<template>
  <div
    class="cr-result cr-panel"
    data-cr-result
  >
    <div
      class="cr-result-header"
      data-cr-result-header
    >
      <span
        class="cr-result-label"
        data-cr-result-label
      >
        {{ label }}
      </span>
      <CopyButton
        v-if="value"
        :text="value"
      />
    </div>
    <div
      v-if="isError"
      class="cr-result-error"
      data-cr-result-error
    >
      {{ value }}
    </div>
    <template v-else>
      <div
        class="cr-result-value"
        :class="{ 'cr-result-truncated': isLong && !expanded }"
        data-cr-result-value
      >
        <a
          v-if="addressHref"
          :href="addressHref"
          class="cr-result-address"
          data-cr-result-address
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
        class="unstyled"
        type="button"
        data-cr-result-toggle
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

<style scoped>
@layer components {
  .cr-result button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: fit-content;
    block-size: auto;
    min-block-size: 0;
    margin-block-start: var(--size-2);
    padding: var(--size-1);
    border: var(--border-width) solid var(--cr-border);
    border-radius: var(--cr-radius);
    background: var(--cr-surface);
    color: var(--cr-text);
    cursor: pointer;
    font: inherit;
    font-size: var(--font-xs);
    line-height: var(--line-height-sm);
  }
}
</style>
