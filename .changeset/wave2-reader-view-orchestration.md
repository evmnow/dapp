---
'@evmnow/contract-reader': minor
---

New public composables and a component that extract generic reader orchestration out of consuming apps:

- `useContractReaderView` — the shared reader-page orchestration: tab derivation from the ABI, view-state mapping over `useReaderQueryState`, wallet-gated action filtering, function source selection, overview stat links, and read-error bookkeeping (including clearing call errors on navigation and refetching metadata off discrete chain-id/RPC watch sources). Hosts wire it to their own wallet/metadata configuration and keep only branding and layout in the page.
- `useTokenAmountMeta` — token metadata resolution for amount-like params: resolves token identity (decimals/symbol, lowercased-address keyed, in-flight deduplicated) and connected-wallet balances, and derives per-input amount rendering/parsing info.
- `ActionResultPanel` (`components/Action/ResultPanel.vue`) — the read-result live region previously inlined in `ActionDetail`, rendering loading/fields/single-value/error states with the `address` slot passthrough.

`ActionDetail` and the playground/reader pages now consume these; behavior is unchanged.
