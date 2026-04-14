<template>
  <footer class="app-footer">
    <a
      href="https://evm.now"
      target="_blank"
      rel="noreferrer"
      aria-label="evm.now"
      title="evm.now"
    >
      <Icon
        name="lucide:globe"
        aria-hidden="true"
      />
    </a>
    <a
      :href="repositoryUrl"
      target="_blank"
      rel="noreferrer"
      aria-label="View the repo on GitHub"
      title="View the repo on GitHub"
    >
      <Icon
        name="lucide:github"
        aria-hidden="true"
      />
    </a>
    <a
      href="https://x.com/evmnow"
      target="_blank"
      rel="noreferrer"
      aria-label="Follow @evmnow on X"
      title="Follow @evmnow on X"
    >
      <Icon
        name="simple-icons:x"
        aria-hidden="true"
      />
    </a>
  </footer>
</template>

<script setup lang="ts">
const repositoryUrl = 'https://github.com/evmnow/dapp'
</script>

<style scoped>
@layer components {
  .app-footer {
    position: fixed;
    bottom: var(--size-4);
    left: var(--size-4);
    display: inline-flex;
    gap: var(--size-3);
    align-items: center;
    z-index: 1;

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      line-height: 1;
      transition: color 0.15s ease;

      &:hover,
      &:focus-visible {
        color: var(--color);
      }

      .iconify {
        width: var(--size-4);
        height: var(--size-4);
      }
    }
  }
}
</style>
