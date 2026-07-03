---
'@evmnow/contract-reader': minor
---

Resolve positional parameter keys (`_0`, `_1`, ...) by position for action params, returns, and examples.

Interface metadata can only reference parameters positionally, because implementations name them differently — WETH's `approve(guy, wad)` is the same ERC-20 function as OpenZeppelin's `approve(spender, amount)`. Previously the reader matched parameter metadata by ABI name only, so interface-provided actions lost their labels and locked params on such contracts (WETH's "Revoke Approval" rendered raw `guy`/`wad` inputs instead of a single spender field with the amount locked to 0). Name keys win when both forms describe the same parameter, and `applyInputExample` now takes the action inputs as its first argument so positional example keys map onto named fields. Requires `@evmnow/sdk` >= 0.3.0.
