---
'@evmnow/dapp': minor
---

Add a "Test RPC Connection" button to the settings page.

The button sends an `eth_chainId` request to the effective reader RPC and reports success, connection failures, or a mismatch between the returned chain ID and the configured one — handy for verifying a local dev endpoint before using it.
