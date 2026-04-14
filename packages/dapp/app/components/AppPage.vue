<template>
  <main class="page-shell">
    <header>
      <nav aria-label="reader navigation">
        <div class="brand-lockup">
          <NuxtLink
            to="/"
            aria-label="EVM Now"
          >
            <img
              src="/brand/logo-dark.svg"
              alt="EVM Now"
            />
          </NuxtLink>

          <AppVersionPill />
        </div>

        <slot name="nav" />
      </nav>

      <div>
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

    <section :class="contentClass">
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  contentClass?: string
}>()
</script>

<style scoped>
@layer components {
  .page-shell {
    inline-size: min(100%, var(--content-width-wide));
    min-block-size: var(--100vh);
    display: grid;
    gap: var(--size-5);
    align-content: start;
    margin-inline: auto;
    padding: clamp(var(--size-5), 5vw, var(--size-6))
      clamp(var(--size-4), 4vw, var(--size-5));
    background: var(--surface-0);

    > header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;

      > nav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-2);
        align-items: center;
        font-size: var(--font-sm);
        font-weight: 600;

        .brand-lockup {
          display: inline-flex;
          align-items: flex-start;
          gap: var(--size-0);

          > a {
            line-height: 1;
            color: inherit;
            text-decoration: none;

            > img {
              position: relative;
              z-index: 1;
              display: block;
              block-size: var(--size-6);
              inline-size: auto;
            }
          }
        }

        > a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--size-2) var(--size-3);
          border-radius: var(--border-radius);
          color: var(--muted);
          line-height: var(--line-height-md);
          text-decoration: none;

          &:is(:hover, .router-link-active) {
            background: var(--surface-1);
            color: var(--color);
          }
        }
      }

      > div {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-2);
        align-items: center;
        justify-content: flex-end;
        margin-inline-start: auto;
      }
    }

    > section {
      display: grid;
      gap: var(--size-5);
      align-content: start;
    }
  }

  .settings-button {
    inline-size: calc(var(--size-7) + var(--size-2));
    min-inline-size: calc(var(--size-7) + var(--size-2));
    padding-inline: 0;

    .iconify {
      inline-size: var(--size-4);
      block-size: var(--size-4);
    }
  }
}
</style>
