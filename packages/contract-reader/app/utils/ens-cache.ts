// Upstream coupling isolated here: `@1001-digital/layers.evm` publishes no
// package-level export map, so its ENS resolution cache is only reachable by
// deep-importing into the layer's `app/` directory. Keep this the single
// place that knows about that path — if the layer ever adds a public export
// for its ENS utilities, only this adapter needs to change.
export { ensCache } from '@1001-digital/layers.evm/app/utils/ens'
