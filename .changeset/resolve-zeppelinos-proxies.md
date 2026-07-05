---
'@evmnow/contract-reader': minor
---

Resolve legacy ZeppelinOS (pre-EIP-1967) proxies via `@evmnow/sdk` 0.4.0.

Contracts like Circle's USDC (`FiatTokenProxy`) store their implementation at `keccak256('org.zeppelinos.proxy.implementation')` and previously surfaced only the proxy's own ABI — the read/interact views showed the upgrade/admin functions instead of the implementation's. They now resolve through the standard proxy pipeline, so the ERC-20 functions (with their NatSpec) appear as expected.
