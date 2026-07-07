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

    <Alert
      v-if="testStatus === 'success'"
      type="info"
      dismissable
    >
      <p>
        RPC connection successful! Connected to chain ID {{ testResult?.chainId }}.
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
        @click="testRpcConnection"
      >
        {{ testing ? 'Testing...' : 'Test RPC Connection' }}
      </Button>
    </Actions>
  </AppPage>
</template>

<script setup lang="ts">
const { chainId, rpc, rpcOverride } = useReaderRpc()

const testing = ref(false)
const testStatus = ref<'idle' | 'success' | 'error'>('idle')
const testResult = ref<{ chainId: string } | null>(null)
const testError = ref('')

async function testRpcConnection() {
  if (!rpc.value) return

  testing.value = true
  testStatus.value = 'idle'
  testError.value = ''
  testResult.value = null

  try {
    const response = await fetch(rpc.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message || 'RPC request failed')
    }

    const returnedChainId = parseInt(data.result, 16)
    testResult.value = { chainId: returnedChainId.toString() }

    const configuredChainId =
      chainId.value != null ? parseInt(String(chainId.value), 10) : null

    if (
      configuredChainId != null &&
      !Number.isNaN(configuredChainId) &&
      returnedChainId !== configuredChainId
    ) {
      testError.value = `Warning: RPC returned chain ID ${returnedChainId}, but settings specify chain ID ${chainId.value}`
      testStatus.value = 'error'
    } else {
      testStatus.value = 'success'
    }
  } catch (err) {
    testStatus.value = 'error'
    testError.value = err instanceof Error ? err.message : 'Failed to connect to RPC endpoint'
  } finally {
    testing.value = false
  }
}

useHead({ title: 'Settings' })
</script>

<style scoped>
@layer components {
  header {
    display: grid;
  }
}
</style>
