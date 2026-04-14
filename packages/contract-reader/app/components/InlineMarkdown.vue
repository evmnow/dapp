<template>
  <span v-html="html" />
</template>

<script setup lang="ts">
import { renderInlineMarkdown } from '../utils/markdown'

const props = defineProps<{
  text: string
}>()

const html = computed(() => renderInlineMarkdown(props.text))
</script>
