# @evmnow/dapp

## 0.1.3

### Patch Changes

- Updated dependencies [[`eae6567`](https://github.com/evmnow/dapp/commit/eae65677fd01406e3127525d9934c0cd8a6799df)]:
  - @evmnow/contract-reader@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [[`da7aa28`](https://github.com/evmnow/dapp/commit/da7aa2868ebdb0511032c9ae2095053a15146544)]:
  - @evmnow/contract-reader@0.1.2

## 0.1.1

### Patch Changes

- [`8c906be`](https://github.com/evmnow/dapp/commit/8c906be5b79cbe6ade88133e609c6bbfb6e31c6d) Thanks [@yougogirldoteth](https://github.com/yougogirldoteth)! - Encode contract function arguments as repeated `args[]` query parameters instead of a JSON string, making shared reader URLs safer for values that include reserved URL characters.

- [`31a9d97`](https://github.com/evmnow/dapp/commit/31a9d971208e3ffa49d35494a46a5069a1898f7d) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add contract example links to home page.

- Updated dependencies [[`cd55d0c`](https://github.com/evmnow/dapp/commit/cd55d0cf0bfef06614be219f4b78ff4a18793893)]:
  - @evmnow/contract-reader@0.1.1

## 0.1.0

### Minor Changes

- [`d48c3c0`](https://github.com/evmnow/dapp/commit/d48c3c06ad97477d0064e7d2481da019dfba5888) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Initial public release.

  `@evmnow/dapp` is a streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.

  `@evmnow/contract-reader` ships the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.

  We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This release is the foundation — alongside the [contract-metadata standard](https://github.com/evmnow/contract-metadata) and [sdk](https://github.com/evmnow/sdk) we're building to power better UX across the ecosystem.

### Patch Changes

- Updated dependencies [[`d48c3c0`](https://github.com/evmnow/dapp/commit/d48c3c06ad97477d0064e7d2481da019dfba5888)]:
  - @evmnow/contract-reader@0.1.0
