---
'@evmnow/contract-reader': patch
---

Force-resolve ENS names in address arguments before executing a read or write.

Previously an ENS name (e.g. `?fn=balanceOf&args[]=vitalik.eth`) was only substituted with its address when the address input's background resolution had already landed in the shared cache — reads fired before that (URL-driven args, quick submits) passed the raw name to viem and failed with `Address "vitalik.eth" is invalid.` Reads and writes now await `useEnsResolver` for every ENS name in `address` / `address[]` / tuple inputs and surface a clear error when a name cannot be resolved. Requires `@1001-digital/layers.evm` >= 2.8.0.
