<template>
  <button
    class="cr-copy"
    type="button"
    :title="copied ? 'copied' : failed ? 'copy failed' : title"
    :aria-label="copied ? 'copied' : failed ? 'copy failed' : label"
    @click="copy"
  >
    <Icon
      class="cr-copy-icon"
      :name="failed ? 'lucide:x' : copied ? 'lucide:check' : 'lucide:copy'"
      aria-hidden="true"
    />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text: string
    label?: string
    title?: string
  }>(),
  {
    label: 'copy',
    title: 'copy',
  },
)

const copied = ref(false)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    failed.value = false
  } catch {
    // Clipboard access can be denied (permissions policy, insecure context,
    // no user activation) — show a brief failed state instead of throwing.
    copied.value = false
    failed.value = true
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
    failed.value = false
  }, 1200)
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>
