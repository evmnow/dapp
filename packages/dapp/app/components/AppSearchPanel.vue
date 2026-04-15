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
        <Tags class="examples">
          <span class="examples-label muted">Examples:</span>
          <NuxtLink
            v-for="example in examples"
            :key="example.address"
            :to="{ path: '/', query: { address: example.address } }"
          >
            <Tag small>{{ example.label }}</Tag>
          </NuxtLink>
        </Tags>
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

const examples = [
  {
    label: 'WETH',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    label: 'CryptoPunks',
    address: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  },
  {
    label: 'ENS Registrar Controller',
    address: '0x59e16fccd424cc24e280be16e11bcd56fb0ce547',
  },
]

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
      display: grid;
      gap: var(--spacer-xs);
      padding-inline: var(--size-1);
      margin-block: var(--spacer);

      h1 {
        font-size: var(--font-sm);
      }

      p {
        font-size: var(--font-xs);
      }

      a {
        color: var(--primary);
        text-decoration: underline;
        text-underline-offset: 0.2em;

        &:hover {
          text-decoration: none;
        }
      }
    }

    .examples {
      align-items: center;
      padding-inline: var(--size-1);
      padding-block: var(--size-1);
      overflow-x: auto;
    }

    .examples-label {
      font-size: var(--font-xs);
    }

    @media (max-width: 768px) {
      button span {
        display: none;
      }
    }
  }
}
</style>
