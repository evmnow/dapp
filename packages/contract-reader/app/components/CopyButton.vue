<template>
  <button
    class="cr-copy"
    type="button"
    :title="copied ? 'copied' : title"
    :aria-label="copied ? 'copied' : label"
    @click="copy"
  >
    <Icon
      class="cr-copy-icon"
      :name="copied ? 'lucide:check' : 'lucide:copy'"
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
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(props.text)
  copied.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1200)
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>
