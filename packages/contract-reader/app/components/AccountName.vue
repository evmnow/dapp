<template>
  <span class="account-name">
    <span v-if="name">{{ name }}</span>
    <EvmAccount
      v-else
      :address="address"
    />
  </span>
</template>

<script setup lang="ts">
import type { Address } from 'viem'

const props = defineProps<{
  address?: Address
}>()

const { name } = useEthereumName(() => props.address)
</script>
