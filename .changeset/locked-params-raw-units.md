---
'@evmnow/contract-reader': patch
---

Never scale locked (hidden/disabled) parameters by amount decimals when building call arguments. Autofill values are denominated in raw base units per the metadata spec, so an amount-typed locked param (e.g. an unlimited-approval constant) would have been multiplied by 10^decimals again.
