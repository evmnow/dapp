---
'@evmnow/dapp': minor
---

Support setting the RPC from a URL query parameter.

Links can now pass an RPC endpoint per chain using the dappspec `ds-rpc-<chainId>` convention, e.g. `?ds-rpc-1=https%3A%2F%2Frpc.example.org`. The override takes priority over locally saved settings for the duration of the session and is never persisted. A `ds-rpc-1` endpoint is also used for `.eth` ENS resolution, and both the reader and the settings page show a notice while an override is active.
