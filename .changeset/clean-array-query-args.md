---
'@evmnow/dapp': patch
---

Encode contract function arguments as repeated `args[]` query parameters instead of a JSON string, making shared reader URLs safer for values that include reserved URL characters.
