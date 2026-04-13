# dapp

Open-source Nuxt monorepo for a minimal contract-reader app and a reusable routing-free base package.

## Packages

- `packages/base` exposes routing-free contract UI primitives and consumes `@evmnow/sdk@0.1.1` for contract metadata and ABI loading.
- `packages/contract-reader` owns routing, reader RPC and chain ID selection, and the wallet-backed metadata/read flow.

## Install

```sh
pnpm install
```

## Run

- `pnpm dev` starts the contract reader in development mode.
- `pnpm build` builds all workspace packages.
- `pnpm generate` prerenders the static shell and settings routes.
- `pnpm typecheck` runs workspace type checks.

## Routing

- Contract reader state lives on `/` and uses query params, for example `/?address=registrar.ens.eth&view=read&fn=tokenURI&args=%5B%221%22%5D`.
- No token pages, search route, or address route are implemented.
- Static generation prerenders `/` and `/settings`; contract pages are opened by query state on the prerendered index route.

## Runtime Config

The reader uses Nuxt public runtime config, which can be set through environment variables in `.env` or your deployment platform.

- `NUXT_PUBLIC_DEFAULT_CHAIN_ID` seeds the reader chain ID shown in Settings and is used when no active wallet chain is available. The current default is `1`.
- `NUXT_PUBLIC_DEFAULT_RPC` seeds the reader RPC shown in Settings. The reader RPC and chain ID are stored in browser localStorage and can be changed per browser.
- `NUXT_PUBLIC_MAINNET_ENS_RPC` sets a dedicated Ethereum mainnet RPC for `.eth` ENS resolution when the active reader chain is not mainnet.
- `NUXT_PUBLIC_EVM_WALLET_CONNECT_PROJECT_ID` configures the inherited WalletConnect flow.
- `NUXT_PUBLIC_EVM_CHAINS_MAINNET_RPCS` configures the inherited mainnet RPC list used by the EVM layer.

The reader RPC and chain ID set in Settings are preferred for SDK metadata loading and read calls. If no reader RPC is set, the app falls back to the connected wallet provider when available, then to the wallet layer's public client.

The metadata SDK accepts separate `rpc` and `ensRpc` inputs. In this app, mainnet ENS resolution uses `NUXT_PUBLIC_MAINNET_ENS_RPC` when set; otherwise it reuses the reader RPC only when the active metadata chain is mainnet.

## SDK Boundary

The app uses the published `@evmnow/sdk@0.1.1` package for metadata and ABI data:

```ts
import { createContractClient } from '@evmnow/sdk'

const client = createContractClient({
  chainId: 1,
  rpc: 'https://rpc.evm.now',
})

await client.get('0x123')
await client.get('registrar.ens.eth')
```

`packages/base/package.json` depends on `@evmnow/sdk` directly from npm, so no local SDK checkout is required for development.

The base components do not know about routing. They receive props and emit events; the app owns route and query state.

## Wallets And Writes

- The app uses the wallet stack from `@1001-digital/layers.evm`.
- The base function components render read and write functions, but they only receive `read`, `write`, and `walletConnected` props.
- Custom RPC and chain ID from Settings are preferred for SDK metadata loading and read calls.
- If no custom RPC is set, read calls use the connected wallet connector when available, then fall back to the wagmi public client from the wallet/layer configuration.
- Metadata calls use the custom RPC first. Without one, the app passes the SDK an internal JSON-RPC fetch adapter backed by the connected wallet/provider when available.
- Contract writes are sent through the connected wallet and the existing `EvmTransactionFlowDialog`.

## Qrcode Workaround

`packages/contract-reader/nuxt.config.ts` still includes `qrcode` in `vite.optimizeDeps.include`. Keep that as a temporary workaround for the inherited `@1001-digital/layers.evm` dependency graph until the upstream packaging issue is gone.
