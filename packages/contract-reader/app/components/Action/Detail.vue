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
          :values="inputValues"
          :errors="inputErrors"
          :set-value="setInputValue"
          :amount="amountMeta(input)"
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
              :amount-meta="amountMeta"
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
            v-model="inputValues[fieldKey(input, index)]"
            :input="input"
            :meta="input.meta"
            :amount="amountMeta(input)"
            :error="inputErrors[fieldKey(input, index)]"
          />
        </slot>

        <!-- Rendered outside the slot so hosts overriding `field` keep the
             standard's parameter previews for free. -->
        <ActionParamPreview
          v-if="!isHidden(input) && input.meta?.preview?.image"
          :template="input.meta.preview.image"
          :get-arg="inputArgValue"
          :read-function="readFunction"
          :resolve-metadata="resolveMetadata"
        />
      </template>

      <slot
        v-if="action.isPayable && !valueHidden"
        name="value-field"
        :action="action"
        :value="txValue"
        :set-value="setTxValue"
        :meta="valueMeta"
        :label="valueLabel"
        :disabled="valueDisabled"
        :error="valueError"
      >
        <label class="cr-field cr-value-field">
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
      </slot>

      <slot
        name="actions"
        :action="action"
        :pending="pending"
        :has-errors="hasErrors"
        :auto-read="autoRead"
        :read="triggerRead"
        :submit="submit"
        :write-request="writeRequest"
        :write-hint="writeHint"
        :labels="labels"
        :wallet-connected="walletConnected"
        :value="txValue"
        :value-wei="txValueWei"
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
        <ActionResultPanel
          :pending="pending"
          :has-result="hasResult"
          :auto-read="autoRead"
          :result="result"
          :error="error"
          :outputs="action.outputs"
          :returns-meta="action.meta?.returns"
          :has-result-fields="hasResultFields"
          :address-href="addressHref"
          :token-info="tokenMeta"
          :contract-address="address"
          :format-value="formatValue"
        >
          <template #address="slotProps">
            <slot
              name="address"
              v-bind="slotProps"
            >
              {{ slotProps.value }}
            </slot>
          </template>
        </ActionResultPanel>
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
      :custom-component="customComponent"
      :custom-args="customArgs"
    >
      <ActionArtifactPreview :value="artifactResult" />

      <component
        :is="customComponent.component"
        v-if="customComponent"
        :value="result"
        :config="customComponent.config"
        :args="customArgs"
        :address="address"
        :abi="abi"
        :action="action"
      />

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
import type { ContractAction } from '../../types/contract'
import type {
  ContractReadFn,
  ContractWriteFn,
  MetadataResolveFn,
  TokenInfoResolveFn,
} from '../../types/actions'
import type { ActionExample, ValueMeta } from '../../types/metadata'
import { normalizeReadError } from '../../utils/errors'
import {
  applyInputExample,
  buildInputKey,
  buildInputArgs,
  buildInputErrors,
  hydrateInputValues,
  parseBigInt,
  resolveAutofillValue,
  resolveEnsInputs,
  seedInputValues,
  serializeInputArgs,
  type ResolvedEnsAddresses,
} from '../../utils/inputs'
import {
  resolveActionComponent,
  type ResolvedActionComponent,
} from '../../utils/custom-components'
import ActionInput from './Input.vue'
import ActionParamPreview from './ParamPreview.vue'
import ActionArtifactPreview from './ArtifactPreview.client.vue'
import ActionMetadataPreview from './MetadataPreview.client.vue'
import ActionResultPanel from './ResultPanel.vue'
import ActionTupleInput from './TupleInput.vue'
import {
  formatArgValue,
  formatSemanticValue,
  getOutputSemanticType,
  type AmountInputInfo,
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
    /** The full input record — lets hosts render tuples over layer state. */
    values: Record<string, string>
    errors: Record<string, string | null>
    setValue: (key: string, value: string) => void
    amount: AmountInputInfo | null
  }) => unknown
  'value-field'?: (props: {
    action: ContractAction
    /** The msg.value input, denominated in ETH. */
    value: string
    setValue: (value: string) => void
    meta?: ValueMeta
    label: string
    disabled: boolean
    error: string | null
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
    /** The msg.value input, denominated in ETH ('' when unset). */
    value: string
    /** The msg.value parsed to wei, or undefined when empty/invalid. */
    valueWei?: bigint
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
    customComponent: ResolvedActionComponent | null
    customArgs: unknown[] | null
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
    /**
     * Resolve a token's decimals/symbol (e.g. through an indexer API).
     * Defaults to on-chain lookups through `readFunction`.
     */
    resolveTokenInfo?: TokenInfoResolveFn
    labels?: Partial<ActionDetailLabels>
    autoRead?: boolean
    /**
     * Auto-execute parameterized reads when hydrated `args` fill the form
     * validly — e.g. deep links that carry arguments. Zero-input reads
     * auto-read regardless (see `autoRead`).
     */
    autoReadWithArgs?: boolean
  }>(),
  {
    autoRead: true,
    autoReadWithArgs: false,
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

// A read triggered while one is in flight (e.g. stepping a block picker
// twice) is queued rather than dropped, so the displayed result always
// matches the latest trigger. Declared before the immediate watchers below —
// they run during setup and reset it.
let queuedRead = false

// Request-generation counter (mirrors useContractMetadataSdk): responses of
// superseded reads — e.g. after switching actions mid-flight — are dropped
// instead of writing a stale result/error into the current view.
let readId = 0

const txValue = ref('')

function setTxValue(value: string) {
  txValue.value = value
}

const txValueWei = computed(() => {
  const raw = txValue.value.trim()
  if (!props.action.isPayable || !raw) return undefined
  try {
    return parseEther(raw)
  } catch {
    return undefined
  }
})

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
  if (!props.action.isPayable) return null
  const rule = valueMeta.value?.validation
  const raw = txValue.value.trim()
  if (!raw) return null
  // A non-empty value that doesn't parse is always an error, whether or not
  // metadata supplies a validation rule — it would otherwise only throw
  // inside writeRequest.
  let wei: bigint
  try {
    wei = parseEther(raw)
  } catch {
    return rule?.message || 'invalid amount'
  }
  if (!rule) return null
  // Bounds come from untrusted external metadata — ignore unparseable ones.
  const min = rule.min != null ? parseBigInt(String(rule.min)) : null
  if (min !== null && wei < min) {
    return rule.message || `minimum ${formatEther(min)} ETH`
  }
  const max = rule.max != null ? parseBigInt(String(rule.max)) : null
  if (max !== null && wei > max) {
    return rule.message || `maximum ${formatEther(max)} ETH`
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

// Current value of the input the given metadata key (ABI name or `_N`
// positional) refers to — lets `tokenParam` references resolve against what
// the user has typed so far.
function inputArgValue(key: string): unknown {
  const inputs = props.action.inputs
  let index = inputs.findIndex(
    (input, i) => buildInputKey(undefined, input.name, i) === key,
  )
  if (index === -1) {
    const positional = key.match(/^_(\d+)$/)
    if (positional) index = Number(positional[1])
  }
  const input = inputs[index]
  return input ? inputValues[fieldKey(input, index)] : undefined
}

// ── Amount-like params (eth / gwei / amount / token-amount) ──
const { tokenMeta, amountMeta, amountDecimals, paramTokenAddress } =
  useTokenAmountMeta({
    action: () => props.action,
    contractAddress: () => props.address,
    connectedAddress: () => props.connectedAddress,
    readFunction: () => props.readFunction,
    resolveTokenInfo: () => props.resolveTokenInfo,
    getArg: inputArgValue,
  })

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

// ── Custom `_component` extension (see utils/custom-components.ts) ──
const customComponent = computed(() =>
  resolveActionComponent(props.action.meta),
)

// Parsed args for the custom component — raw base-unit values like a decoded
// call; null while the inputs don't parse.
const customArgs = computed<unknown[] | null>(() => {
  if (!customComponent.value) return null
  try {
    return buildArgs()
  } catch {
    return null
  }
})

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
    // JSON-serialized comparison — separator-joined strings are ambiguous for
    // values that contain the separator themselves.
    const before = JSON.stringify(
      serializeInputArgs(props.action.inputs, inputValues),
    )
    hydrateInputValues(props.action.inputs, inputValues, args)
    const after = JSON.stringify(
      serializeInputArgs(props.action.inputs, inputValues),
    )
    // Only externally-arriving args (deep links, examples routed through the
    // host) trigger a read — echoes of our own update:args are no-ops here.
    if (before !== after && args.some(Boolean)) scheduleArgsRead()
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
  ([slug, readFunction], previous) => {
    if (autoRead.value) return void triggerRead()
    // Same action, new read source (e.g. a time-travel target block):
    // refresh the result the user is looking at.
    if (
      previous &&
      slug === previous[0] &&
      readFunction !== previous[1] &&
      props.action.isRead &&
      hasResult.value
    ) {
      void triggerRead()
    }
  },
  { immediate: true },
)

onMounted(() => {
  // Plain read(): its pending guard makes this a no-op when the immediate
  // watcher above already started the auto-read during setup.
  if (autoRead.value) void read()
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
  // Invalidate any in-flight read: its response must not land in the view
  // of the action/address we are switching to.
  readId++
  pending.value = false
  result.value = null
  error.value = ''
  txValue.value = seededValue()
  hasResult.value = false
  queuedRead = false
  resetMetadataPreview()

  // Deleting is deliberate: stale keys must leave the reactive record, not
  // linger as empty strings that seeding would then skip.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
  } catch (err) {
    if (metadataUri.value !== uri) return

    const cause = err as
      { data?: { message?: string }; message?: string } | null | undefined
    metadataError.value =
      cause?.data?.message || cause?.message || 'Failed to resolve metadata'
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

  const id = ++readId
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
    if (id !== readId) return
    if (ensError) {
      error.value = ensError
      hasResult.value = true
      return
    }

    const value = await props.readFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.action.name,
      args: buildArgs(resolved),
    })
    if (id !== readId) return
    result.value = value
    hasResult.value = true
  } catch (err) {
    if (id !== readId) return
    emit('error', err)
    error.value = normalizeReadError(err, { functionName: props.action.name })
    hasResult.value = true
  } finally {
    if (id === readId) pending.value = false
  }
}

async function triggerRead(): Promise<void> {
  if (pending.value) {
    queuedRead = true
    return
  }
  await read()
  if (queuedRead) {
    queuedRead = false
    return triggerRead()
  }
}

// Auto-read for externally hydrated args (deep links) — waits a tick so the
// hydrated values have settled into validation state.
function scheduleArgsRead() {
  if (!props.autoReadWithArgs || autoRead.value) return
  void nextTick(() => {
    if (props.action.isRead && !hasErrors.value) void triggerRead()
  })
}

function submit() {
  if (props.action.isRead) void triggerRead()
}

function applyExample(example: ActionExample) {
  resetInputs()
  applyInputExample(props.action.inputs, inputValues, example.params)

  if (props.action.isRead) {
    nextTick(() => {
      if (!hasErrors.value) void triggerRead()
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

defineExpose({
  /** Execute (or queue) a read with the current inputs. */
  read: triggerRead,
})

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
