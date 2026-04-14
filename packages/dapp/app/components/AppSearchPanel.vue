<template>
  <section class="search-panel">
    <header>
      <h1 class="page-title">Contract Reader</h1>
      <p class="page-copy">Search the worldcomputer.</p>
    </header>

    <form @submit.prevent="openContract">
      <FormInputGroup>
        <input
          v-model="addressOrEns"
          placeholder="uniswap.eth or 0x..."
          autocomplete="off"
          spellcheck="false"
        />
        <Button
          type="submit"
          class=""
        >
          <Icon
            name="lucide:search"
            aria-hidden="true"
          />
          <span>Search</span>
        </Button>
      </FormInputGroup>
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

<style scoped>
@layer components {
  .search-panel {
    display: grid;
    gap: var(--size-5);

    header {
      display: grid;
    }

    form {
      max-inline-size: calc(var(--content-width-sm) + var(--size-8));
    }

    @media (max-width: 768px) {
      button span {
        display: none;
      }
    }
  }
}
</style>
