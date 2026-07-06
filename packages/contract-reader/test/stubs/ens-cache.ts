// Test stand-in for app/utils/ens-cache.ts: the real module deep-imports the
// wallet layer (`@1001-digital/layers.evm`), which cannot load outside a
// Nuxt context. Only the `get` surface used by app/utils/inputs.ts matters.
export const ensCache = new Map<string, { address?: string | null }>()
