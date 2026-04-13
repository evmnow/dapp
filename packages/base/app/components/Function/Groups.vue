<template>
  <template v-if="allGroups.length">
    <template
      v-for="(group, index) in allGroups"
      :key="group.key"
    >
      <section class="cr-function-group">
        <slot
          name="header"
          :group="group"
          :index="index"
          :functions="group.functions"
        >
          <div class="cr-group-title">
            <span>
              {{ group.label }}
              <span>({{ group.functions.length }})</span>
            </span>

            <slot
              v-if="index === 0"
              name="actions"
            />
          </div>
        </slot>

        <div class="cr-function-group-body">
          <slot
            name="group"
            :group="group"
            :functions="group.functions"
          />
        </div>
      </section>
    </template>
  </template>

  <p
    v-else
    class="cr-empty cr-muted"
  >
    no functions found
  </p>
</template>

<script setup lang="ts">
import type { ContractFunction } from '../../types/contract'
import type { ContractUIMetadata } from '../../types/metadata'
import { groupFunctions } from '../../utils/abi'

const props = withDefaults(
  defineProps<{
    functions: ContractFunction[]
    metadata?: ContractUIMetadata
    allFunctionNames?: Set<string>
    title?: string
  }>(),
  {
    title: 'functions',
  },
)

const groups = computed(() =>
  groupFunctions(props.functions, props.metadata, props.allFunctionNames),
)

const allGroups = computed(() => {
  const { grouped, ungrouped, constants } = groups.value
  const result = [...grouped]

  if (ungrouped.length) {
    const hasOtherGroups = grouped.length || constants.length
    result.push({
      key: '_ungrouped',
      label: hasOtherGroups ? 'Other' : props.title,
      functions: ungrouped,
    })
  }

  if (constants.length) {
    result.push({ key: '_constants', label: 'Constants', functions: constants })
  }

  return result
})
</script>
