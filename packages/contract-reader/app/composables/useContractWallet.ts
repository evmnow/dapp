import { getConnectorClient, getPublicClient } from '@wagmi/core'
import {
  createPublicClient,
  http,
  parseEther,
  type Address,
  type Abi,
  type PublicClient,
} from 'viem'
import { readContract as readContractAction } from 'viem/actions'
import type { ContractReadParams } from '@evm-now/base/types/actions'

const PROVIDER_RPC_URL = 'evm-now:provider-rpc'

interface JsonRpcRequest {
  id?: string | number | null
  method?: string
  params?: unknown
}

export interface ContractWriteParams {
  address: string
  abi: Abi
  functionName: string
  args?: unknown[]
  value?: bigint | number | string
  chainId?: number
}

function buildRpcChain(chainId: number, rpcUrl: string) {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  } as const
}

function normalizeWriteValue(
  value: bigint | number | string | undefined,
): bigint | undefined {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return trimmed.includes('.')
      ? parseEther(trimmed as `${number}`)
      : BigInt(trimmed)
  }

  return undefined
}

function jsonRpcResponse(
  body: JsonRpcRequest,
  payload: Record<string, unknown>,
) {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: body.id ?? null,
      ...payload,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

async function parseJsonRpcRequest(
  init?: RequestInit,
): Promise<JsonRpcRequest> {
  if (typeof init?.body === 'string') {
    return JSON.parse(init.body) as JsonRpcRequest
  }

  throw new Error('Unsupported provider RPC request body')
}

async function requestClient(
  client: PublicClient,
  method: string,
  params: unknown,
) {
  return (
    client as unknown as {
      request(args: { method: string; params?: unknown }): Promise<unknown>
    }
  ).request({
    method,
    ...(Array.isArray(params) ? { params } : params ? { params } : {}),
  })
}

export function useContractWallet(
  options: {
    chainId?: MaybeRefOrGetter<number>
    rpc?: MaybeRefOrGetter<string>
  } = {},
) {
  const runtimeConfig = useRuntimeConfig()
  const config = useConfig()
  const connection = useConnection()
  const { writeContractAsync } = useWriteContract()

  const configuredChainId = computed(() => {
    const raw = options.chainId
      ? Number(toValue(options.chainId))
      : Number(runtimeConfig.public.defaultChainId ?? 1)
    return Number.isFinite(raw) && raw > 0 ? raw : 1
  })

  const customRpc = computed(() => {
    return (options.rpc ? toValue(options.rpc) : '').trim()
  })

  const walletProviderReady = computed(() => {
    return Boolean(connection.isConnected.value && connection.connector.value)
  })

  const publicRpcAvailable = computed(() => {
    return Boolean(publicClient.value)
  })

  const walletChainId = computed(() => {
    const raw = connection.chainId.value
    return typeof raw === 'number' && raw > 0 ? raw : undefined
  })

  const activeChainId = computed(() => {
    return customRpc.value
      ? configuredChainId.value
      : (walletChainId.value ?? configuredChainId.value)
  })

  const publicClient = computed<PublicClient | null>(() => {
    if (customRpc.value) return null
    return (
      (getPublicClient(config, {
        chainId: activeChainId.value,
      }) as PublicClient | undefined) ?? null
    )
  })

  const metadataOptions = computed(() => {
    return {
      chainId: customRpc.value ? configuredChainId.value : activeChainId.value,
      rpc:
        customRpc.value ||
        (walletProviderReady.value ? PROVIDER_RPC_URL : undefined),
    }
  })

  async function resolveClient() {
    if (customRpc.value) {
      return createPublicClient({
        chain: buildRpcChain(activeChainId.value, customRpc.value),
        transport: http(customRpc.value),
      }) as PublicClient
    }

    if (walletProviderReady.value) {
      const connector = connection.connector.value

      if (connector) {
        return (await getConnectorClient(config, {
          chainId: activeChainId.value,
          connector,
        })) as unknown as PublicClient
      }
    }

    return publicClient.value
  }

  const metadataFetch: typeof fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url

    if (url !== PROVIDER_RPC_URL) {
      return fetch(input, init)
    }

    const body = await parseJsonRpcRequest(init)

    if (!body.method) {
      return jsonRpcResponse(body, {
        error: { code: -32600, message: 'Invalid JSON-RPC request' },
      })
    }

    const client = await resolveClient()

    if (!client) {
      return jsonRpcResponse(body, {
        error: { code: -32000, message: 'Connect a wallet or set an RPC URL' },
      })
    }

    try {
      const result = await requestClient(client, body.method, body.params)
      return jsonRpcResponse(body, { result })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      return jsonRpcResponse(body, {
        error: { code: -32000, message },
      })
    }
  }

  async function readContractFunction(params: ContractReadParams) {
    const client = await resolveClient()

    if (!client) {
      throw new Error(
        'Set an RPC URL or connect a wallet before reading this contract.',
      )
    }

    return readContractAction(client, {
      address: params.address as Address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
    })
  }

  async function writeContractFunction(params: ContractWriteParams) {
    if (!connection.isConnected.value) {
      throw new Error('Connect a wallet before sending contract writes.')
    }

    return writeContractAsync({
      address: params.address as Address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args ?? [],
      chainId: params.chainId ?? activeChainId.value,
      ...(params.value !== undefined
        ? { value: normalizeWriteValue(params.value) }
        : {}),
    })
  }

  return {
    connection,
    walletConnected: computed(() => Boolean(connection.isConnected.value)),
    walletProviderReady,
    publicRpcAvailable,
    walletAddress: computed(
      () => connection.address.value as Address | undefined,
    ),
    walletChainId,
    chainId: activeChainId,
    rpc: customRpc,
    publicClient,
    metadataOptions,
    metadataFetch,
    readContractFunction,
    writeContractFunction,
  }
}
