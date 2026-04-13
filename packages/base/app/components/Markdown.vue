<template>
  <div
    class="cr-markdown"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  text: string
}>()

const html = computed(() => renderMarkdown(props.text))
</script>
