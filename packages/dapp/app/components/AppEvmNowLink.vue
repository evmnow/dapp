<template>
  <Button
    v-if="href"
    :to="href"
    target="_blank"
    class="wallet-button evmnow-link-button"
    aria-label="Open on evm.now"
    title="Open on evm.now"
  >
    <Icon
      name="lucide:external-link"
      aria-hidden="true"
    />
    <span>evm.now</span>
  </Button>
</template>

<script setup lang="ts">
import type { ContractView } from '~/types/view'

const EVMNOW_ORIGIN = 'https://evm.now'

const VIEW_SEGMENT: Record<ContractView, string> = {
  overview: '',
  read: '/read',
  interact: '/interact',
  code: '/code',
}

const { state } = useReaderQueryState()

const href = computed(() => {
  const address = state.value.address?.trim()
  if (!address) return ''

  const view = state.value.view
  const path = `/address/${address}${VIEW_SEGMENT[view]}`
  const fragment =
    (view === 'read' || view === 'interact') && state.value.fn
      ? `#${functionNameFromSlug(state.value.fn)}`
      : ''

  return `${EVMNOW_ORIGIN}${path}${fragment}`
})

function functionNameFromSlug(slug: string) {
  const dash = slug.indexOf('-')
  return dash === -1 ? slug : slug.slice(0, dash)
}
</script>

<style scoped>
@layer components {
  .evmnow-link-button {
    gap: var(--size-1);

    .iconify {
      inline-size: var(--size-4);
      block-size: var(--size-4);
    }

    @media (max-width: 768px) {
      span {
        display: none;
      }
    }
  }
}
</style>
