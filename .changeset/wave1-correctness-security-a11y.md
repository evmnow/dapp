---
'@evmnow/contract-reader': patch
---

A round of correctness, security, performance, accessibility and packaging fixes across the reader:

- Reads are now guarded by a request-generation counter (and action details are keyed per action), so switching actions while a read is in flight can no longer write a stale result or error into the new action's view.
- Malformed `min`/`max` bounds in payable value validation metadata no longer throw and break rendering — unparseable bounds are ignored. A non-empty transaction value that doesn't parse as ETH now shows a visible error and disables sending even without a metadata validation rule.
- `writeContractFunction` string values are now always ETH-denominated (`"1"` used to be treated as 1 wei while `"1.5"` was 1.5 ETH); bigints remain wei.
- Token info is keyed by lowercased address on both write and read, so checksummed metadata addresses resolve the same entry, and concurrent token metadata lookups are deduplicated in flight.
- Amount-like tuple members now render the same human-decimal amount input that arg building scales on submit, instead of silently multiplying raw input by 10^decimals.
- External metadata URLs are scheme-allowlisted (`https:`/`http:`/`data:image/*`) before binding into `img`/`iframe`/`a` sinks, and metadata-supplied validation regexes are length-capped and compiled once (invalid patterns are ignored) to mitigate ReDoS.
- Shiki (and the solidity grammar) now loads lazily when a source view first renders instead of shipping in the initial chunk, and token metadata gateway fetches time out after 15s instead of hanging forever.
- Inputs are associated with real labels and expose `aria-describedby`/`aria-invalid`; read results/errors announce via a polite live region; card expanders expose `aria-expanded`/`aria-controls`; preview toggles expose `aria-pressed`; the copy button shows a brief failed state when clipboard access is denied.
- Packaging: `nuxt`/`vue` are declared as peer dependencies, `viem` moved to a caret range compatible with `@wagmi/core`'s peer range, and the deep import into the wallet layer's ENS cache is isolated behind a single adapter module.
