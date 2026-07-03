# @evmnow/contract-reader

## 0.4.0

### Minor Changes

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Resolve positional parameter keys (`_0`, `_1`, ...) by position for action params, returns, and examples.

  Interface metadata can only reference parameters positionally, because implementations name them differently — WETH's `approve(guy, wad)` is the same ERC-20 function as OpenZeppelin's `approve(spender, amount)`. Previously the reader matched parameter metadata by ABI name only, so interface-provided actions lost their labels and locked params on such contracts (WETH's "Revoke Approval" rendered raw `guy`/`wad` inputs instead of a single spender field with the amount locked to 0). Name keys win when both forms describe the same parameter, and `applyInputExample` now takes the action inputs as its first argument so positional example keys map onto named fields. Requires `@evmnow/sdk` >= 0.3.0.

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Hide actions locked to the connected wallet while no wallet is connected.

  An action whose hidden or disabled parameter (or transaction value) autofills from `connected-address` — like the ERC-20 interface's "My Balance" — cannot be invoked without a wallet. The new `actionRequiresConnectedWallet()` util identifies such actions, and the dapp now omits them from the action list until a wallet connects.

### Patch Changes

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Keep the spacing above the action's "view code" link consistent whether a form, a result, or nothing at all precedes it.

- [`e552f41`](https://github.com/evmnow/dapp/commit/e552f4193833cec3993ad469f85fcac73e35647b) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Never scale locked (hidden/disabled) parameters by amount decimals when building call arguments. Autofill values are denominated in raw base units per the metadata spec, so an amount-typed locked param (e.g. an unlimited-approval constant) would have been multiplied by 10^decimals again.

## 0.3.0

### Minor Changes

- [`c911301`](https://github.com/evmnow/dapp/commit/c9113015c687dfa8dcc569d04ffb1c0403189c0f) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Render and collect the amount-like semantic types (`eth`, `gwei`, `amount`, `token-amount`) using the canonical `@evmnow/sdk` formatter.

  Function results, single-value reads, and multi-return fields now display amounts scaled by their decimals with a unit symbol. Function inputs for amount types accept a human decimal value (scaled to base units on submit), show a symbol suffix, and — for `token-amount` — resolve the token's on-chain decimals/symbol and offer a balance-backed "max" button. Amount inputs render through the shared `EvmAmountInput`. Requires `@evmnow/sdk` >= 0.2.0 and `@1001-digital/layers.evm` >= 2.9.0.

### Patch Changes

- [`c911301`](https://github.com/evmnow/dapp/commit/c9113015c687dfa8dcc569d04ffb1c0403189c0f) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Force-resolve ENS names in address arguments before executing a read or write.

  Previously an ENS name (e.g. `?fn=balanceOf&args[]=vitalik.eth`) was only substituted with its address when the address input's background resolution had already landed in the shared cache — reads fired before that (URL-driven args, quick submits) passed the raw name to viem and failed with `Address "vitalik.eth" is invalid.` Reads and writes now await `useEnsResolver` for every ENS name in `address` / `address[]` / tuple inputs and surface a clear error when a name cannot be resolved. Requires `@1001-digital/layers.evm` >= 2.8.0.

## 0.2.0

### Minor Changes

- [#6](https://github.com/evmnow/dapp/pull/6) [`eae6567`](https://github.com/evmnow/dapp/commit/eae65677fd01406e3127525d9934c0cd8a6799df) Thanks [@yougogirldoteth](https://github.com/yougogirldoteth)! - Refine contract reader navigation primitives and update @evmnow/sdk to 0.1.4 for proxy target source support.

## 0.1.2

### Patch Changes

- [`da7aa28`](https://github.com/evmnow/dapp/commit/da7aa2868ebdb0511032c9ae2095053a15146544) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Apply semantic type formatting to single-output function results. Previously, a read function returning a single value (e.g. `balanceOf`) ignored the `eth` / `percentage` / `basis-points` / `timestamp` types from metadata and rendered the raw value. Multi-output results were already handled correctly.

## 0.1.1

### Patch Changes

- [`cd55d0c`](https://github.com/evmnow/dapp/commit/cd55d0cf0bfef06614be219f4b78ff4a18793893) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Add AccountName component for automatic ENS resolution.

## 0.1.0

### Minor Changes

- [`d48c3c0`](https://github.com/evmnow/dapp/commit/d48c3c06ad97477d0064e7d2481da019dfba5888) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Initial public release.

  `@evmnow/dapp` is a streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.

  `@evmnow/contract-reader` ships the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.

  We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This release is the foundation — alongside the [contract-metadata standard](https://github.com/evmnow/contract-metadata) and [sdk](https://github.com/evmnow/sdk) we're building to power better UX across the ecosystem.
