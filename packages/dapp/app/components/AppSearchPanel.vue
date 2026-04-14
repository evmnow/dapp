<template>
  <section class="search-panel">
    <header>
      <h1 class="page-title">Contract Reader</h1>
      <p class="page-copy">Search the worldcomputer.</p>
    </header>

    <form @submit.prevent="openContract">
      <label>
        <span>Address or ENS</span>
        <input
          v-model="addressOrEns"
          placeholder="uniswap.eth or 0x..."
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      <Button
        type="submit"
        class="primary"
      >
        Search
      </Button>
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
      display: grid;
      grid-template-columns: repeat(
        auto-fit,
        minmax(min(100%, calc(var(--form-width) - var(--size-7))), 1fr)
      );
      gap: var(--size-3);
      align-items: end;
      max-inline-size: calc(var(--content-width-sm) + var(--size-8));

      label {
        display: grid;
        gap: var(--size-2);

        span {
          color: var(--muted);
          font-size: var(--font-xs);
          font-weight: 700;
          text-transform: uppercase;
        }

        input {
          inline-size: 100%;
        }
      }

      button {
        inline-size: fit-content;
      }
    }
  }
}
</style>
