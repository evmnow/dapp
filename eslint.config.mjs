import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

// Standalone Nuxt flat config for the whole monorepo (layer + apps).
// Recommended + TypeScript rules only — formatting stays with Prettier
// (stylistic rules are disabled by default).
export default createConfigForNuxt({
  features: {
    tooling: false,
  },
})
  .prepend({
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/.nuxt',
      '**/.output',
      '**/.data',
      'CHANGELOG.md',
      'packages/*/CHANGELOG.md',
    ],
  })
  .append({
    rules: {
      // Prettier owns formatting and self-closes void elements (`<img />`);
      // this rule's default wants the opposite. Stylistic — off.
      'vue/html-self-closing': 'off',
      // Props are typed via TS with optional members; injecting artificial
      // runtime defaults would change semantics (undefined vs default).
      'vue/require-default-prop': 'off',
    },
  })
  .append({
    files: [
      'packages/contract-reader/app/components/**/*.vue',
      '**/app/pages/**/*.vue',
      '**/app/app.vue',
      '**/app/error.vue',
      'packages/contract-reader/.playground/app/pages/**/*.vue',
    ],
    rules: {
      // Layer components register under multi-word names through their
      // directory prefix (Action/Cards.vue → <ActionCards>), and top-level
      // single-word names (Overview, Source, Markdown) are the published
      // component API — renaming them is a breaking change. Pages, app.vue
      // and error.vue follow Nuxt's fixed file names (the .playground entry
      // is required separately: `**` does not match dot-directories).
      'vue/multi-word-component-names': 'off',
    },
  })
