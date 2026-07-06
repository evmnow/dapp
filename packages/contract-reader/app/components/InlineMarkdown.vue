<template>
  <!-- renderInlineMarkdown HTML-escapes its input before formatting and only
       links http(s) URLs, so this markup never carries raw metadata HTML. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span v-html="html" />
</template>

<script setup lang="ts">
import { renderInlineMarkdown } from '../utils/markdown'

const props = defineProps<{
  text: string
}>()

const html = computed(() => renderInlineMarkdown(props.text))
</script>
