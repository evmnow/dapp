# @evmnow/contract-reader

A [Nuxt 4](https://nuxt.com) layer of Vue 3 components, composables and utilities for inspecting and interacting with verified EVM smart contracts. It powers [evm.now](https://evm.now) and is published so you can drop the same UI into your own dApp.

The layer covers the contract-explorer surface end to end: contract overview, grouped read/interact action panels with form generation, source-file viewer with Solidity syntax highlighting, a composable that fetches verified metadata, ABI and source through [`@evmnow/sdk`](https://www.npmjs.com/package/@evmnow/sdk), and a composable that wires the bundled wallet stack into read/write callbacks.

## Install

```sh
pnpm add @evmnow/contract-reader
# or: npm i @evmnow/contract-reader / yarn add @evmnow/contract-reader
```

Peer requirements: Nuxt `^4.4`, Vue `^3.5`.

The layer extends [`@1001-digital/layers.evm`](https://www.npmjs.com/package/@1001-digital/layers.evm), so wallet/RPC plumbing (MetaMask, WalletConnect, Safe, wagmi + viem clients) and the base UI kit are available out of the box.

## Use as a Nuxt layer

The simplest integration is to extend the layer from your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['@evmnow/contract-reader'],
})
```

That auto-imports every component, composable and util listed below, registers the base stylesheet, and brings in the wallet layer.

A full reference integration lives in [`.playground/app/pages/index.vue`](https://github.com/evmnow/dapp/blob/main/packages/contract-reader/.playground/app/pages/index.vue) — address input, wallet wiring, tabbed overview/read/interact/code views, and URL-backed state, in one page.

## Use individual pieces

Each surface is also exported under its own subpath for projects that don't want the whole layer:

```ts
// components
import Overview from '@evmnow/contract-reader/components/Overview'
import Source from '@evmnow/contract-reader/components/Source'
import ActionPanel from '@evmnow/contract-reader/components/Action/Panel'
import ActionList from '@evmnow/contract-reader/components/Action/List'
import ActionCards from '@evmnow/contract-reader/components/Action/Cards'
import ActionDetail from '@evmnow/contract-reader/components/Action/Detail'

// composables
import { useContractMetadataSdk } from '@evmnow/contract-reader/composables/useContractMetadataSdk'
import { useContractWallet } from '@evmnow/contract-reader/composables/useContractWallet'
import { useTokenMetadataResolver } from '@evmnow/contract-reader/composables/useTokenMetadataResolver'
import { useReaderQueryState } from '@evmnow/contract-reader/composables/useReaderQueryState'

// types
import type {
  ContractData,
  ContractAction,
  SourceFile,
} from '@evmnow/contract-reader/types/contract'
import type { ContractUIMetadata } from '@evmnow/contract-reader/types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
} from '@evmnow/contract-reader/types/actions'
import type { ContractView } from '@evmnow/contract-reader/types/view'

// utils
import { groupActions } from '@evmnow/contract-reader/utils/abi'
import { highlightSolidity } from '@evmnow/contract-reader/utils/syntax'
```

## Loading contract metadata

`useContractMetadataSdk` wraps `createContractClient` from `@evmnow/sdk` as a reactive composable. Pass an address (or `chainId:address` / `.eth`, `.gwei`, or `.wei` name) to `get()` and the result is exposed through `contract`, with `pending` and `error` for UI state.

`useContractWallet` connects the wallet layer to everything else: it resolves reads through an explicit RPC URL, the connected wallet's provider, or the wagmi public client (in that order), and exposes the pieces the other APIs expect.

```vue
<script setup lang="ts">
const wallet = useContractWallet({
  chainId: 1, // optional; defaults to the wallet layer's main chain
  rpc: myRpcUrl, // optional explicit RPC (MaybeRefOrGetter<string>)
})

const { contract, pending, error, get, clear } = useContractMetadataSdk({
  chainId: computed(() => wallet.metadataOptions.value.chainId),
  rpc: computed(() => wallet.metadataOptions.value.rpc ?? ''),
  fetch: wallet.metadataFetch, // routes SDK RPC calls through the wallet
  // optional overrides: ensRpc, repositoryUrl, sourcifyUrl, ipfsGateway, sources
})

await get('0x1F98431c8aD98523631AE4a59f267346ea31F984')

const contractData = computed(() => toContractData(contract.value))
</script>
```

Stale responses from older `get()` calls are dropped, so it's safe to react to input changes. `toContractData` (from `utils/contract`) normalizes the SDK result — or any equivalent API response of your own — into the `ContractData` shape the components consume.

## Rendering a contract

`ContractData` plugs straight into the components. `ActionPanel` is the batteries-included composition (responsive sidebar-list + detail on wide screens, expandable cards on narrow ones); `ActionList` / `ActionCards` / `ActionDetail` / `ActionGroups` are the underlying pieces if you want your own arrangement.

```vue
<template>
  <section class="cr-shell">
    <Overview :contract="contractData" />

    <ActionPanel
      :actions="contractData.actions.read"
      :address="contractData.address"
      :abi="contractData.abi"
      :chain-id="contractData.chainId"
      :metadata="contractData.metadata"
      :read-function="wallet.readContractFunction"
      :write-function="wallet.writeContractFunction"
      :resolve-metadata="resolveMetadata"
      :wallet-connected="wallet.walletConnected.value"
      :connected-address="wallet.walletAddress.value"
      @select="selectAction"
    />

    <Source :files="contractData.sourceFiles" />
  </section>
</template>
```

`readFunction` / `writeFunction` take `ContractReadFn` / `ContractWriteFn` callbacks (`{ address, abi, functionName, args, value?, blockNumber? }`), so you can wire them to `useContractWallet` (as above), or to your own backend — e.g. an explorer API that executes reads server-side and honors `blockNumber` for time-travel queries.

`resolveMetadata` takes a `MetadataResolveFn` for token-URI previews; `useTokenMetadataResolver` provides one that resolves `data:` / `ipfs://` / `ipns://` / `ar://` / https URIs through the gateways configured in `appConfig.evm` (falling back to ipfs.io / arweave.net). Point it at your own resolver endpoint instead by passing a custom `fetch`.

### Host extension points on `ActionDetail`

- **`resolveTokenInfo`** — resolve `token-amount` decimals/symbol through your own backend (e.g. an indexer API) instead of the default per-token `eth_call`s via `readFunction`.
- **`autoReadWithArgs`** — auto-execute parameterized reads when hydrated `args` fill the form validly (deep links carrying arguments). Zero-input reads always auto-read; reads triggered while one is in flight are queued, and a changed `readFunction` identity (e.g. a block picker) refreshes a displayed result.
- **`value-field` slot** — render your own msg.value input (`value`, `setValue`, `meta`, `label`, `disabled`, `error` in scope); the `actions` slot scope exposes `value`/`valueWei` so confirmation UIs can preview the amount being sent.
- **`field` slot** — scope includes the full input record (`values`, `errors`, `setValue`) and the resolved `amount` info, so custom widgets (including tuples) bind directly to layer state.
- **`_component` extension** — register custom components for the standard's [`_component`](https://github.com/evmnow/contract-metadata/blob/main/extensions/_component.md) convention once at startup:

  ```ts
  import { registerActionComponent } from '@evmnow/contract-reader/utils/custom-components'
  registerActionComponent('my-preview', MyPreview) // e.g. in a Nuxt plugin
  ```

  Resolved components render in the detail's preview area with `{ value, config, args, address, abi, action }` props; unrecognized names are ignored per the standard.

`ActionDetail` builds inputs from the ABI plus the metadata schema (semantic input types, autofill, validation, examples, tuple support, hidden/disabled preset params for variants like "Revoke Approval") and renders the call result back into the matching field shape.

## Reader state and routing

Routing is deliberately left to the app — every component takes selection state via props and reports changes via events, plus optional route/href builder props (`actionSelectionRoute`, `actionCodeRoute`, `fileHref`, `lineHref`) when you want real links.

For apps that keep reader state in query params on a single route, `useReaderQueryState` implements the full state machine (`?address=…&view=…&fn=…&args[]=…&file=…&line=…&end=…`) with `state`, `navigate`, `routeFor` and `hrefFor`. Apps with path- or hash-based routing (like a block explorer with `/address/:address/read`) keep their own mapping and feed the same props.

### Components

| Component                             | Purpose                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Overview`                            | Description, stat tiles, long-form `about` markdown — slot-driven for full overrides.                                                            |
| `Source`                              | Multi-file Solidity viewer with Shiki highlighting, line-level deep-linking, file/line `href` builders, injectable `highlight` function.         |
| `ActionPanel`                         | Responsive list+detail / cards composition with heading, empty state, and slot pass-through to `ActionDetail`.                                   |
| `ActionList`                          | Sidebar list of grouped actions with selection events and item slot overrides.                                                                   |
| `ActionCards`                         | Card grid alternative — each action expands inline into `ActionDetail`.                                                                          |
| `ActionGroups`                        | Headless grouping primitive used by `List`/`Cards`; expose your own layout via slots.                                                            |
| `ActionDetail`                        | Form generation, validation, examples, read-call execution, write-call submission. Respects `hidden`/`disabled` param flags for variant actions. |
| `ActionResult` / `ActionResultFields` | Output rendering with semantic-type formatting.                                                                                                  |
| `Markdown` / `InlineMarkdown`         | Lightweight markdown renderers for descriptions and `about`.                                                                                     |
| `CopyButton`                          | Copy-to-clipboard helper.                                                                                                                        |
| `TransactionButton`                   | Wraps the wallet layer's transaction flow dialog for write actions.                                                                              |

### Composables

- `useContractMetadataSdk` — reactive contract metadata/ABI/source fetching via `@evmnow/sdk`.
- `useContractWallet` — wallet-layer wiring: `readContractFunction` / `writeContractFunction` for the action components, `metadataOptions` / `metadataFetch` for the SDK composable, plus `walletConnected`, `walletAddress`, `chainId` and the underlying `connection`.
- `useTokenMetadataResolver` — `MetadataResolveFn` for NFT/token metadata previews with configurable gateways.
- `useReaderQueryState` — query-param reader state machine (optional; see routing above).

### Utilities

- `utils/abi` — `parseActions`, `groupActions` (metadata groups, diamond facets, ERC-standard detection), ABI-to-action resolution helpers.
- `utils/contract` — `toContractData` derives `ContractData` from raw SDK/API output, proxy/diamond handling.
- `utils/inputs` — parse, validate and serialize human-entered values against ABI types and `SemanticType`s (eth, gwei, timestamp, basis points, enums, sliders…).
- `utils/format` — display formatters for addresses, amounts, durations, etc.
- `utils/source` — `SourceSelection` model for file/line deep links, function-to-source lookup, import-graph file ordering.
- `utils/syntax` — `highlightSolidity` (Shiki, per-line HTML) plus `loadSyntaxTheme` / `setSyntaxTheme` for custom themes.
- `utils/provider-rpc` — `createProviderRpcFetch` bridges a viem/wallet client into a `fetch` implementation for the SDK (`PROVIDER_RPC_URL` sentinel).
- `utils/markdown` — minimal markdown → HTML used by the markdown components.
- `utils/errors` — normalize SDK / RPC errors into displayable messages.

## Styling

The layer registers `app/assets/css/index.css`, which pulls in design tokens, base controls, and per-component stylesheets. All selectors are namespaced under `.cr-*` and built on CSS variables — no preprocessor required.

- **Tokens.** Every visual knob is a `--cr-*` custom property declared in [`tokens.css`](./app/assets/css/tokens.css). The color/font tokens derive from common app tokens with safe fallbacks (`--cr-surface: var(--surface-1, canvas)`, `--cr-mono: var(--font-mono, ui-monospace, …)`); sizing tokens use the scales shipped by the extended wallet layer (`--size-*`, `--font-*`, `--border-*`, `--form-width`, …), which are always present.
- **Scope.** `.cr-shell` is the intended scope element for a reader surface: it establishes grid flow and is where an app remaps tokens to its theme without leaking overrides elsewhere, e.g.

  ```css
  .cr-shell {
    --cr-surface: var(--surface-2);
    --cr-surface-muted: var(--surface-1);
    --cr-primary: var(--brand);
  }
  ```

- **Layers.** Styles live in the standard cascade layers (`variables`, `components`, `utilities`) declared by the base layer, so app CSS in later layers (or unlayered) wins without specificity hacks.

`.cr-header` and `.cr-tabs` ship matching structural styles for the typical title + tab-bar header seen in the playground.

## Syntax highlighting themes

The bundled highlighter ships Solidity + the `one-light` theme (kept deliberately small). To theme it:

```ts
import {
  loadSyntaxTheme,
  setSyntaxTheme,
} from '@evmnow/contract-reader/utils/syntax'
import oneDark from 'shiki/themes/one-dark-pro.mjs'

await loadSyntaxTheme(oneDark)
setSyntaxTheme('one-dark-pro') // or pass per call: highlightSolidity(src, 'one-dark-pro')
```

For full control (theme pairs, custom languages, identifier links), pass your own `highlight` function to `<Source :highlight="myHighlighter">` — it receives the file content and returns one HTML string per line.

## License

[MIT](./LICENSE) © [1001.digital](https://1001.digital)
