<template>
  <AppPage content-class="settings-page">
    <header>
      <h1 class="page-title">Settings</h1>
      <p class="page-copy">
        The Reader RPC and chain ID are stored locally in this browser and used
        before the connected wallet provider.
      </p>
    </header>

    <Alert
      v-if="rpcOverride"
      type="info"
    >
      <p>
        This session uses an RPC override from the URL (<code
          >ds-rpc-{{ rpcOverride.chainId }}</code
        >): <code>{{ rpcOverride.rpc }}</code
        >. It takes priority over the settings below and is not stored.
      </p>
    </Alert>

    <AppRpcSettings
      v-model="rpc"
      v-model:chain-id="chainId"
    />
  </AppPage>
</template>

<script setup lang="ts">
const { chainId, rpc, rpcOverride } = useReaderRpc()

useHead({ title: 'Settings' })
</script>

<style scoped>
@layer components {
  header {
    display: grid;
  }
}
</style>
