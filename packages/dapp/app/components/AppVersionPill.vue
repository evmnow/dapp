<template>
  <Popover
    v-model:open="open"
    class="open-source-popover"
    side="bottom"
    align="center"
    :side-offset="8"
    arrow
  >
    <template #trigger>
      <button
        type="button"
        class="version-pill"
        @mouseenter="open = true"
        @mouseleave="queueClose"
        @focus="open = true"
      >
        v.0.1
      </button>
    </template>

    <div
      class="open-source-popover__body"
      @mouseenter="clearClose"
      @mouseleave="queueClose"
    >
      <p>
        This is the open source version of
        <a
          href="https://evm.now"
          target="_blank"
          rel="noreferrer"
        >
          evm.now</a
        >. Source code and project updates live on GitHub.
      </p>
      <a
        class="open-source-popover__link"
        :href="repositoryUrl"
        target="_blank"
        rel="noreferrer"
      >
        <span>View the repo on GitHub</span>
        <Icon
          name="lucide:github"
          aria-hidden="true"
        />
      </a>
    </div>
  </Popover>
</template>

<script setup lang="ts">
const repositoryUrl = 'https://github.com/evmnow/dapp'
const open = ref(false)
let closeTimeout: ReturnType<typeof setTimeout> | undefined

function clearClose() {
  if (!closeTimeout) return
  clearTimeout(closeTimeout)
  closeTimeout = undefined
}

function queueClose() {
  clearClose()
  closeTimeout = setTimeout(() => {
    open.value = false
    closeTimeout = undefined
  }, 250)
}
</script>
