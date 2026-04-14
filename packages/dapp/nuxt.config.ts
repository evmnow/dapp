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
    },
  },
})
