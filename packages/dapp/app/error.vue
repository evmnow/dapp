<template>
  <div>
    <AppPage>
      <section class="error-panel">
        <h1>{{ heading }}</h1>

        <p class="error-message">{{ message }}</p>

        <Actions>
          <Button
            class="primary"
            @click="goHome"
          >
            Back to home
          </Button>
        </Actions>
      </section>
    </AppPage>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

// App-level error page: rendered with the regular app chrome (header,
// wallet, footer) so users always have a way back. The app deploys as a
// static SPA (ssr:false, IPFS), so this renders entirely client-side from
// the generated bundle — no server error routes involved.
const props = defineProps<{
  error: NuxtError
}>()

const heading = computed(() =>
  props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong',
)

const message = computed(() => {
  if (props.error.statusCode === 404) {
    return 'The page you are looking for does not exist.'
  }
  return props.error.statusMessage || props.error.message || 'Unexpected error.'
})

function goHome() {
  clearError({ redirect: '/' })
}

useHead({ title: heading })
</script>

<style scoped>
.error-panel {
  display: grid;
  gap: var(--size-4);
  justify-items: start;
  align-content: start;
  padding-block: var(--size-7);
}

.error-message {
  color: var(--muted);
  overflow-wrap: anywhere;
}
</style>
