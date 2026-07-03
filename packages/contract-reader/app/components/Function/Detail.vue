<template>
  <article class="cr-function-detail">
    <div
      v-if="fn.description"
      class="cr-function-description cr-muted"
    >
      <InlineMarkdown :text="fn.description" />
    </div>

    <div
      v-if="fn.warning"
      class="cr-warning"
    >
      {{ fn.warning }}
    </div>

    <slot
      name="intro"
      :fn="fn"
    />

    <slot
      name="examples"
      :fn="fn"
      :examples="examples"
      :apply-example="applyExample"
    >
      <div
        v-if="examples.length"
        class="cr-field"
      >
        <span class="cr-field-label">
          {{ labels.examples }}
        </span>
        <div class="cr-examples">
          <Button
            v-for="example in examples"
            :key="example.label"
            type="button"
            @click="applyExample(example)"
          >
            {{ example.label }}
          </Button>
        </div>
      </div>
    </slot>

    <form
      v-if="hasForm"
      class="cr-form"
      @submit.prevent="submit"
    >
      <template
        v-for="(input, index) in fn.inputs"
        :key="fieldKey(input, index)"
      >
        <slot
          name="field"
          :fn="fn"
          :input="input"
          :index="index"
          :field-key="fieldKey(input, index)"
          :value="inputValues[fieldKey(input, index)] ?? ''"
          :error="inputErrors[fieldKey(input, index)]"
          :update-value="
            (value) => setInputValue(fieldKey(input, index), value)
          "
        >
          <div
            v-if="isTuple(input)"
            class="cr-field"
          >
            <span class="cr-field-label">
              {{ input.label }}
              <span class="cr-field-type">({{ input.type }})</span>
            </span>

            <FunctionTupleInput
              :components="tupleComponents(input)"
              :prefix="fieldKey(input, index)"
              :values="inputValues"
              :errors="inputErrors"
            />

            <small
              v-if="input.description"
              class="cr-input-help cr-muted"
            >
              <InlineMarkdown :text="input.description" />
            </small>
          </div>

          <FunctionInput
            v-else
            :input="input"
            :meta="input.meta"
            :amount="amountMeta(input)"
            :error="inputErrors[fieldKey(input, index)]"
            v-model="inputValues[fieldKey(input, index)]"
          />
        </slot>
      </template>

      <label
        v-if="fn.isPayable"
        class="cr-field cr-value-field"
      >
        <span class="cr-field-label">
          value
          <span class="cr-field-type">(ETH)</span>
        </span>

        <input
          v-model="txValue"
          class="cr-input"
          inputmode="decimal"
          placeholder="0"
          spellcheck="false"
          autocomplete="off"
        />
      </label>

      <slot
        name="actions"
        :fn="fn"
        :pending="pending"
        :has-errors="hasErrors"
        :auto-read="autoRead"
        :read="read"
        :submit="submit"
        :write-request="writeRequest"
        :write-hint="writeHint"
        :labels="labels"
        :wallet-connected="walletConnected"
      >
        <Button
          v-if="fn.isRead && fn.inputs.length"
          class="primary cr-function-action"
          type="submit"
          :disabled="pending || !readFunction || hasErrors"
        >
          {{ pending ? labels.reading : labels.read }}
        </Button>

        <TransactionButton
          v-else-if="writeRequest && walletConnected"
          :request="writeRequest"
          :chain="chainId"
          :label="labels.send"
          :busy-label="labels.sending"
          button-class="cr-function-action"
          :disabled="hasErrors"
        />

        <p
          v-else-if="!fn.isRead"
          class="cr-hint cr-muted"
        >
          {{ writeHint }}
        </p>
      </slot>
    </form>

    <slot
      name="result"
      :pending="pending"
      :result="result"
      :error="error"
      :fn="fn"
      :outputs="fn.outputs"
      :has-result-fields="hasResultFields"
      :address-href="addressHref"
      :format-value="formatValue"
    >
      <slot
        name="result-preview"
        :pending="pending"
        :result="result"
        :error="error"
        :fn="fn"
        :outputs="fn.outputs"
        :has-result-fields="hasResultFields"
        :address-href="addressHref"
        :format-value="formatValue"
      >
        <template v-if="autoRead">
          <FunctionResult
            v-if="pending || !hasResult"
            label="result"
            value="loading..."
            :address-href="addressHref"
          >
            <template #address="slotProps">
              <slot
                name="address"
                v-bind="slotProps"
              >
                {{ slotProps.value }}
              </slot>
            </template>
          </FunctionResult>

          <FunctionResultFields
            v-else-if="hasResultFields"
            :result="result"
            :outputs="fn.outputs"
            :returns-meta="fn.meta?.returns"
            :address-href="addressHref"
            :token-info="tokenMeta"
            :contract-address="address"
          >
            <template #address="slotProps">
              <slot
                name="address"
                v-bind="slotProps"
              >
                {{ slotProps.value }}
              </slot>
            </template>
          </FunctionResultFields>

          <FunctionResult
            v-else
            label="result"
            :value="formatValue(result)"
            :address-href="addressHref"
          >
            <template #address="slotProps">
              <slot
                name="address"
                v-bind="slotProps"
              >
                {{ slotProps.value }}
              </slot>
            </template>
          </FunctionResult>
        </template>

        <template v-else-if="result !== null">
          <FunctionResultFields
            v-if="hasResultFields"
            :result="result"
            :outputs="fn.outputs"
            :returns-meta="fn.meta?.returns"
            :address-href="addressHref"
            :token-info="tokenMeta"
            :contract-address="address"
          >
            <template #address="slotProps">
              <slot
                name="address"
                v-bind="slotProps"
              >
                {{ slotProps.value }}
              </slot>
            </template>
          </FunctionResultFields>

          <FunctionResult
            v-else
            label="result"
            :value="formatValue(result)"
            :address-href="addressHref"
          >
            <template #address="slotProps">
              <slot
                name="address"
                v-bind="slotProps"
              >
                {{ slotProps.value }}
              </slot>
            </template>
          </FunctionResult>
        </template>

        <FunctionResult
          v-if="error"
          label="error"
          :value="error"
          is-error
        />
      </slot>
    </slot>

    <slot
      name="preview"
      :fn="fn"
      :result="result"
      :error="error"
      :artifact-result="artifactResult"
      :metadata="metadataPreview"
      :metadata-raw-json="metadataRawJson"
      :metadata-resolving="metadataResolving"
      :metadata-error="metadataError"
    >
      <FunctionArtifactPreview :value="artifactResult" />

      <FunctionMetadataPreview
        v-if="showMetadataPreview"
        :metadata="metadataPreview"
        :raw-json="metadataRawJson"
        :resolving="metadataResolving"
        :error="metadataError"
      />
    </slot>

    <slot
      name="source-link"
      :fn="fn"
      :source-route="sourceRoute"
      :label="labels.viewCode"
    >
      <div
        v-if="sourceRoute"
        class="cr-function-source"
      >
        <Button
          :to="sourceRoute"
          class="link cr-function-source-link"
        >
          {{ labels.viewCode }}
        </Button>
      </div>
    </slot>

    <slot
      name="footer"
      :fn="fn"
      :result="result"
      :error="error"
    />
  </article>
</template>

<script setup lang="ts">
import type { Abi, Hash } from 'viem'
import type { RouteLocationRaw } from 'vue-router'
import { parseEther } from 'viem'
import { resolveAmountDisplay, type ParamType } from '@evmnow/sdk'
import type {
  ContractFunction,
  ContractFunctionParam,
} from '../../types/contract'
import type { SemanticType } from '../../types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '../../types/actions'
import type { FunctionExample } from '../../types/metadata'
import { normalizeReadError } from '../../utils/errors'
import {
  applyInputExample,
  buildInputKey,
  buildInputArgs,
  buildInputErrors,
  hydrateInputValues,
  resolveEnsInputs,
  seedInputValues,
  serializeInputArgs,
  type ResolvedEnsAddresses,
} from '../../utils/inputs'
import FunctionInput from './Input.vue'
import FunctionArtifactPreview from './ArtifactPreview.client.vue'
import FunctionMetadataPreview from './MetadataPreview.client.vue'
import FunctionResult from './Result.vue'
import FunctionResultFields from './ResultFields.vue'
import FunctionTupleInput from './TupleInput.vue'
import {
  formatArgValue,
  formatSemanticValue,
  getOutputSemanticType,
  semanticAmountKind,
  tokenAddressOf,
  type AmountInputInfo,
  type TokenInfo,
} from '../../utils/format'
import { detectPreviewMarkupKind } from '../../utils/markup-preview'
import {
  isResolvableMetadataUri,
  type PreviewMetadata,
} from '../../utils/metadata-display'

defineSlots<{
  intro?: (props: { fn: ContractFunction }) => unknown
  examples?: (props: {
    fn: ContractFunction
    examples: FunctionExample[]
    applyExample: (example: FunctionExample) => void
  }) => unknown
  field?: (props: {
    fn: ContractFunction
    input: ContractFunction['inputs'][number]
    index: number
    fieldKey: string
    value: string
    error?: string | null
    updateValue: (value: string) => void
  }) => unknown
  actions?: (props: {
    fn: ContractFunction
    pending: boolean
    hasErrors: boolean
    autoRead: boolean
    read: () => Promise<void>
    submit: () => void
    writeRequest?: () => Promise<Hash>
    writeHint: string
    labels: FunctionDetailLabels
    walletConnected?: boolean
  }) => unknown
  result?: (props: {
    pending: boolean
    result: unknown
    error: string
    fn: ContractFunction
    outputs: ContractFunction['outputs']
    hasResultFields: boolean
    addressHref?: (address: string) => string | undefined | null
    formatValue: (value: unknown) => string
  }) => unknown
  'result-preview'?: (props: {
    pending: boolean
    result: unknown
    error: string
    fn: ContractFunction
    outputs: ContractFunction['outputs']
    hasResultFields: boolean
    addressHref?: (address: string) => string | undefined | null
    formatValue: (value: unknown) => string
  }) => unknown
  address?: (props: {
    address: string
    value: string
    href: string | null
  }) => unknown
  'source-link'?: (props: {
    fn: ContractFunction
    sourceRoute?: RouteLocationRaw
    label: string
  }) => unknown
  footer?: (props: {
    fn: ContractFunction
    result: unknown
    error: string
  }) => unknown
  preview?: (props: {
    fn: ContractFunction
    result: unknown
    error: string
    artifactResult: string | null
    metadata: PreviewMetadata | null
    metadataRawJson: Record<string, unknown> | null
    metadataResolving: boolean
    metadataError: string | null
  }) => unknown
}>()

const props = withDefaults(
  defineProps<{
    address: string
    abi: Abi
    chainId?: number
    fn: ContractFunction
    args?: string[]
    readFunction?: ContractReadFn
    writeFunction?: ContractWriteFn
    walletConnected?: boolean
    connectedAddress?: string
    addressHref?: (address: string) => string | undefined | null
    sourceRoute?: RouteLocationRaw
    resolveMetadata?: MetadataResolveFn
    labels?: Partial<FunctionDetailLabels>
    autoRead?: boolean
  }>(),
  {
    autoRead: true,
  },
)

const emit = defineEmits<{
  'update:args': [args: string[]]
  error: [error: unknown]
}>()

const { resolveAddress: resolveEnsAddress } = useEnsResolver()

const inputValues = reactive<Record<string, string>>({})
const inputErrors = computed(() =>
  buildInputErrors(
    props.fn.inputs,
    inputValues,
    props.fn.meta?.params,
    undefined,
    amountDecimals,
  ),
)
const hasErrors = computed(() =>
  Object.values(inputErrors.value).some((error) => !!error),
)
const txValue = ref('')
const result = ref<unknown>(null)
const error = ref('')
const pending = ref(false)
const hasResult = ref(false)
const metadataPreview = ref<PreviewMetadata | null>(null)
const metadataRawJson = ref<Record<string, unknown> | null>(null)
const metadataResolving = ref(false)
const metadataError = ref<string | null>(null)

const autoRead = computed(
  () =>
    props.autoRead !== false && props.fn.isRead && props.fn.inputs.length === 0,
)
const hasForm = computed(
  () => props.fn.inputs.length > 0 || props.fn.isPayable || !props.fn.isRead,
)
const hasResultFields = computed(() => props.fn.outputs.length > 1)

// ── Amount-like params (eth / gwei / amount / token-amount) ──
const ERC20_META_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi

// On-chain identity of token-amount tokens, resolved lazily via readFunction.
const tokenMeta = reactive<Record<string, TokenInfo>>({})
const tokenBalance = reactive<Record<string, bigint>>({})

function paramTokenAddress(type?: SemanticType): string | undefined {
  if (semanticAmountKind(type) !== 'token-amount') return undefined
  return (tokenAddressOf(type) ?? props.address)?.toLowerCase()
}

// Rendering/parsing info for an amount-like input, or null if not amount-like
// (or a token-amount whose decimals are not resolved yet — kept as a raw field).
function amountMeta(param: ContractFunctionParam): AmountInputInfo | null {
  const type = param.meta?.type
  const kind = semanticAmountKind(type)
  if (!kind) return null
  if (!/^u?int/.test(param.type)) return null

  if (kind === 'token-amount') {
    const addr = paramTokenAddress(type)
    const info = addr ? tokenMeta[addr] : undefined
    if (!info) return null
    return {
      decimals: info.decimals,
      symbol: info.symbol,
      balance: addr ? tokenBalance[addr] : undefined,
    }
  }

  const display = resolveAmountDisplay(type as ParamType)
  if (!display) return null
  return { decimals: display.decimals, symbol: display.symbol }
}

const amountDecimals = (input: ContractFunctionParam) =>
  amountMeta(input)?.decimals ?? null

function collectTokenAddresses(): string[] {
  const set = new Set<string>()
  for (const input of props.fn.inputs) {
    const addr = paramTokenAddress(input.meta?.type)
    if (addr) set.add(addr)
  }
  if (!hasResultFields.value) {
    const out = props.fn.outputs[0]
    const addr = out
      ? paramTokenAddress(getOutputSemanticType(out, props.fn.meta?.returns))
      : undefined
    if (addr) set.add(addr)
  }
  return [...set]
}

async function resolveTokenMeta() {
  const reader = props.readFunction
  if (!reader) return
  for (const addr of collectTokenAddresses()) {
    if (tokenMeta[addr]) continue
    try {
      const [decimals, symbol] = await Promise.all([
        reader({
          address: addr,
          abi: ERC20_META_ABI as unknown as Abi,
          functionName: 'decimals',
        }),
        reader({
          address: addr,
          abi: ERC20_META_ABI as unknown as Abi,
          functionName: 'symbol',
        }).catch(() => undefined),
      ])
      tokenMeta[addr] = {
        decimals: Number(decimals),
        symbol: typeof symbol === 'string' ? symbol : undefined,
      }
    } catch {
      // leave unresolved — the input stays a raw integer field
    }
  }
  await resolveTokenBalances()
}

async function resolveTokenBalances() {
  const reader = props.readFunction
  const holder = props.connectedAddress
  if (!reader || !holder) return
  for (const input of props.fn.inputs) {
    const addr = paramTokenAddress(input.meta?.type)
    if (!addr || !tokenMeta[addr]) continue
    try {
      const balance = await reader({
        address: addr,
        abi: ERC20_META_ABI as unknown as Abi,
        functionName: 'balanceOf',
        args: [holder],
      })
      tokenBalance[addr] = BigInt(balance as bigint | number | string)
    } catch {
      // ignore — max button simply won't render
    }
  }
}

watch(
  () => [props.fn.slug, props.readFunction, props.address] as const,
  () => void resolveTokenMeta(),
  { immediate: true },
)

watch(
  () => props.connectedAddress,
  () => void resolveTokenBalances(),
)

const artifactResult = computed(() => {
  if (typeof result.value !== 'string') return null
  return detectPreviewMarkupKind(result.value) ? result.value : null
})
const metadataUri = computed(() =>
  isResolvableMetadataUri(result.value) ? result.value : null,
)
const showMetadataPreview = computed(
  () =>
    metadataResolving.value ||
    Boolean(metadataPreview.value || metadataError.value),
)
const examples = computed(() => props.fn.meta?.examples || [])
const labels = computed<FunctionDetailLabels>(() => ({
  examples: 'examples',
  read: 'read',
  reading: 'reading...',
  send: 'send',
  sending: 'sending...',
  writeUnavailable: 'write interactions are unavailable',
  walletRequired: 'connect a wallet to send this transaction',
  invalidInputs: 'fix input errors before sending this transaction',
  viewCode: 'view code',
  ...props.labels,
}))

const writeHint = computed(() => {
  if (!props.writeFunction) return labels.value.writeUnavailable
  if (!props.walletConnected) return labels.value.walletRequired
  return labels.value.invalidInputs
})
const writeRequest = computed<(() => Promise<Hash>) | undefined>(() => {
  if (!props.writeFunction || props.fn.isRead || !props.walletConnected) {
    return
  }

  const writeFunction = props.writeFunction!

  return async () => {
    const value = props.fn.isPayable ? txValue.value.trim() : ''

    const { resolved, error: ensError } = await resolveEnsInputs(
      props.fn.inputs,
      inputValues,
      resolveEnsAddress,
    )
    if (ensError) throw new Error(ensError)

    return writeFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.fn.name,
      args: buildArgs(resolved),
      ...(value ? { value: parseEther(value) } : {}),
    })
  }
})

watch(
  () => [props.address, props.fn.slug] as const,
  () => resetInputs(),
  { immediate: true },
)

watch(
  () => props.args,
  (args) => {
    if (!args) return
    hydrateInputValues(props.fn.inputs, inputValues, args)
  },
  { immediate: true },
)

watch(
  inputValues,
  () => {
    emit('update:args', serializeInputArgs(props.fn.inputs, inputValues))
  },
  { deep: true },
)

watch(
  () => [props.fn.slug, props.readFunction] as const,
  () => {
    if (autoRead.value) read()
  },
  { immediate: true },
)

onMounted(() => {
  if (autoRead.value) read()
})

watch([metadataUri, () => props.resolveMetadata], ([uri, resolveMetadata]) => {
  if (!uri || !resolveMetadata) {
    resetMetadataPreview()
    return
  }

  void resolveMetadataPreview(uri, resolveMetadata)
})

function isTuple(input: ContractFunction['inputs'][number]): boolean {
  return input.type === 'tuple' && !!input.components?.length
}

function tupleComponents(
  input: ContractFunction['inputs'][number],
): ContractFunction['inputs'][number][] {
  return input.components || []
}

function fieldKey(
  input: ContractFunction['inputs'][number],
  index: number,
): string {
  return buildInputKey(undefined, input.name, index)
}

function setInputValue(key: string, value: string) {
  inputValues[key] = value
}

function resetInputs() {
  result.value = null
  error.value = ''
  txValue.value = ''
  hasResult.value = false
  resetMetadataPreview()

  for (const key of Object.keys(inputValues)) delete inputValues[key]
  seedInputValues(
    props.fn.inputs,
    inputValues,
    undefined,
    props.fn.meta?.params,
    {
      contractAddress: props.address,
      connectedAddress: props.connectedAddress,
      now: Date.now(),
    },
  )
}

function buildArgs(resolvedEns?: ResolvedEnsAddresses) {
  return buildInputArgs(
    props.fn.inputs,
    inputValues,
    undefined,
    amountDecimals,
    resolvedEns,
  )
}

function resetMetadataPreview() {
  metadataPreview.value = null
  metadataRawJson.value = null
  metadataResolving.value = false
  metadataError.value = null
}

async function resolveMetadataPreview(
  uri: string,
  resolveMetadata: MetadataResolveFn,
) {
  metadataResolving.value = true
  metadataPreview.value = null
  metadataRawJson.value = null
  metadataError.value = null

  try {
    const resolved = await resolveMetadata(uri)
    if (metadataUri.value !== uri) return

    metadataPreview.value = resolved?.metadata ?? null
    metadataRawJson.value = resolved?.rawJson ?? null
    if (!resolved?.metadata) {
      metadataError.value = 'Response is not token metadata'
    }
  } catch (err: any) {
    if (metadataUri.value !== uri) return

    metadataError.value =
      err?.data?.message || err?.message || 'Failed to resolve metadata'
  } finally {
    if (metadataUri.value === uri) metadataResolving.value = false
  }
}

async function read() {
  if (pending.value || !props.fn.isRead || hasErrors.value) {
    return
  }

  if (!props.readFunction) {
    error.value =
      'Set an RPC URL or connect a wallet before reading this contract.'
    hasResult.value = true
    return
  }

  pending.value = true
  error.value = ''
  result.value = null
  hasResult.value = false

  try {
    const { resolved, error: ensError } = await resolveEnsInputs(
      props.fn.inputs,
      inputValues,
      resolveEnsAddress,
    )
    if (ensError) {
      error.value = ensError
      hasResult.value = true
      return
    }

    result.value = await props.readFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.fn.name,
      args: buildArgs(resolved),
    })
    hasResult.value = true
  } catch (err: any) {
    emit('error', err)
    error.value = normalizeReadError(err, { functionName: props.fn.name })
    hasResult.value = true
  } finally {
    pending.value = false
  }
}

function submit() {
  if (props.fn.isRead) read()
}

function applyExample(example: FunctionExample) {
  resetInputs()
  applyInputExample(inputValues, example.params)

  if (props.fn.isRead) {
    nextTick(() => {
      if (!hasErrors.value) read()
    })
  }
}

function formatValue(value: unknown) {
  const output = props.fn.outputs[0]
  if (!output) return formatArgValue(value)
  const semanticType = getOutputSemanticType(output, props.fn.meta?.returns)
  const addr = paramTokenAddress(semanticType)
  const info = addr ? tokenMeta[addr] : undefined
  return formatSemanticValue(value, semanticType, info)
}

interface FunctionDetailLabels {
  examples: string
  read: string
  reading: string
  send: string
  sending: string
  writeUnavailable: string
  walletRequired: string
  invalidInputs: string
  viewCode: string
}
</script>
