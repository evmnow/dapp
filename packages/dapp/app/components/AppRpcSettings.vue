<template>
  <section class="rpc-settings">
    <label>
      <span>Reader RPC</span>
      <input
        v-model="rpc"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://rpc.example.org"
      />
    </label>

    <label>
      <span>Chain ID</span>
      <input
        v-model="chainId"
        :aria-invalid="chainIdInvalid"
        inputmode="numeric"
        autocomplete="off"
        pattern="[0-9]*"
        placeholder="1"
      />
    </label>

    <p
      v-if="chainIdInvalid"
      class="error"
    >
      Enter a positive integer chain ID.
    </p>
  </section>
</template>

<script setup lang="ts">
const rpc = defineModel<string>({ required: true })
const chainId = defineModel<string>('chainId', { required: true })

const chainIdInvalid = computed(() => {
  const value = chainId.value.trim()
  return Boolean(value && !/^[1-9]\d*$/.test(value))
})
</script>

<style scoped>
@layer components {
  .rpc-settings {
    display: grid;
    gap: var(--size-3);

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

    p {
      margin: 0;
      color: var(--muted);
      font-size: var(--font-sm);
      line-height: var(--line-height-lg);

      &.error {
        color: var(--error);
      }
    }
  }
}
</style>
