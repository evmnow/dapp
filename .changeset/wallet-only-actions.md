---
'@evmnow/contract-reader': minor
'@evmnow/dapp': patch
---

Hide actions locked to the connected wallet while no wallet is connected.

An action whose hidden or disabled parameter (or transaction value) autofills from `connected-address` — like the ERC-20 interface's "My Balance" — cannot be invoked without a wallet. The new `actionRequiresConnectedWallet()` util identifies such actions, and the dapp now omits them from the action list until a wallet connects.
