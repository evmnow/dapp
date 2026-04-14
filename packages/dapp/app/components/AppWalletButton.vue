<template>
  <ClientOnly>
    <EvmConnectDialog
      v-if="!isConnected"
      class-name="wallet-button"
    >
      Connect
    </EvmConnectDialog>

    <EvmProfile
      v-else
      class-name="wallet-button"
    >
      <template #default="{ display }">
        {{ display }}
      </template>
    </EvmProfile>
  </ClientOnly>
</template>

<script setup lang="ts">
const { isConnected } = useConnection()
</script>
