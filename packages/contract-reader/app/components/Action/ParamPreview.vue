<template>
  <div
    v-if="imageUrl || resolving"
    class="cr-param-preview"
  >
    <div
      v-if="resolving"
      class="cr-param-preview-loading"
    />
    <img
      v-else-if="imageUrl"
      :src="imageUrl"
      alt="parameter preview"
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Abi } from 'viem'
import { numberToHex } from 'viem'
import type { ContractReadFn, MetadataResolveFn } from '../../types/actions'

/**
 * Live preview for a parameter with `preview.image` metadata (the standard's
 * "Parameter Previews"): a URI template whose `{param}` placeholders are
 * filled from the current inputs. Supports CAIP-19 asset references
 * (`eip155:<chain>/erc721:<contract>/<tokenId>`) by reading the token URI
 * on-chain, plus direct image URIs (ipfs/ar/http via `useResolvedUrl`).
 */
const props = defineProps<{
  /** The `preview.image` URI template. */
  template: string
  /** Current input value for a placeholder key (ABI name or `_N`). */
  getArg: (key: string) => unknown
  readFunction?: ContractReadFn
  resolveMetadata?: MetadataResolveFn
}>()

const resolving = ref(false)
const resolvedImage = ref<string | null>(null)

const CAIP19_PATTERN =
  /^eip155:\d+\/(erc721|erc1155):(0x[0-9a-fA-F]{40})\/(.+)$/

const TOKEN_URI_ABI = [
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'uri',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
] as const satisfies Abi

// Fill `{param}` placeholders from the current args; null while any
// placeholder is still unfilled.
const filledTemplate = computed<string | null>(() => {
  let complete = true
  const filled = props.template.replace(/\{([\w$]+)\}/g, (_, name: string) => {
    const value = props.getArg(name)
    if (value === undefined || value === '') {
      complete = false
      return ''
    }
    return String(value)
  })
  return complete ? filled : null
})

// Debounced by hand (no VueUse dependency): trailing edge at 400ms.
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(
  filledTemplate,
  (uri) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void resolvePreview(uri), 400)
  },
  { immediate: true },
)

async function resolvePreview(uri: string | null) {
  resolvedImage.value = null
  if (!uri) {
    resolving.value = false
    return
  }

  resolving.value = true
  try {
    const caip = CAIP19_PATTERN.exec(uri)
    const imageUri = caip
      ? await resolveCaip19Image(caip[1]!, caip[2]!, caip[3]!)
      : uri
    // Drop the result if the inputs changed while resolving.
    if (filledTemplate.value !== uri) return
    resolvedImage.value = imageUri
  } catch {
    resolvedImage.value = null
  } finally {
    if (filledTemplate.value === uri) resolving.value = false
  }
}

async function resolveCaip19Image(
  standard: string,
  contract: string,
  tokenId: string,
): Promise<string | null> {
  const reader = props.readFunction
  if (!reader) return null

  const functionName = standard === 'erc1155' ? 'uri' : 'tokenURI'
  let tokenUri = String(
    await reader({
      address: contract,
      abi: TOKEN_URI_ABI as unknown as Abi,
      functionName,
      args: [tokenId],
    }),
  )
  // ERC-1155 URI templates embed the token id as 64 hex chars.
  if (tokenUri.includes('{id}')) {
    tokenUri = tokenUri.replace(
      '{id}',
      numberToHex(BigInt(tokenId), { size: 32 }).slice(2),
    )
  }
  const resolved = await props.resolveMetadata?.(tokenUri)
  return resolved?.metadata?.image ?? null
}

// Gateway-resolve ipfs:// and ar:// for the <img> src.
const imageUrl = useResolvedUrl(() => resolvedImage.value ?? undefined)
</script>
