<template>
  <main class="page-shell">
    <header class="page-header">
      <nav
        class="page-nav"
        aria-label="reader navigation"
      >
        <div class="brand-lockup">
          <NuxtLink
            to="/"
            class="brand-link"
            aria-label="EVM Now"
          >
            <img
              class="brand-logo"
              src="/brand/logo-dark.svg"
              alt="EVM Now"
            />
          </NuxtLink>

          <Popover
            v-model:open="brandPopoverOpen"
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
                @mouseenter="brandPopoverOpen = true"
                @mouseleave="queueBrandPopoverClose"
                @focus="brandPopoverOpen = true"
              >
                v.0.1
              </button>
            </template>

            <div
              class="open-source-popover__body"
              @mouseenter="clearBrandPopoverClose"
              @mouseleave="queueBrandPopoverClose"
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
        </div>

        <slot name="nav" />
      </nav>

      <div class="page-actions">
        <AppWalletButton />

        <Button
          to="/settings"
          class="wallet-button settings-button"
          aria-label="Settings"
          title="Settings"
        >
          <Icon
            name="lucide:settings"
            aria-hidden="true"
          />
        </Button>
      </div>
    </header>

    <section
      class="page-content"
      :class="contentClass"
    >
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  contentClass?: string
}>()

const repositoryUrl = 'https://github.com/wildwhite-agent/contract-reader'
const brandPopoverOpen = ref(false)
let brandPopoverCloseTimeout: ReturnType<typeof setTimeout> | undefined

function clearBrandPopoverClose() {
  if (!brandPopoverCloseTimeout) return
  clearTimeout(brandPopoverCloseTimeout)
  brandPopoverCloseTimeout = undefined
}

function queueBrandPopoverClose() {
  clearBrandPopoverClose()
  brandPopoverCloseTimeout = setTimeout(() => {
    brandPopoverOpen.value = false
    brandPopoverCloseTimeout = undefined
  }, 250)
}
</script>
