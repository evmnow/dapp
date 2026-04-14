<template>
  <section class="search-panel">
    <form @submit.prevent="openContract">
      <FormGroup>
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
        <p class="muted">Read and interact with smart contrats on Ethereum.</p>
      </FormGroup>
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
      max-inline-size: calc(var(--content-width-sm) - var(--size-10));
      width: 100%;
      margin-inline: auto;

      p {
        padding-inline: var(--size-3);
      }
    }

    @media (max-width: 768px) {
      button span {
        display: none;
      }
    }
  }
}
</style>
