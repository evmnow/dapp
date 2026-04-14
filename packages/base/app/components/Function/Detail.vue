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
          <button
            v-for="example in examples"
            :key="example.label"
            class="cr-button"
            type="button"
            @click="applyExample(example)"
          >
            {{ example.label }}
          </button>
        </div>
      </div>
    </slot>

    <form
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
        <button
          v-if="fn.isRead && (fn.inputs.length || !autoRead)"
          class="cr-button cr-button-primary cr-function-action"
          type="submit"
          :disabled="pending || !readFunction || hasErrors"
        >
          {{ pending ? labels.reading : labels.read }}
        </button>

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
        <FunctionResult
          v-if="pending && autoRead"
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
          v-else-if="result !== null && hasResultFields"
          :result="result"
          :outputs="fn.outputs"
          :returns-meta="fn.meta?.returns"
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
        </FunctionResultFields>

        <FunctionResult
          v-else-if="result !== null"
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

        <FunctionResult
          v-if="error"
          label="error"
          :value="error"
          is-error
        />
      </slot>
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
import { parseEther } from 'viem'
import type { ContractFunction } from '../../types/contract'
import type { ContractReadFn, ContractWriteFn } from '../../types/actions'
import type { FunctionExample } from '../../types/metadata'
import { normalizeReadError } from '../../utils/errors'
import {
  applyInputExample,
  buildInputKey,
  buildInputArgs,
  buildInputErrors,
  hydrateInputValues,
  seedInputValues,
  serializeInputArgs,
} from '../../utils/inputs'
import FunctionInput from './Input.vue'
import FunctionResult from './Result.vue'
import FunctionResultFields from './ResultFields.vue'
import FunctionTupleInput from './TupleInput.vue'
import { formatArgValue } from '../../utils/format'

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
  footer?: (props: {
    fn: ContractFunction
    result: unknown
    error: string
  }) => unknown
}>()

const props = defineProps<{
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
  labels?: Partial<FunctionDetailLabels>
  autoRead?: boolean
}>()

const emit = defineEmits<{
  'update:args': [args: string[]]
  error: [error: unknown]
}>()

const inputValues = reactive<Record<string, string>>({})
const inputErrors = computed(() =>
  buildInputErrors(props.fn.inputs, inputValues, props.fn.meta?.params),
)
const hasErrors = computed(() =>
  Object.values(inputErrors.value).some((error) => !!error),
)
const txValue = ref('')
const result = ref<unknown>(null)
const error = ref('')
const pending = ref(false)

const autoRead = computed(
  () =>
    props.autoRead !== false && props.fn.isRead && props.fn.inputs.length === 0,
)
const hasResultFields = computed(() => props.fn.outputs.length > 1)
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

    return writeFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.fn.name,
      args: buildArgs(),
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

function buildArgs() {
  return buildInputArgs(props.fn.inputs, inputValues)
}

async function read() {
  if (!props.readFunction || !props.fn.isRead || hasErrors.value) return

  pending.value = true
  error.value = ''
  result.value = null

  try {
    result.value = await props.readFunction({
      address: props.address,
      abi: props.abi,
      functionName: props.fn.name,
      args: buildArgs(),
    })
  } catch (err: any) {
    emit('error', err)
    error.value = normalizeReadError(err, { functionName: props.fn.name })
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
  return formatArgValue(value)
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
}
</script>
