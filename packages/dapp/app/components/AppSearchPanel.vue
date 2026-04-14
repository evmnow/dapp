<template>
  <section class="search-panel">
    <form @submit.prevent="openContract">
      <FormGroup>
        <FormInputGroup>
          <input
            v-model="addressOrEns"
            placeholder="controller.ens.eth or 0x..."
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
      </FormGroup>
      <aside>
        <h1>Smart Contract Reader</h1>
        <p class="muted">
          This is a streamlined open source version of the full block explorer
          experience at <a href="https://evm.now">evm.now</a>. We believe EVM
          contracts deserve a simple, open source UI that enables users to use
          contracts permissionlessly. That's why we're working on a
          <a
            href="https://github.com/evmnow/contract-metadata/"
            target="_blank"
            rel="noopener"
            >standard</a
          >
          and
          <a
            href="https://github.com/evmnow/sdk"
            target="_blank"
            rel="noopener"
            >sdk</a
          >
          to power better UX for interacting with smart contracts.
        </p>
      </aside>
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
    }

    aside {
      padding-inline: var(--size-1);

      a {
        color: var(--primary);
        text-decoration: underline;
        text-underline-offset: 0.2em;

        &:hover {
          text-decoration: none;
        }
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
