<template>
  <NuxtLayout>
    <NuxtPage />
    <AppFooter />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  titleTemplate: (title) =>
    title
      ? `${title} | Contract Reader | evmnow.eth`
      : 'Contract Reader | evmnow.eth',
})
</script>
