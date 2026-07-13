<template>
  <div class="rpc-tester">
    <Alert
      v-if="testStatus === 'success'"
      type="info"
      dismissable
    >
      <p>
        RPC connection successful! Connected to chain ID
        {{ testResult?.chainId }}.
      </p>
    </Alert>

    <Alert
      v-if="testStatus === 'error'"
      type="error"
      dismissable
    >
      <p>{{ testError }}</p>
    </Alert>

    <Actions>
      <Button
        class="tertiary small"
        :disabled="!rpc || testing"
        @click="onTest"
      >
        {{ testing ? 'Testing...' : label || 'Test RPC Connection' }}
      </Button>
    </Actions>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  rpc?: string | null
  chainId?: string | number | null
  label?: string
}>()
const { rpc, chainId, label } = toRefs(props)

const { testing, testStatus, testResult, testError, testRpcConnection } =
  useRpcTester()

function onTest() {
  void testRpcConnection(rpc.value, chainId.value)
}
</script>

<style scoped>
@layer components {
  .rpc-tester {
    display: grid;
    gap: var(--size-3);
  }
}
</style>
