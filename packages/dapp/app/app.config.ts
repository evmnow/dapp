export default defineAppConfig({
  evm: {
    title: 'Contract Reader',
    defaultChain: 'mainnet',
    chains: {
      mainnet: {
        id: 1,
        blockExplorer: 'https://etherscan.io',
      },
    },
  },
})
