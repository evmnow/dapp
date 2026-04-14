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
import type { ContractReadParams } from '@evmnow/contract-reader/types/actions'
import { createProviderRpcFetch, PROVIDER_RPC_URL } from '../utils/providerRpc'

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

  const metadataFetch = createProviderRpcFetch(resolveClient)

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
