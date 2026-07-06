---
'@evmnow/contract-reader': patch
---

The action detail's vertical rhythm is now owned entirely by its grid gap (`--cr-action-detail-gap`) instead of a mix of gap and per-block margins. Grid auto-rows don't reliably include child margins in track sizing — a margined block (e.g. a custom `_component` card) could overflow its row and swallow the next section's spacing, making the gap above the source link inconsistent. Child margins inside `.cr-action-detail` are now neutralized, and every section — results, previews, custom components — gets the same separation. Tune spacing via `--cr-action-detail-gap`.
