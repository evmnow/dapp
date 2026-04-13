<template>
  <div class="rpc-settings">
    <label class="rpc-settings__field">
      <span class="rpc-settings__label">Reader RPC</span>
      <input
        v-model="rpc"
        class="rpc-settings__input"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://rpc.example.org"
      />
    </label>

    <label class="rpc-settings__field">
      <span class="rpc-settings__label">Chain ID</span>
      <input
        v-model="chainId"
        class="rpc-settings__input"
        :aria-invalid="chainIdInvalid"
        inputmode="numeric"
        autocomplete="off"
        pattern="[0-9]*"
        placeholder="1"
      />
    </label>

    <p
      v-if="chainIdInvalid"
      class="rpc-settings__help rpc-settings__help--error"
    >
      Enter a positive integer chain ID.
    </p>
  </div>
</template>

<script setup lang="ts">
const rpc = defineModel<string>({ required: true })
const chainId = defineModel<string>('chainId', { required: true })

const chainIdInvalid = computed(() => {
  const value = chainId.value.trim()
  return Boolean(value && !/^[1-9]\d*$/.test(value))
})
</script>
