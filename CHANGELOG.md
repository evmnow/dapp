# Changelog

All notable changes across all packages in this monorepo.
Generated from individual package changelogs — do not edit manually.

## 2026-04-17

- **Minor** Refine contract reader navigation primitives and update @evmnow/sdk to 0.1.4 for proxy target source support. ([#6](https://github.com/evmnow/dapp/pull/6)) [`eae6567`](https://github.com/evmnow/dapp/commit/eae6567)
  _`contract-reader`_

## 2026-04-15

- Apply semantic type formatting to single-output function results. Previously, a read function returning a single value (e.g. `balanceOf`) ignored the `eth` / `percentage` / `basis-points` / `timestamp` types from metadata and rendered the raw value. Multi-output results were already handled correctly. [`da7aa28`](https://github.com/evmnow/dapp/commit/da7aa28)
  _`contract-reader`_

- Add contract example links to home page. [`31a9d97`](https://github.com/evmnow/dapp/commit/31a9d97)
  _`dapp`_

## 2026-04-14

- **Minor** Initial public release. [`d48c3c0`](https://github.com/evmnow/dapp/commit/d48c3c0)
  `@evmnow/dapp` is a streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.
  `@evmnow/contract-reader` ships the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.
  We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This release is the foundation — alongside the [contract-metadata standard](https://github.com/evmnow/contract-metadata) and [sdk](https://github.com/evmnow/sdk) we're building to power better UX across the ecosystem.
  _`contract-reader`, `dapp`_

## Unknown

- Add AccountName component for automatic ENS resolution. [`cd55d0c`](https://github.com/evmnow/dapp/commit/cd55d0c)
  _`contract-reader`_

- Encode contract function arguments as repeated `args[]` query parameters instead of a JSON string, making shared reader URLs safer for values that include reserved URL characters. [`8c906be`](https://github.com/evmnow/dapp/commit/8c906be)
  _`dapp`_

