import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        // app/utils/ens-cache.ts deep-imports the wallet layer
        // (`@1001-digital/layers.evm`), which only loads inside a Nuxt
        // context — tests substitute an in-memory cache with the same shape.
        find: /^\.\/ens-cache$/,
        replacement: fileURLToPath(
          new URL('./test/stubs/ens-cache.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
