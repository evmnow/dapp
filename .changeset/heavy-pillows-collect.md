---
'@evmnow/contract-reader': minor
'@evmnow/dapp': patch
---

Move the generic reader glue from the app into the layer so any consumer gets a complete, wireable contract reader:

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
