import { ref } from 'vue'

export function useRpcTester() {
  const testing = ref(false)
  const testStatus = ref<'idle' | 'success' | 'error'>('idle')
  const testResult = ref<{ chainId: string } | null>(null)
  const testError = ref('')

  async function testRpcConnection(rpc: string | null | undefined, chainId?: string | number | null) {
    if (!rpc) return

    testing.value = true
    testStatus.value = 'idle'
    testError.value = ''
    testResult.value = null

    try {
      const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      if (data.error) throw new Error(data.error.message || 'RPC request failed')

      const returnedChainId = parseInt(data.result, 16)
      testResult.value = { chainId: returnedChainId.toString() }

      const configuredChainId = chainId != null ? parseInt(String(chainId), 10) : null

      if (configuredChainId != null && !Number.isNaN(configuredChainId) && returnedChainId !== configuredChainId) {
        testError.value = `Warning: RPC returned chain ID ${returnedChainId}, but settings specify chain ID ${chainId}`
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

  return { testing, testStatus, testResult, testError, testRpcConnection }
}
