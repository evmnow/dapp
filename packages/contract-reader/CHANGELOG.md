# @evmnow/contract-reader

## 0.9.0

### Minor Changes

- [`a0cff7b`](https://github.com/evmnow/dapp/commit/a0cff7b119135be4f904e6cbf61f03b8cffc2a0e) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Resolve and reverse-resolve ENS (`.eth`), GNS (`.gwei`), and WNS (`.wei`) names across contract lookup, ABI address inputs, result displays, and the connected-wallet label.

## 0.8.0

### Minor Changes

- [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - New public composables and a component that extract generic reader orchestration out of consuming apps:

  - `useContractReaderView` — the shared reader-page orchestration: tab derivation from the ABI, view-state mapping over `useReaderQueryState`, wallet-gated action filtering, function source selection, overview stat links, and read-error bookkeeping (including clearing call errors on navigation and refetching metadata off discrete chain-id/RPC watch sources). Hosts wire it to their own wallet/metadata configuration and keep only branding and layout in the page.
  - `useTokenAmountMeta` — token metadata resolution for amount-like params: resolves token identity (decimals/symbol, lowercased-address keyed, in-flight deduplicated) and connected-wallet balances, and derives per-input amount rendering/parsing info.
  - `ActionResultPanel` (`components/Action/ResultPanel.vue`) — the read-result live region previously inlined in `ActionDetail`, rendering loading/fields/single-value/error states with the `address` slot passthrough.

  `ActionDetail` and the playground/reader pages now consume these; behavior is unchanged.

### Patch Changes

- [`99aa30a`](https://github.com/evmnow/dapp/commit/99aa30a69b11ad6a2c26b4df0a522e16ca652410) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - The action detail's vertical rhythm is now owned entirely by its grid gap (`--cr-action-detail-gap`) instead of a mix of gap and per-block margins. Grid auto-rows don't reliably include child margins in track sizing — a margined block (e.g. a custom `_component` card) could overflow its row and swallow the next section's spacing, making the gap above the source link inconsistent. Child margins inside `.cr-action-detail` are now neutralized, and every section — results, previews, custom components — gets the same separation. Tune spacing via `--cr-action-detail-gap`.

- [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Upgrade @evmnow/sdk to ^0.7.0: fixed Sourcify v2 integration (runtimeBytecode), chain-scoped metadata repository lookups, hardened merge/ENS/address handling, and new modular exports.

- [`5100264`](https://github.com/evmnow/dapp/commit/5100264014cd23e39d77e79089f1b2d175d1b5f7) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - A round of correctness, security, performance, accessibility and packaging fixes across the reader:

  - Reads are now guarded by a request-generation counter (and action details are keyed per action), so switching actions while a read is in flight can no longer write a stale result or error into the new action's view.
  - Malformed `min`/`max` bounds in payable value validation metadata no longer throw and break rendering — unparseable bounds are ignored. A non-empty transaction value that doesn't parse as ETH now shows a visible error and disables sending even without a metadata validation rule.
  - `writeContractFunction` string values are now always ETH-denominated (`"1"` used to be treated as 1 wei while `"1.5"` was 1.5 ETH); bigints remain wei.
  - Token info is keyed by lowercased address on both write and read, so checksummed metadata addresses resolve the same entry, and concurrent token metadata lookups are deduplicated in flight.
  - Amount-like tuple members now render the same human-decimal amount input that arg building scales on submit, instead of silently multiplying raw input by 10^decimals.
  - External metadata URLs are scheme-allowlisted (`https:`/`http:`/`data:image/*`) before binding into `img`/`iframe`/`a` sinks, and metadata-supplied validation regexes are length-capped and compiled once (invalid patterns are ignored) to mitigate ReDoS.
  - Shiki (and the solidity grammar) now loads lazily when a source view first renders instead of shipping in the initial chunk, and token metadata gateway fetches time out after 15s instead of hanging forever.
  - Inputs are associated with real labels and expose `aria-describedby`/`aria-invalid`; read results/errors announce via a polite live region; card expanders expose `aria-expanded`/`aria-controls`; preview toggles expose `aria-pressed`; the copy button shows a brief failed state when clipboard access is denied.
  - Packaging: `nuxt`/`vue` are declared as peer dependencies, `viem` moved to a caret range compatible with `@wagmi/core`'s peer range, and the deep import into the wallet layer's ENS cache is isolated behind a single adapter module.

## 0.7.0

### Minor Changes

- [`ccec8b0`](https://github.com/evmnow/dapp/commit/ccec8b066756b22bbbc791f5e77a57f831cf3675) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Host-extensibility release — everything a consuming app previously had to work around is now a first-class API:

  - **msg.value is exposed**: a new `value-field` slot (with `value`/`setValue`/`meta`/`label`/`disabled`/`error` scope) lets hosts render their own payable-value input, and the `actions` slot scope now includes `value` (ETH string) and `valueWei` for confirmation previews.
  - **Tuple-aware `field` slot**: the slot scope now exposes the full input record (`values`, `errors`, `setValue`) plus the resolved `amount` info, so hosts can render tuple members and amount inputs over layer state instead of mirroring it.
  - **Robust read triggers**: reads triggered while one is in flight are queued instead of dropped; a changed `readFunction` identity refreshes a displayed result (time-travel/block pickers); new `autoReadWithArgs` prop auto-executes parameterized reads when hydrated `args` fill the form validly (deep links); `ActionDetail` exposes `read()` via template ref.
  - **Semantic input widgets**: `enum` (select), `slider` (range), `date`/`datetime`/`timestamp` (pickers storing unix seconds, ISO for string params, timezone-safe), `duration` (amount + unit, seconds storage), and `bytes32-utf8` (text stored as right-padded hex, no stale value on overflow) — in `ActionInput`, shared by all consumers.
  - **`_component` extension registry**: `registerActionComponent(type, component)` + `resolveActionComponent(meta)` (`utils/custom-components`); `ActionDetail` renders registered components in its preview area with `{ value, config, args, address, abi, action }`, and exposes `customComponent`/`customArgs` in the `preview` slot scope.
  - **Injectable token resolution**: a `resolveTokenInfo` prop (on `ActionDetail`/`ActionPanel`/`ActionCards`) replaces the built-in per-token `eth_call`s, e.g. with an indexer API; `readFunction` remains the fallback.
  - **Types align with the SDK**: `types/metadata` now re-exports the document types from `@evmnow/sdk` (with `SemanticType` aliasing `ParamType`), keeping only the layer-specific `ParamMeta.components` and `_component` extensions local. Requires `@evmnow/sdk >= 0.6.0`.

## 0.6.0

### Minor Changes

- [`918c7f2`](https://github.com/evmnow/dapp/commit/918c7f25e4724f2b435f1b1cc792e7c6dc657acc) Thanks [@jwahdatehagh](https://github.com/jwahdatehagh)! - Resolve legacy ZeppelinOS (pre-EIP-1967) proxies via `@evmnow/sdk` 0.4.0.

  Contracts like Circle's USDC (`FiatTokenProxy`) store their implementation at `keccak256('org.zeppelinos.proxy.implementation')` and previously surfaced only the proxy's own ABI — the read/interact views showed the upgrade/admin functions instead of the implementation's. They now resolve through the standard proxy pipeline, so the ERC-20 functions (with their NatSpec) appear as expected.

## 0.5.0

### Minor Changes

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
