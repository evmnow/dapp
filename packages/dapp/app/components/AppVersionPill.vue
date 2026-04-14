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
      <Button
        type="button"
        class="version-pill small"
        @mouseenter="open = true"
        @mouseleave="queueClose"
      >
        v{{ version }}
      </Button>
    </template>

    <section
      @mouseenter="clearClose"
      @mouseleave="queueClose"
    >
      <p>
        This is a simplified and open source version of
        <a
          href="https://evm.now"
          target="_blank"
          rel="noreferrer"
        >
          evm.now</a
        >
        designed for reading and interacting with smart contracts on Ethereum or
        other EVM-compatible chains.
      </p>
      <p>Source code and project updates live on GitHub.</p>
      <a
        :href="repositoryUrl"
        target="_blank"
        rel="noreferrer"
      >
        <Icon
          name="lucide:github"
          aria-hidden="true"
        />
        <span>View the repo on GitHub</span>
      </a>
    </section>
  </Popover>
</template>

<script setup lang="ts">
const repositoryUrl = 'https://github.com/evmnow/dapp'
const { appVersion: version } = useRuntimeConfig().public
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
    if (!open.value) return
    open.value = false
  }, 500)
}
</script>

<style scoped>
@layer components {
  .version-pill {
    --button-border-color-highlight: var(--muted);
    --button-color: var(--muted);
    --border-shadow-highlight: var(--border-shadow);
    --button-border-radius: var(--size-10);

    top: calc(-1 * var(--size-3));
    left: calc(-1 * var(--size-2));
    height: var(--size-4);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-bold);
    padding: var(--size-0) var(--size-1) var(--size-0)
      calc(var(--size-2) - var(--size-0));
    cursor: help;
  }

  .open-source-popover {
    --popover-width: calc(var(--form-width) - var(--size-7));
    --popover-min-width: calc(var(--content-width-sm) / 2);
    --popover-padding: var(--size-4);

    section {
      display: grid;
      gap: var(--size-3);

      p {
        margin: 0;
        color: var(--muted);
        font-size: var(--font-sm);
        line-height: var(--line-height-lg);
      }

      a {
        color: var(--color);
        font-weight: var(--font-weight-bold);
        text-decoration: underline;
        text-underline-offset: 0.19em;
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: var(--size-2);
        color: var(--color);
        font-size: var(--font-sm);
        font-weight: 700;
        line-height: var(--line-height-md);

        .iconify {
          width: var(--size-4);
          height: var(--size-4);
        }
      }
    }
  }
}
</style>
