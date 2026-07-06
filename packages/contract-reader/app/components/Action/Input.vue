<template>
  <div class="cr-field">
    <label
      class="cr-field-label"
      :for="controlId"
    >
      {{ label }}
      <span class="cr-field-type">({{ typeSuffix }})</span>
    </label>

    <select
      v-if="input.type === 'bool'"
      :id="controlId"
      v-model="model"
      class="cr-input"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    >
      <option value="false">false</option>
      <option value="true">true</option>
    </select>

    <EvmAddressInput
      v-else-if="input.type === 'address'"
      :id="controlId"
      v-model="model"
      class="cr-input"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />

    <textarea
      v-else-if="input.type.endsWith('[]')"
      :id="controlId"
      v-model="model"
      class="cr-input"
      placeholder="JSON array or comma-separated values"
      rows="3"
      spellcheck="false"
      autocomplete="off"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />

    <select
      v-else-if="widget === 'enum'"
      :id="controlId"
      v-model="model"
      class="cr-input"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    >
      <option
        v-if="!model"
        value=""
        disabled
      >
        select…
      </option>
      <option
        v-for="(optionLabel, optionValue) in enumValues"
        :key="optionValue"
        :value="String(optionValue)"
      >
        {{ optionLabel }}
      </option>
    </select>

    <div
      v-else-if="widget === 'slider'"
      class="cr-slider"
    >
      <input
        :id="controlId"
        v-model="model"
        type="range"
        :min="slider!.min"
        :max="slider!.max"
        :step="slider!.step ?? '1'"
        :disabled="disabled"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
      />
      <span class="cr-slider-value">{{ model || slider!.min }}</span>
    </div>

    <input
      v-else-if="widget === 'date' || widget === 'datetime'"
      :id="controlId"
      class="cr-input"
      :type="widget === 'date' ? 'date' : 'datetime-local'"
      :value="dateValue"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
      @input="onDateInput(($event.target as HTMLInputElement).value)"
    />

    <div
      v-else-if="widget === 'duration'"
      class="cr-duration"
    >
      <input
        :id="controlId"
        class="cr-input"
        type="number"
        min="0"
        :value="durationAmount"
        :disabled="disabled"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
        @input="
          updateDuration(
            ($event.target as HTMLInputElement).value,
            durationUnit,
          )
        "
      />
      <select
        class="cr-input cr-duration-unit"
        :value="durationUnit"
        :disabled="disabled"
        :aria-label="`${label} unit`"
        @change="
          updateDuration(
            durationAmount,
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option
          v-for="unit in DURATION_UNITS"
          :key="unit.seconds"
          :value="unit.seconds"
        >
          {{ unit.label }}
        </option>
      </select>
    </div>

    <input
      v-else-if="widget === 'bytes32-utf8'"
      :id="controlId"
      class="cr-input"
      type="text"
      :value="utf8Text"
      placeholder="text (stored as bytes32)"
      spellcheck="false"
      autocomplete="off"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
      @input="onUtf8Input(($event.target as HTMLInputElement).value)"
    />

    <EvmAmountInput
      v-else-if="amount"
      :id="controlId"
      v-model="model"
      class="cr-input"
      :decimals="amount.decimals"
      :symbol="amount.symbol"
      :balance="amount.balance"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />

    <input
      v-else
      :id="controlId"
      v-model="model"
      class="cr-input"
      :placeholder="input.type"
      spellcheck="false"
      autocomplete="off"
      :disabled="disabled"
      :aria-describedby="describedBy"
      :aria-invalid="invalid"
    />

    <small
      v-if="description && input.type !== 'bool'"
      :id="helpId"
      class="cr-input-help cr-muted"
    >
      <InlineMarkdown :text="description" />
    </small>

    <small
      v-if="error || localError"
      :id="errorId"
      class="cr-input-help cr-error"
    >
      {{ error || localError }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import type { ContractActionParam } from '../../types/contract'
import type { ParamMeta } from '../../types/metadata'
import type { AmountInputInfo } from '../../utils/format'
import {
  DURATION_UNITS,
  composeDuration,
  decodeBytes32Text,
  decomposeDuration,
  encodeBytes32Text,
  enumValuesOf,
  formatDateValue,
  parseDateValue,
  semanticWidget,
  sliderOf,
  storesIsoDate,
} from '../../utils/semantic-inputs'

const props = defineProps<{
  input: ContractActionParam
  meta?: ParamMeta
  error?: string | null
  amount?: AmountInputInfo | null
}>()

const model = defineModel<string>({ default: '' })

const label = computed(() => props.meta?.label || props.input.label)
const description = computed(
  () => props.meta?.description || props.input.description,
)
const disabled = computed(() =>
  Boolean(props.meta?.disabled || props.input.meta?.disabled),
)

const widget = computed(() => semanticWidget(props.input))
const enumValues = computed(() => enumValuesOf(props.input))
const slider = computed(() => sliderOf(props.input))
const storesIso = computed(() => storesIsoDate(props.input))

const typeSuffix = computed(() => {
  if (widget.value === 'date' || widget.value === 'datetime') {
    return storesIso.value ? props.input.type : `${props.input.type}, unix time`
  }
  if (widget.value === 'duration') return `${props.input.type}, seconds`
  return props.input.type
})

const localError = ref<string | null>(null)

// ── Accessible wiring: real label association plus described-by/invalid ──
const uid = useId()
const controlId = `cr-input-${uid}`
const helpId = `cr-input-help-${uid}`
const errorId = `cr-input-error-${uid}`

const describedBy = computed(() => {
  const ids: string[] = []
  if (description.value && props.input.type !== 'bool') ids.push(helpId)
  if (props.error || localError.value) ids.push(errorId)
  return ids.length ? ids.join(' ') : undefined
})

const invalid = computed(() =>
  props.error || localError.value ? true : undefined,
)

// ── date / datetime / timestamp ──
const dateValue = computed(() => {
  if (widget.value !== 'date' && widget.value !== 'datetime') return ''
  return formatDateValue(model.value, widget.value, storesIso.value)
})

function onDateInput(value: string) {
  if (widget.value !== 'date' && widget.value !== 'datetime') return
  model.value = parseDateValue(value, widget.value, storesIso.value)
}

// ── duration: the amount + unit pair is the source of truth while editing
// (deriving the amount back from seconds corrupts fractional entries like
// 1.5 minutes); stored seconds are only decomposed on external changes. ──
const durationUnit = ref(1)
const durationAmount = ref('')

watch(
  model,
  (stored) => {
    if (widget.value !== 'duration') return
    if (stored === composeDuration(durationAmount.value, durationUnit.value)) {
      return
    }
    const { amount, unit } = decomposeDuration(stored)
    durationAmount.value = amount
    durationUnit.value = unit
  },
  { immediate: true },
)

function updateDuration(amount: string, unit: number) {
  durationAmount.value = amount
  durationUnit.value = unit
  model.value = composeDuration(amount, unit)
}

// ── bytes32-utf8: text is local state so an overflowing entry stays visible;
// the stored hex is cleared on overflow so a stale value is never submitted. ──
const utf8Text = ref(
  semanticWidget(props.input) === 'bytes32-utf8'
    ? decodeBytes32Text(model.value)
    : '',
)

watch(model, (stored) => {
  if (widget.value !== 'bytes32-utf8' || localError.value) return
  const decoded = decodeBytes32Text(stored)
  if (decoded !== utf8Text.value) utf8Text.value = decoded
})

function onUtf8Input(text: string) {
  utf8Text.value = text
  localError.value = null
  if (!text) {
    model.value = ''
    return
  }
  try {
    model.value = encodeBytes32Text(text)
  } catch {
    model.value = ''
    localError.value = 'text does not fit into 32 bytes'
  }
}
</script>
