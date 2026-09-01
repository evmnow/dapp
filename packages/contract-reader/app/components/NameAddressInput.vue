<template>
  <div class="name-address-input">
    <EvmAddressInput
      v-bind="$attrs"
      v-model="model"
      :placeholder="placeholder"
    />
    <small
      v-if="display"
      class="name-address-result"
    >
      <CopyText
        :value="display"
        :text="display"
      />
    </small>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { isAddress } from 'viem'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    placeholder?: string
  }>(),
  { placeholder: 'Address or Ethereum name' },
)

const model = defineModel<string>({ default: '' })
const display = ref('')
const { resolveAddress, reverseAddress, system } = useEthereumNames()
let timer: ReturnType<typeof setTimeout> | undefined
let run = 0

watch(
  model,
  (value) => {
    clearTimeout(timer)
    display.value = ''
    const current = ++run
    const identifier = value.trim()
    if (!identifier) return

    timer = setTimeout(async () => {
      try {
        if (isAddress(identifier)) {
          const name = await reverseAddress(identifier)
          if (current === run && name && system(name) !== 'ens')
            display.value = name
          return
        }

        if (!identifier.includes('.') || system(identifier) === 'ens') return
        const address = await resolveAddress(identifier)
        if (current === run && address) display.value = address
      } catch {
        if (current === run) display.value = ''
      }
    }, 400)
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(timer))
</script>

<style scoped>
.name-address-input {
  display: grid;
  gap: var(--size-1);
}

.name-address-result {
  color: var(--muted);
  font-family: var(--ui-font-family);
  font-size: var(--small-font-size);
  overflow-wrap: anywhere;
  padding-inline-start: var(--ui-padding-inline);
  text-transform: none;
}
</style>
