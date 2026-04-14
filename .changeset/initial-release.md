---
'@evmnow/dapp': minor
'@evmnow/contract-reader': minor
---

Initial public release.

`@evmnow/dapp` is a streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.

`@evmnow/contract-reader` ships the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.

We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This release is the foundation — alongside the [contract-metadata standard](https://github.com/evmnow/contract-metadata) and [sdk](https://github.com/evmnow/sdk) we're building to power better UX across the ecosystem.
