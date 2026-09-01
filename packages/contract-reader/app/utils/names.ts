import {
  createEthereumNames,
  type EthereumNames,
  type ResolvedName,
} from '@1001-digital/ethereum-names'
import { isAddress, type PublicClient } from 'viem'

export type EthereumNameLookupClient = Pick<
  EthereumNames,
  'lookup' | 'resolve' | 'reverse' | 'system'
>

export function createEthereumNameClient(
  options: {
    client?: PublicClient
    rpcUrl?: string
  } = {},
): EthereumNames {
  return createEthereumNames({
    ...(options.client ? { client: options.client } : {}),
    ...(options.rpcUrl ? { rpcUrl: options.rpcUrl } : {}),
  })
}

function lookupError(result: ResolvedName): Error {
  if (result.status === 'ambiguous') {
    return new Error(`Ethereum name "${result.input}" is ambiguous`)
  }
  if (result.status === 'error') {
    return new Error(`Could not query Ethereum name "${result.input}"`)
  }
  return new Error(`Could not resolve Ethereum name "${result.input}"`)
}

/** Resolve a dotted ENS/GNS/WNS identifier before passing it to the SDK. */
export async function resolveContractIdentifier(
  input: string,
  names: EthereumNameLookupClient,
): Promise<string> {
  const value = input.trim()
  if (
    !value ||
    isAddress(value) ||
    value.includes(':') ||
    !value.includes('.')
  ) {
    return value
  }

  const result = await names.lookup(value)
  if (result.status !== 'resolved' || !result.address) throw lookupError(result)
  return result.address
}
