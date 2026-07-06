# @evmnow/dapp

## 0.2.4

### Patch Changes

- Updated dependencies [[`99aa30a`](https://github.com/evmnow/dapp/commit/99aa30a69b11ad6a2c26b4df0a522e16ca652410), [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7), [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7), [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7)]:
  - @evmnow/contract-reader@0.8.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`ccec8b0`](https://github.com/evmnow/dapp/commit/ccec8b066756b22bbbc791f5e77a57f831cf3675)]:
  - @evmnow/contract-reader@0.7.0

## 0.2.2

### Patch Changes

- Updated dependencies [[`918c7f2`](https://github.com/evmnow/dapp/commit/918c7f25e4724f2b435f1b1cc792e7c6dc657acc)]:
  - @evmnow/contract-reader@0.6.0

## 0.2.1

### Patch Changes

- [`d0f2c59`](https://github.com/evmnow/dapp/commit/d0f2c599ac2d9fb892eaa1a20019d8c96913113c) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Move the generic reader glue from the app into the layer so any consumer gets a complete, wireable contract reader:

  - `useContractWallet` — wallet-layer wiring for `readFunction`/`writeFunction`, SDK `metadataOptions`/`metadataFetch` (moved from the dapp; now falls back to the wallet layer's main chain).
  - `useTokenMetadataResolver` — token-URI metadata resolution with gateways from `appConfig.evm`.
  - `useReaderQueryState` — query-param reader state machine with configurable views.
  - `utils/provider-rpc` — `createProviderRpcFetch` / `PROVIDER_RPC_URL` viem-client-to-fetch bridge.
  - `ActionPanel` component — the responsive list+detail / cards composition (formerly the dapp's `ContractActions`), with slot pass-through to `ActionDetail` (also added to `ActionCards`).
  - `types/view` — shared `ContractView` / `ContractViewState` / `ReaderQueryState` types.
  - `ContractReadParams` gains optional `blockNumber` for historical reads.
  - `Source` accepts a `highlight` function prop; `utils/syntax` adds `loadSyntaxTheme` / `setSyntaxTheme` and a theme argument on `highlightSolidity`.
  - The layer stylesheet now owns all `.cr-*` structural and default visual rules (shell/header/tabs, action items, cards, inputs, warnings, copy button, form-item fixes); apps only remap `--cr-*` tokens.
  - Ship `LICENSE` with the package.

  The dapp now contains only branding, routing, RPC-settings UX and theme token remaps; wagmi/viem are no longer direct dependencies.

- Updated dependencies [[`d0f2c59`](https://github.com/evmnow/dapp/commit/d0f2c599ac2d9fb892eaa1a20019d8c96913113c)]:
  - @evmnow/contract-reader@0.5.0

## 0.2.0

### Minor Changes

- [`6022259`](https://github.com/evmnow/dapp/commit/602225903f5675f8407207f3fd54b401e340f4bf) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Support setting the RPC from a URL query parameter.

  Links can now pass an RPC endpoint per chain using the dappspec `ds-rpc-<chainId>` convention, e.g. `?ds-rpc-1=https%3A%2F%2Frpc.example.org`. The override takes priority over locally saved settings for the duration of the session and is never persisted. A `ds-rpc-1` endpoint is also used for `.eth` ENS resolution, and both the reader and the settings page show a notice while an override is active.

### Patch Changes

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Align amount-input prefix/suffix segments with the reader theme. The form-item group now carries the input border, and the segments no longer draw their own outset ring taller than the field they belong to.

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Hide actions locked to the connected wallet while no wallet is connected.

  An action whose hidden or disabled parameter (or transaction value) autofills from `connected-address` — like the ERC-20 interface's "My Balance" — cannot be invoked without a wallet. The new `actionRequiresConnectedWallet()` util identifies such actions, and the dapp now omits them from the action list until a wallet connects.

- Updated dependencies [[`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b), [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b), [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b), [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b)]:
  - @evmnow/contract-reader@0.4.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`c911301`](https://github.com/evmnow/dapp/commit/c9113015c687dfa8dcc569d04ffb1c0403189c0f), [`c911301`](https://github.com/evmnow/dapp/commit/c9113015c687dfa8dcc569d04ffb1c0403189c0f)]:
  - @evmnow/contract-reader@0.3.0

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
