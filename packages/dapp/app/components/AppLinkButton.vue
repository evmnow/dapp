<template>
  <Button
    :to="to"
    :target="target"
    v-bind="linkProps"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  to: RouteLocationRaw
  target?: string
  replace?: boolean
  activeClass?: string
  exactActiveClass?: string
  ariaCurrentValue?: string
}>()

const attrs = useAttrs()
const linkProps = computed(() => ({
  ...attrs,
  replace: props.replace,
  activeClass: props.activeClass,
  exactActiveClass: props.exactActiveClass,
  ariaCurrentValue: props.ariaCurrentValue,
}))
</script>
