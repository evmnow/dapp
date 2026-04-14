import { version } from './package.json'

export default defineNuxtConfig({
  ssr: false,
  srcDir: 'app/',
  extends: ['@evmnow/contract-reader'],
  typescript: {
    strict: true,
  },
  routeRules: {
    '/': { prerender: true },
    '/settings': { prerender: true },
  },
  runtimeConfig: {
    public: {
      appVersion: version,
      defaultChainId: 1,
      defaultRpc: '',
      mainnetEnsRpc: '',
      evm: {
        walletConnectProjectId: '',
        chains: {
          mainnet: {
            rpcs: '',
          },
        },
      },
    },
  },
  css: ['~/assets/css/contract-reader.css'],
  app: {
    head: {
      title: 'Contract Reader',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg?v=1.0' },
        { rel: 'icon', type: 'image/png', href: '/icon.png?v=1.0' },
        { rel: 'apple-touch-icon', href: '/icon.png?v=1.0' },
      ],
    },
  },
})
