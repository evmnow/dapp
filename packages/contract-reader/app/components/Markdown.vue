<template>
  <!-- renderMarkdown HTML-escapes its input before formatting and only links
       http(s) URLs, so this markup never carries raw metadata HTML. -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="cr-markdown"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<script setup lang="ts">
import { renderMarkdown } from '../utils/markdown'

const props = defineProps<{
  text: string
}>()

const html = computed(() => renderMarkdown(props.text))
</script>
