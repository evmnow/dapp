<template>
  <AppPage content-class="settings-page">
    <div class="settings-intro">
      <h1 class="page-title">Settings</h1>
      <p class="page-copy">
        The Reader RPC and chain ID are stored locally in this browser and used
        before the connected wallet provider.
      </p>
    </div>

    <AppRpcSettings
      v-model="rpc"
      v-model:chain-id="chainId"
    />
  </AppPage>
</template>

<script setup lang="ts">
const { chainId, rpc } = useReaderRpc()
</script>
