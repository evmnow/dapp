# @evmnow/contract-reader

A [Nuxt 4](https://nuxt.com) layer of Vue 3 components, composables and utilities for inspecting and interacting with verified EVM smart contracts. It powers [evm.now](https://evm.now) and is published so you can drop the same UI into your own dApp.

The layer covers the contract-explorer surface end to end: contract overview, grouped read/interact function panels with form generation, source-file viewer with Solidity syntax highlighting, and a composable that fetches verified metadata, ABI and source through [`@evmnow/sdk`](https://www.npmjs.com/package/@evmnow/sdk).

## Install

```sh
pnpm add @evmnow/contract-reader
# or: npm i @evmnow/contract-reader / yarn add @evmnow/contract-reader
```

Peer requirements: Nuxt `^4.4`, Vue `^3.5`.

The layer also extends [`@1001-digital/layers.evm`](https://www.npmjs.com/package/@1001-digital/layers.evm), so wallet/RPC plumbing (MetaMask, WalletConnect, Safe, viem clients) is available out of the box.

## Use as a Nuxt layer

The simplest integration is to extend the layer from your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['@evmnow/contract-reader'],
})
```

That auto-imports every component, composable and util listed below, registers the base stylesheet, and brings in the wallet layer.

## Use individual pieces

Each surface is also exported under its own subpath for projects that don't want the whole layer:

```ts
// components
import Overview from '@evmnow/contract-reader/components/Overview'
import Source from '@evmnow/contract-reader/components/Source'
import FunctionList from '@evmnow/contract-reader/components/Function/List'
import FunctionCards from '@evmnow/contract-reader/components/Function/Cards'
import FunctionDetail from '@evmnow/contract-reader/components/Function/Detail'

// composable
import { useContractMetadataSdk } from '@evmnow/contract-reader/composables/useContractMetadataSdk'

// types
import type {
  ContractData,
  ContractFunction,
  SourceFile,
} from '@evmnow/contract-reader/types/contract'
import type { ContractUIMetadata } from '@evmnow/contract-reader/types/metadata'
import type {
  ContractReadFn,
  ContractWriteFn,
} from '@evmnow/contract-reader/types/actions'

// utils
import { groupFunctions } from '@evmnow/contract-reader/utils/abi'
import { highlightSolidity } from '@evmnow/contract-reader/utils/syntax'
```

## Loading contract metadata

`useContractMetadataSdk` wraps `createContractClient` from `@evmnow/sdk` as a reactive composable. Pass an address (or `chainId:address` / ENS name) to `get()` and the result is exposed through `contract`, with `pending` and `error` for UI state.

```vue
<script setup lang="ts">
import { useContractMetadataSdk } from '@evmnow/contract-reader/composables/useContractMetadataSdk'

const chainId = ref(1)
const rpc = ref('https://eth.example/rpc')

const { contract, pending, error, get, clear } = useContractMetadataSdk({
  chainId,
  rpc,
  // optional overrides:
  // ensRpc, repositoryUrl, sourcifyUrl, ipfsGateway, sources, fetch
})

await get('0x1F98431c8aD98523631AE4a59f267346ea31F984')
</script>
```

Stale responses from older `get()` calls are dropped, so it's safe to react to input changes.

## Rendering a contract

`ContractData` (returned by the SDK / composable) plugs straight into the components:

```vue
<template>
  <Overview :contract="contract" />

  <FunctionList
    :functions="contract.functions.read"
    :metadata="contract.metadata"
    :selected="selected?.slug"
    @select="selectFn"
  />

  <FunctionDetail
    v-if="selected"
    :address="contract.address"
    :abi="contract.abi"
    :chain-id="contract.chainId"
    :fn="selected"
    :read-function="readContractFunction"
    :write-function="writeContractFunction"
    :wallet-connected="walletConnected"
    :connected-address="connectedAddress"
  />

  <Source :files="contract.sourceFiles" />
</template>
```

`readFunction` / `writeFunction` take `ContractReadFn` / `ContractWriteFn` callbacks (`{ address, abi, functionName, args, value? }`) so you can wire them to viem, ethers, or the wallet implementation of your choice. The bundled wallet layer ships ready-made versions you can use directly.

`FunctionDetail` builds inputs from the ABI plus the metadata schema (semantic input types, autofill, validation, examples, tuple support) and renders the call result back into the matching field shape.

### Components

| Component | Purpose |
| --- | --- |
| `Overview` | Description, stat tiles, long-form `about` markdown — slot-driven for full overrides. |
| `Source` | Multi-file Solidity viewer with Shiki highlighting, line-level deep-linking, file/line `href` builders. |
| `FunctionList` | Sidebar list of grouped functions with selection events and item slot overrides. |
| `FunctionCards` | Card grid alternative — each function expands inline into `FunctionDetail`. |
| `FunctionGroups` | Headless grouping primitive used by `List`/`Cards`; expose your own layout via slots. |
| `FunctionDetail` | Form generation, validation, examples, read-call execution, write-call submission. |
| `FunctionResult` / `FunctionResultFields` | Output rendering with semantic-type formatting. |
| `Markdown` / `InlineMarkdown` | Lightweight markdown renderers for descriptions and `about`. |
| `CopyButton` | Copy-to-clipboard helper. |
| `TransactionButton` | Shared submit-button styling for write actions. |

### Utilities

- `utils/abi` — `groupFunctions`, ABI grouping helpers, slug generation.
- `utils/contract` — derive `ContractData` from raw SDK output, proxy/diamond handling.
- `utils/inputs` — parse, validate and serialize human-entered values against ABI types and `SemanticType`s (eth, gwei, timestamp, basis points, enums, sliders…).
- `utils/format` — display formatters for addresses, amounts, durations, etc.
- `utils/source` — `SourceSelection` model for file/line deep links.
- `utils/syntax` — `highlightSolidity` (Shiki) for the source viewer.
- `utils/markdown` — minimal markdown → HTML used by the markdown components.
- `utils/errors` — normalize SDK / RPC errors into displayable messages.

## Styling

The layer registers `app/assets/css/index.css`, which pulls in design tokens, base controls, and per-component stylesheets (`overview.css`, `function.css`, `source.css`, `markdown.css`, `result.css`). All selectors are namespaced under `.cr-*` and built on CSS variables, so you can theme the UI by overriding the tokens in your own stylesheet — no preprocessor required.

## License

[MIT](./LICENSE) © [1001.digital](https://1001.digital)
