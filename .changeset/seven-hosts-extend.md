---
'@evmnow/contract-reader': minor
---

Host-extensibility release — everything a consuming app previously had to work around is now a first-class API:

- **msg.value is exposed**: a new `value-field` slot (with `value`/`setValue`/`meta`/`label`/`disabled`/`error` scope) lets hosts render their own payable-value input, and the `actions` slot scope now includes `value` (ETH string) and `valueWei` for confirmation previews.
- **Tuple-aware `field` slot**: the slot scope now exposes the full input record (`values`, `errors`, `setValue`) plus the resolved `amount` info, so hosts can render tuple members and amount inputs over layer state instead of mirroring it.
- **Robust read triggers**: reads triggered while one is in flight are queued instead of dropped; a changed `readFunction` identity refreshes a displayed result (time-travel/block pickers); new `autoReadWithArgs` prop auto-executes parameterized reads when hydrated `args` fill the form validly (deep links); `ActionDetail` exposes `read()` via template ref.
- **Semantic input widgets**: `enum` (select), `slider` (range), `date`/`datetime`/`timestamp` (pickers storing unix seconds, ISO for string params, timezone-safe), `duration` (amount + unit, seconds storage), and `bytes32-utf8` (text stored as right-padded hex, no stale value on overflow) — in `ActionInput`, shared by all consumers.
- **`_component` extension registry**: `registerActionComponent(type, component)` + `resolveActionComponent(meta)` (`utils/custom-components`); `ActionDetail` renders registered components in its preview area with `{ value, config, args, address, abi, action }`, and exposes `customComponent`/`customArgs` in the `preview` slot scope.
- **Injectable token resolution**: a `resolveTokenInfo` prop (on `ActionDetail`/`ActionPanel`/`ActionCards`) replaces the built-in per-token `eth_call`s, e.g. with an indexer API; `readFunction` remains the fallback.
- **Types align with the SDK**: `types/metadata` now re-exports the document types from `@evmnow/sdk` (with `SemanticType` aliasing `ParamType`), keeping only the layer-specific `ParamMeta.components` and `_component` extensions local. Requires `@evmnow/sdk >= 0.6.0`.
