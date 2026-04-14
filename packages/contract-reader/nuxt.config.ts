export default defineNuxtConfig({
  ssr: false,
  srcDir: 'app/',
  extends: ['@evm-now/base'],
  typescript: {
    strict: true,
  },
  routeRules: {
    '/': { prerender: true },
    '/settings': { prerender: true },
  },
  runtimeConfig: {
    public: {
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
