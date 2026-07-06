import { defineConfig } from 'vitest/config'

// Root-level tests cover the repo tooling in scripts/; package tests live in
// each package (run via `pnpm -r --if-present test`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
})
