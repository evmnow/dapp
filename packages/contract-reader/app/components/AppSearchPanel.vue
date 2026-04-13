<template>
  <section class="search-panel">
    <div class="search-intro">
      <h1 class="page-title">Contract Reader</h1>
      <p class="page-copy">Search the worldcomputer.</p>
    </div>

    <form
      class="search-form"
      @submit.prevent="openContract"
    >
      <label class="search-field">
        <span>Address or ENS</span>
        <input
          v-model="addressOrEns"
          placeholder="uniswap.eth or 0x..."
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      <button
        class="search-button"
        type="submit"
      >
        Search
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
const addressOrEns = ref('')

async function openContract() {
  const value = addressOrEns.value.trim()
  if (!value) return

  await navigateTo({
    path: '/',
    query: { address: value },
  })
}
</script>
