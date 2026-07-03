---
"@evmnow/contract-reader": minor
---

Render and collect the amount-like semantic types (`eth`, `gwei`, `amount`, `token-amount`) using the canonical `@evmnow/sdk` formatter.

Function results, single-value reads, and multi-return fields now display amounts scaled by their decimals with a unit symbol. Function inputs for amount types accept a human decimal value (scaled to base units on submit), show a symbol suffix, and — for `token-amount` — resolve the token's on-chain decimals/symbol and offer a balance-backed "max" button. Amount inputs render through the shared `EvmAmountInput`. Requires `@evmnow/sdk` >= 0.2.0 and `@1001-digital/layers.evm` >= 2.9.0.
