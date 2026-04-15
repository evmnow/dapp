<template>
  <span class="account-name">
    <EvmAccount
      :address="address"
      resolve-ens
    />
  </span>
</template>

<script setup lang="ts">
import type { Address } from 'viem'

defineProps<{
  address?: Address
}>()
</script>
