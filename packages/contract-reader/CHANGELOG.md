# @evmnow/contract-reader

## 0.1.1

### Patch Changes

- [`cd55d0c`](https://github.com/evmnow/dapp/commit/cd55d0cf0bfef06614be219f4b78ff4a18793893) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add AccountName component for automatic ENS resolution.

## 0.1.0

### Minor Changes

- [`d48c3c0`](https://github.com/evmnow/dapp/commit/d48c3c06ad97477d0064e7d2481da019dfba5888) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Initial public release.

  `@evmnow/dapp` is a streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.

  `@evmnow/contract-reader` ships the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.

  We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This release is the foundation — alongside the [contract-metadata standard](https://github.com/evmnow/contract-metadata) and [sdk](https://github.com/evmnow/sdk) we're building to power better UX across the ecosystem.
