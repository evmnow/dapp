import type { PublicClient } from 'viem'

export const PROVIDER_RPC_URL = 'evm-now:provider-rpc'

interface JsonRpcRequest {
  id?: string | number | null
  method?: string
  params?: unknown
}

type ResolveClient = () => Promise<PublicClient | null>

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

function fetchUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

export function createProviderRpcFetch(
  resolveClient: ResolveClient,
): typeof fetch {
  return async (input, init) => {
    if (fetchUrl(input) !== PROVIDER_RPC_URL) {
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
}
