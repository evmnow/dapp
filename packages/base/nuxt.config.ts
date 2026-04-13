import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@1001-digital/layers.evm'],
  css: [fileURLToPath(new URL('./app/assets/css/index.css', import.meta.url))],

  hooks: {
    'vite:extendConfig': (config) => {
      config.optimizeDeps ??= {}
      config.optimizeDeps.include = config.optimizeDeps.include || []
      config.optimizeDeps.include = config.optimizeDeps.include.filter(
        (entry) =>
          ![
            '@1001-digital/layers.evm > @metamask/connect-evm',
            '@1001-digital/layers.evm > qrcode',
            '@1001-digital/layers.evm > @walletconnect/ethereum-provider',
            '@1001-digital/layers.evm > @safe-global/safe-apps-sdk',
            '@1001-digital/layers.evm > @safe-global/safe-apps-provider',
          ].includes(entry),
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > @metamask/connect-evm',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > eventemitter3',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > qrcode',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > @walletconnect/ethereum-provider',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > @safe-global/safe-apps-sdk',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > @1001-digital/layers.evm > @safe-global/safe-apps-provider',
      )
      config.optimizeDeps.include.push('@evm-now/base > shiki/core')
      config.optimizeDeps.include.push(
        '@evm-now/base > shiki/engine/javascript',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > shiki/langs/solidity.mjs',
      )
      config.optimizeDeps.include.push(
        '@evm-now/base > shiki/themes/one-light.mjs',
      )
    },
  },

  compatibilityDate: '2026-04-12',
})
