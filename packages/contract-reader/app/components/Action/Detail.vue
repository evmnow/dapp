<template>
  <article class="cr-action-detail">
    <div
      v-if="action.description"
      class="cr-action-description cr-muted"
    >
      <InlineMarkdown :text="action.description" />
    </div>

    <div
      v-if="action.warning"
      class="cr-warning"
    >
      {{ action.warning }}
    </div>

    <slot
      name="intro"
      :action="action"
    />

    <slot
      name="examples"
      :action="action"
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
        v-for="(input, index) in action.inputs"
        :key="fieldKey(input, index)"
      >
        <slot
          v-if="!isHidden(input)"
          name="field"
          :action="action"
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

            <ActionTupleInput
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

          <ActionInput
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
        v-if="action.isPayable && !valueHidden"
        class="cr-field cr-value-field"
      >
        <span class="cr-field-label">
          {{ valueLabel }}
          <span class="cr-field-type">(ETH)</span>
        </span>

        <input
          v-model="txValue"
          class="cr-input"
          inputmode="decimal"
          placeholder="0"
          spellcheck="false"
          autocomplete="off"
          :disabled="valueDisabled"
        />

        <small
          v-if="valueMeta?.description"
          class="cr-input-help cr-muted"
        >
          <InlineMarkdown :text="valueMeta.description" />
        </small>

        <small
          v-if="valueError"
          class="cr-input-help cr-error"
        >
          {{ valueError }}
        </small>
      </label>

      <slot
        name="actions"
        :action="action"
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
          v-if="action.isRead && visibleInputCount"
          class="primary cr-action-submit"
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
          button-class="cr-action-submit"
          :disabled="hasErrors"
        />

        <p
          v-else-if="!action.isRead"
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
      :action="action"
      :outputs="action.outputs"
      :has-result-fields="hasResultFields"
      :address-href="addressHref"
      :format-value="formatValue"
    >
      <slot
        name="result-preview"
        :pending="pending"
        :result="result"
        :error="error"
        :action="action"
        :outputs="action.outputs"
        :has-result-fields="hasResultFields"
        :address-href="addressHref"
        :format-value="formatValue"
      >
        <template v-if="autoRead">
          <ActionResult
            v-if="pending || !hasResult"
            label="result"
            value="loading..."
            :address-href="addressHref"
          >
          </ActionResult>

          <ActionResultFields
            v-else-if="hasResultFields"
            :result="result"
            :outputs="action.outputs"
            :returns-meta="action.meta?.returns"
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
          </ActionResultFields>

          <ActionResult
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
          </ActionResult>
        </template>

        <template v-else-if="result !== null">
          <ActionResultFields
            v-if="hasResultFields"
            :result="result"
            :outputs="action.outputs"
            :returns-meta="action.meta?.returns"
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
          </ActionResultFields>

          <ActionResult
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
          </ActionResult>
        </template>

        <ActionResult
          v-if="error"
          label="error"
          :value="error"
          is-error
        />
      </slot>
    </slot>

    <slot
      name="preview"
      :action="action"
      :result="result"
      :error="error"
      :artifact-result="artifactResult"
      :metadata="metadataPreview"
      :metadata-raw-json="metadataRawJson"
      :metadata-resolving="metadataResolving"
      :metadata-error="metadataError"
    >
      <ActionArtifactPreview :value="artifactResult" />

      <ActionMetadataPreview
        v-if="showMetadataPreview"
        :metadata="metadataPreview"
        :raw-json="metadataRawJson"
        :resolving="metadataResolving"
        :error="metadataError"
      />
    </slot>

    <slot
      name="source-link"
      :action="action"
      :source-route="sourceRoute"
      :label="labels.viewCode"
    >
      <div
        v-if="sourceRoute"
        class="cr-action-source"
      >
        <Button
          :to="sourceRoute"
          class="link cr-action-source-link"
        >
          {{ labels.viewCode }}
        </Button>
      </div>
    </slot>

    <slot
      name="footer"
      :action="action"
      :result="result"
      :error="error"
    />
  </article>
</template>

<script setup lang="ts">
import type { Abi, Hash } from 'viem'
import type { RouteLocationRaw } from 'vue-router'
import { formatEther, parseEther } from 'viem'
import { resolveAmountDisplay, type ParamType } from '@evmnow/sdk'
import type { ContractAction, ContractActionParam } from '../../types/contract'
import type { SemanticType } from '../../types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
} from '../../types/actions'
import type { ActionExample } from '../../types/metadata'
import { normalizeReadError } from '../../utils/errors'
import {
  applyInputExample,
  buildInputKey,
  buildInputArgs,
  buildInputErrors,
  hydrateInputValues,
  resolveAutofillValue,
  resolveEnsInputs,
  seedInputValues,
  serializeInputArgs,
  type ResolvedEnsAddresses,
} from '../../utils/inputs'
import ActionInput from './Input.vue'
import ActionArtifactPreview from './ArtifactPreview.client.vue'
import ActionMetadataPreview from './MetadataPreview.client.vue'
import ActionResult from './Result.vue'
import ActionResultFields from './ResultFields.vue'
import ActionTupleInput from './TupleInput.vue'
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
  intro?: (props: { action: ContractAction }) => unknown
  examples?: (props: {
    action: ContractAction
    examples: ActionExample[]
    applyExample: (example: ActionExample) => void
  }) => unknown
  field?: (props: {
    action: ContractAction
    input: ContractAction['inputs'][number]
    index: number
    fieldKey: string
    value: string
    error?: string | null
    updateValue: (value: string) => void
  }) => unknown
  actions?: (props: {
    action: ContractAction
    pending: boolean
    hasErrors: boolean
    autoRead: boolean
    read: () => Promise<void>
    submit: () => void
    writeRequest?: () => Promise<Hash>
    writeHint: string
    labels: ActionDetailLabels
    walletConnected?: boolean
  }) => unknown
  result?: (props: {
    pending: boolean
    result: unknown
    error: string
    action: ContractAction
    outputs: ContractAction['outputs']
    hasResultFields: boolean
    addressHref?: (address: string) => string | undefined | null
    formatValue: (value: unknown) => string
  }) => unknown
  'result-preview'?: (props: {
    pending: boolean
    result: unknown
    error: string
    action: ContractAction
    outputs: ContractAction['outputs']
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
    action: ContractAction
    sourceRoute?: RouteLocationRaw
    label: string
  }) => unknown
  footer?: (props: {
    action: ContractAction
    result: unknown
    error: string
  }) => unknown
  preview?: (props: {
    action: ContractAction
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
    action: ContractAction
    args?: string[]
    readFunction?: ContractReadFn
    writeFunction?: ContractWriteFn
    walletConnected?: boolean
    connectedAddress?: string
    addressHref?: (address: string) => string | undefined | null
    sourceRoute?: RouteLocationRaw
    resolveMetadata?: MetadataResolveFn
    labels?: Partial<ActionDetailLabels>
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
    props.action.inputs,
    inputValues,
    props.action.meta?.params,
    undefined,
    amountDecimals,
  ),
)
const hasErrors = computed(
  () =>
    Object.values(inputErrors.value).some((error) => !!error) ||
    Boolean(valueError.value),
)
const txValue = ref('')

// ── Native currency (msg.value) metadata for payable calls ──
const valueMeta = computed(() => props.action.meta?.value)
const valueLabel = computed(() => valueMeta.value?.label || 'value')
const valueHidden = computed(() => Boolean(valueMeta.value?.hidden))
const valueDisabled = computed(() => Boolean(valueMeta.value?.disabled))

// The value autofill is denominated in wei; the input collects ETH.
function seededValue(): string {
  const autofill = valueMeta.value?.autofill
  const wei = resolveAutofillValue(autofill, {
    contractAddress: props.address,
    connectedAddress: props.connectedAddress,
    now: Date.now(),
  })
  if (!wei) return ''
  try {
    return formatEther(BigInt(wei))
  } catch {
    return ''
  }
}

const valueError = computed(() => {
  const rule = valueMeta.value?.validation
  const raw = txValue.value.trim()
  if (!rule || !raw) return null
  let wei: bigint
  try {
    wei = parseEther(raw)
  } catch {
    return rule.message || 'invalid amount'
  }
  if (rule.min != null && wei < BigInt(rule.min)) {
    return rule.message || `minimum ${formatEther(BigInt(rule.min))} ETH`
  }
  if (rule.max != null && wei > BigInt(rule.max)) {
    return rule.message || `maximum ${formatEther(BigInt(rule.max))} ETH`
  }
  return null
})
const result = ref<unknown>(null)
const error = ref('')
const pending = ref(false)
const hasResult = ref(false)
const metadataPreview = ref<PreviewMetadata | null>(null)
const metadataRawJson = ref<Record<string, unknown> | null>(null)
const metadataResolving = ref(false)
const metadataError = ref<string | null>(null)

const visibleInputCount = computed(
  () => props.action.inputs.filter((input) => !isHidden(input)).length,
)
const autoRead = computed(
  () =>
    props.autoRead !== false &&
    props.action.isRead &&
    visibleInputCount.value === 0,
)
const hasForm = computed(
  () =>
    visibleInputCount.value > 0 ||
    props.action.isPayable ||
    !props.action.isRead,
)
const hasResultFields = computed(() => props.action.outputs.length > 1)

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
function amountMeta(param: ContractActionParam): AmountInputInfo | null {
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

const amountDecimals = (input: ContractActionParam) =>
  amountMeta(input)?.decimals ?? null

function collectTokenAddresses(): string[] {
  const set = new Set<string>()
  for (const input of props.action.inputs) {
    const addr = paramTokenAddress(input.meta?.type)
    if (addr) set.add(addr)
  }
  if (!hasResultFields.value) {
    const out = props.action.outputs[0]
    const addr = out
      ? paramTokenAddress(
          getOutputSemanticType(out, props.action.meta?.returns),
        )
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
  for (const input of props.action.inputs) {
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
  () => [props.action.slug, props.readFunction, props.address] as const,
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
const examples = computed(() => props.action.meta?.examples || [])
const labels = computed<ActionDetailLabels>(() => ({
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
  if (!props.writeFunction || props.action.isRead || !props.walletConnected) {
    return
  }

  const writeFunction = props.writeFunction!

  return async () => {
    const value = props.action.isPayable ? txValue.value.trim() : ''

    const { resolved, error: ensError } = await resolveEnsInputs(
      props.action.inputs,
      inputValues,
      resolveEnsAddress,
    )
    if (ensError) throw new Error(ensError)

    return writeFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.action.name,
      args: buildArgs(resolved),
      ...(value ? { value: parseEther(value) } : {}),
    })
  }
})

watch(
  () => [props.address, props.action.slug] as const,
  () => resetInputs(),
  { immediate: true },
)

watch(
  () => props.args,
  (args) => {
    if (!args) return
    hydrateInputValues(props.action.inputs, inputValues, args)
  },
  { immediate: true },
)

watch(
  inputValues,
  () => {
    emit('update:args', serializeInputArgs(props.action.inputs, inputValues))
  },
  { deep: true },
)

watch(
  () => [props.action.slug, props.readFunction] as const,
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

function isTuple(input: ContractAction['inputs'][number]): boolean {
  return input.type === 'tuple' && !!input.components?.length
}

function isHidden(input: ContractAction['inputs'][number]): boolean {
  return Boolean(input.meta?.hidden)
}

function tupleComponents(
  input: ContractAction['inputs'][number],
): ContractAction['inputs'][number][] {
  return input.components || []
}

function fieldKey(
  input: ContractAction['inputs'][number],
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
  txValue.value = seededValue()
  hasResult.value = false
  resetMetadataPreview()

  for (const key of Object.keys(inputValues)) delete inputValues[key]
  seedInputValues(
    props.action.inputs,
    inputValues,
    undefined,
    props.action.meta?.params,
    {
      contractAddress: props.address,
      connectedAddress: props.connectedAddress,
      now: Date.now(),
    },
  )
}

function buildArgs(resolvedEns?: ResolvedEnsAddresses) {
  return buildInputArgs(
    props.action.inputs,
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
  if (pending.value || !props.action.isRead || hasErrors.value) {
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
      props.action.inputs,
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
      functionName: props.action.name,
      args: buildArgs(resolved),
    })
    hasResult.value = true
  } catch (err: any) {
    emit('error', err)
    error.value = normalizeReadError(err, { functionName: props.action.name })
    hasResult.value = true
  } finally {
    pending.value = false
  }
}

function submit() {
  if (props.action.isRead) read()
}

function applyExample(example: ActionExample) {
  resetInputs()
  applyInputExample(inputValues, example.params)

  if (props.action.isRead) {
    nextTick(() => {
      if (!hasErrors.value) read()
    })
  }
}

function formatValue(value: unknown) {
  const output = props.action.outputs[0]
  if (!output) return formatArgValue(value)
  const semanticType = getOutputSemanticType(output, props.action.meta?.returns)
  const addr = paramTokenAddress(semanticType)
  const info = addr ? tokenMeta[addr] : undefined
  return formatSemanticValue(value, semanticType, info)
}

interface ActionDetailLabels {
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
