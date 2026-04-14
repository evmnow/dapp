import { fileURLToPath } from 'node:url'

interface ViteConfig {
  optimizeDeps?: { include?: string[] }
}

const PKG = '@evmnow/contract-reader'
const LAYERS = '@1001-digital/layers.evm'

const LAYERS_DEPS = [
  '@metamask/connect-evm',
  'eventemitter3',
  'qrcode',
  '@walletconnect/ethereum-provider',
  '@safe-global/safe-apps-sdk',
  '@safe-global/safe-apps-provider',
]

const SHIKI_DEPS = [
  'shiki/core',
  'shiki/engine/javascript',
  'shiki/langs/solidity.mjs',
  'shiki/themes/one-light.mjs',
]

export default defineNuxtConfig({
  extends: [LAYERS],
  css: [fileURLToPath(new URL('./app/assets/css/index.css', import.meta.url))],

  hooks: {
    'vite:extendConfig': (config: ViteConfig) => {
      config.optimizeDeps ??= {}
      config.optimizeDeps.include ??= []

      const stripped = LAYERS_DEPS.filter((d) => d !== 'eventemitter3').map(
        (d) => `${LAYERS} > ${d}`,
      )
      config.optimizeDeps.include = config.optimizeDeps.include.filter(
        (entry) => !stripped.includes(entry),
      )

      config.optimizeDeps.include.push(
        ...LAYERS_DEPS.map((d) => `${PKG} > ${LAYERS} > ${d}`),
        ...SHIKI_DEPS.map((d) => `${PKG} > ${d}`),
      )
    },
  },

  compatibilityDate: '2026-04-12',
})
