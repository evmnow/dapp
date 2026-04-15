<template>
  <section class="cr-overview">
    <Card
      v-if="contract.metadata?.description"
      class="cr-overview-card"
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
    </Card>

    <div class="cr-overview-grid">
      <Card
        v-for="stat in resolvedStats"
        :key="stat.key"
        class="cr-stat"
      >
        <slot
          name="stat"
          :contract="contract"
          :stat="stat"
        >
          <span class="cr-stat-label">{{ stat.label }}</span>
          <strong class="cr-stat-value">{{ stat.value }}</strong>
        </slot>
        <CardLink
          v-if="stat.to"
          :to="stat.to"
          :title="`View ${stat.label}`"
        />
      </Card>
    </div>

    <Card
      v-if="contract.metadata?.about"
      class="cr-about"
    >
      <slot
        name="about"
        :contract="contract"
        :about="contract.metadata.about"
      >
        <Markdown :text="contract.metadata.about" />
      </slot>
    </Card>
  </section>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ContractData } from '../types/contract'

interface OverviewStat {
  key: string
  label: string
  value: string | number
  to?: RouteLocationRaw
}

const props = defineProps<{
  contract: ContractData
  stats?: OverviewStat[]
  linkResolver?: (stat: OverviewStat) => RouteLocationRaw | undefined
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
      label: 'read actions',
      value: props.contract.actions.read.length,
    },
    {
      key: 'write',
      label: 'interact actions',
      value: props.contract.actions.write.length,
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

const resolvedStats = computed<OverviewStat[]>(() =>
  stats.value.map((stat) => ({
    ...stat,
    to: stat.to ?? props.linkResolver?.(stat),
  })),
)
</script>
