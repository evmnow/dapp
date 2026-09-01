# Changelog

All notable changes across all packages in this monorepo.
Generated from individual package changelogs — do not edit manually.

## 2026-09-01

- **Minor** Resolve and reverse-resolve ENS (`.eth`), GNS (`.gwei`), and WNS (`.wei`) names across contract lookup, ABI address inputs, result displays, and the connected-wallet label. [`a0cff7b`](https://github.com/evmnow/dapp/commit/a0cff7b)
  _`contract-reader`, `dapp`_

## 2026-07-13

- **Minor** Add a "Test RPC Connection" button to the settings page. ([#15](https://github.com/evmnow/dapp/pull/15)) [`ca58b3d`](https://github.com/evmnow/dapp/commit/ca58b3d)
  The button sends an `eth_chainId` request to the effective reader RPC and reports success, connection failures, or a mismatch between the returned chain ID and the configured one — handy for verifying a local dev endpoint before using it.
  _`dapp`_

## 2026-07-06

- **Minor** New public composables and a component that extract generic reader orchestration out of consuming apps: [`5100264`](https://github.com/evmnow/dapp/commit/5100264)
  - `useContractReaderView` — the shared reader-page orchestration: tab derivation from the ABI, view-state mapping over `useReaderQueryState`, wallet-gated action filtering, function source selection, overview stat links, and read-error bookkeeping (including clearing call errors on navigation and refetching metadata off discrete chain-id/RPC watch sources). Hosts wire it to their own wallet/metadata configuration and keep only branding and layout in the page.
  - `useTokenAmountMeta` — token metadata resolution for amount-like params: resolves token identity (decimals/symbol, lowercased-address keyed, in-flight deduplicated) and connected-wallet balances, and derives per-input amount rendering/parsing info.
  - `ActionResultPanel` (`components/Action/ResultPanel.vue`) — the read-result live region previously inlined in `ActionDetail`, rendering loading/fields/single-value/error states with the `address` slot passthrough.
  `ActionDetail` and the playground/reader pages now consume these; behavior is unchanged.
  _`contract-reader`_

- The action detail's vertical rhythm is now owned entirely by its grid gap (`--cr-action-detail-gap`) instead of a mix of gap and per-block margins. Grid auto-rows don't reliably include child margins in track sizing — a margined block (e.g. a custom `_component` card) could overflow its row and swallow the next section's spacing, making the gap above the source link inconsistent. Child margins inside `.cr-action-detail` are now neutralized, and every section — results, previews, custom components — gets the same separation. Tune spacing via `--cr-action-detail-gap`. [`99aa30a`](https://github.com/evmnow/dapp/commit/99aa30a)
  _`contract-reader`_

- **Minor** Host-extensibility release — everything a consuming app previously had to work around is now a first-class API: [`ccec8b0`](https://github.com/evmnow/dapp/commit/ccec8b0)
  - **msg.value is exposed**: a new `value-field` slot (with `value`/`setValue`/`meta`/`label`/`disabled`/`error` scope) lets hosts render their own payable-value input, and the `actions` slot scope now includes `value` (ETH string) and `valueWei` for confirmation previews.
  - **Tuple-aware `field` slot**: the slot scope now exposes the full input record (`values`, `errors`, `setValue`) plus the resolved `amount` info, so hosts can render tuple members and amount inputs over layer state instead of mirroring it.
  - **Robust read triggers**: reads triggered while one is in flight are queued instead of dropped; a changed `readFunction` identity refreshes a displayed result (time-travel/block pickers); new `autoReadWithArgs` prop auto-executes parameterized reads when hydrated `args` fill the form validly (deep links); `ActionDetail` exposes `read()` via template ref.
  - **Semantic input widgets**: `enum` (select), `slider` (range), `date`/`datetime`/`timestamp` (pickers storing unix seconds, ISO for string params, timezone-safe), `duration` (amount + unit, seconds storage), and `bytes32-utf8` (text stored as right-padded hex, no stale value on overflow) — in `ActionInput`, shared by all consumers.
  - **`_component` extension registry**: `registerActionComponent(type, component)` + `resolveActionComponent(meta)` (`utils/custom-components`); `ActionDetail` renders registered components in its preview area with `{ value, config, args, address, abi, action }`, and exposes `customComponent`/`customArgs` in the `preview` slot scope.
  - **Injectable token resolution**: a `resolveTokenInfo` prop (on `ActionDetail`/`ActionPanel`/`ActionCards`) replaces the built-in per-token `eth_call`s, e.g. with an indexer API; `readFunction` remains the fallback.
  - **Types align with the SDK**: `types/metadata` now re-exports the document types from `@evmnow/sdk` (with `SemanticType` aliasing `ParamType`), keeping only the layer-specific `ParamMeta.components` and `_component` extensions local. Requires `@evmnow/sdk >= 0.6.0`.
  _`contract-reader`_

## 2026-07-05

- **Minor** Resolve legacy ZeppelinOS (pre-EIP-1967) proxies via `@evmnow/sdk` 0.4.0. [`918c7f2`](https://github.com/evmnow/dapp/commit/918c7f2)
  Contracts like Circle's USDC (`FiatTokenProxy`) store their implementation at `keccak256('org.zeppelinos.proxy.implementation')` and previously surfaced only the proxy's own ABI — the read/interact views showed the upgrade/admin functions instead of the implementation's. They now resolve through the standard proxy pipeline, so the ERC-20 functions (with their NatSpec) appear as expected.
  _`contract-reader`_

- **Minor** Move the generic reader glue from the app into the layer so any consumer gets a complete, wireable contract reader: [`d0f2c59`](https://github.com/evmnow/dapp/commit/d0f2c59)
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
  _`contract-reader`, `dapp`_

## 2026-07-03

- **Minor** Resolve positional parameter keys (`_0`, `_1`, ...) by position for action params, returns, and examples. [`e552f41`](https://github.com/evmnow/dapp/commit/e552f41)
  Interface metadata can only reference parameters positionally, because implementations name them differently — WETH's `approve(guy, wad)` is the same ERC-20 function as OpenZeppelin's `approve(spender, amount)`. Previously the reader matched parameter metadata by ABI name only, so interface-provided actions lost their labels and locked params on such contracts (WETH's "Revoke Approval" rendered raw `guy`/`wad` inputs instead of a single spender field with the amount locked to 0). Name keys win when both forms describe the same parameter, and `applyInputExample` now takes the action inputs as its first argument so positional example keys map onto named fields. Requires `@evmnow/sdk` >= 0.3.0.
  _`contract-reader`, `dapp`_

- **Minor** Render and collect the amount-like semantic types (`eth`, `gwei`, `amount`, `token-amount`) using the canonical `@evmnow/sdk` formatter. [`c911301`](https://github.com/evmnow/dapp/commit/c911301)
  Function results, single-value reads, and multi-return fields now display amounts scaled by their decimals with a unit symbol. Function inputs for amount types accept a human decimal value (scaled to base units on submit), show a symbol suffix, and — for `token-amount` — resolve the token's on-chain decimals/symbol and offer a balance-backed "max" button. Amount inputs render through the shared `EvmAmountInput`. Requires `@evmnow/sdk` >= 0.2.0 and `@1001-digital/layers.evm` >= 2.9.0.
  _`contract-reader`_

- **Minor** Support setting the RPC from a URL query parameter. [`6022259`](https://github.com/evmnow/dapp/commit/6022259)
  Links can now pass an RPC endpoint per chain using the dappspec `ds-rpc-<chainId>` convention, e.g. `?ds-rpc-1=https%3A%2F%2Frpc.example.org`. The override takes priority over locally saved settings for the duration of the session and is never persisted. A `ds-rpc-1` endpoint is also used for `.eth` ENS resolution, and both the reader and the settings page show a notice while an override is active.
  _`dapp`_

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

