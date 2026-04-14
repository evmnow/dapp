<template>
  <section class="cr-overview">
    <div
      v-if="contract.metadata?.description"
      class="cr-panel cr-overview-card"
    >
      <slot
        name="description"
        :contract="contract"
        :description="contract.metadata.description"
      >
        <p class="cr-muted">
          {{ contract.metadata.description }}
        </p>
      </slot>
    </div>

    <div class="cr-overview-grid">
      <div
        v-for="stat in stats"
        :key="stat.key"
        class="cr-panel cr-stat"
      >
        <slot
          name="stat"
          :contract="contract"
          :stat="stat"
        >
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </slot>
      </div>
    </div>

    <div
      v-if="contract.metadata?.about"
      class="cr-panel cr-about"
    >
      <slot
        name="about"
        :contract="contract"
        :about="contract.metadata.about"
      >
        <Markdown :text="contract.metadata.about" />
      </slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ContractData } from '../types/contract'

interface OverviewStat {
  key: string
  label: string
  value: string | number
}

const props = defineProps<{
  contract: ContractData
  stats?: OverviewStat[]
}>()

defineSlots<{
  description?: (props: {
    contract: ContractData
    description: string
  }) => unknown
  stat?: (props: { contract: ContractData; stat: OverviewStat }) => unknown
  about?: (props: { contract: ContractData; about: string }) => unknown
}>()

const stats = computed<OverviewStat[]>(() => {
  if (props.stats) return props.stats

  return [
    {
      key: 'read',
      label: 'read functions',
      value: props.contract.functions.read.length,
    },
    {
      key: 'write',
      label: 'interact functions',
      value: props.contract.functions.write.length,
    },
    {
      key: 'source',
      label: 'source files',
      value: props.contract.sourceFiles.length,
    },
    {
      key: 'type',
      label: 'type',
      value: props.contract.contractType,
    },
  ]
})
</script>
