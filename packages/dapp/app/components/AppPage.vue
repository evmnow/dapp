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

          <AppVersionPill />
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
</script>
