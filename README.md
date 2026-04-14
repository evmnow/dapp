# evm.now dapp

Open-source repo version of [evm.now](https://evm.now).

This app lets you look up EVM contracts, inspect verified metadata and source, and call read/write functions from a small Nuxt interface.

## Run Locally

```sh
pnpm install
pnpm dev
```

Useful commands:

```sh
pnpm typecheck
pnpm build
pnpm generate
```

## Settings

The app has a Settings page for the reader RPC and chain ID. Both values are stored locally in your browser.

You can seed them with public Nuxt env vars:

```sh
NUXT_PUBLIC_DEFAULT_CHAIN_ID=1
NUXT_PUBLIC_DEFAULT_RPC=https://rpc.example.org
```

`NUXT_PUBLIC_MAINNET_ENS_RPC` can be set when you want a dedicated Ethereum mainnet RPC for `.eth` ENS resolution.

## Repo

- `packages/dapp` is the Nuxt app (published as versioned releases, not to npm).
- `packages/contract-reader` is the publishable library of shared contract UI components (`@evmnow/contract-reader` on npm).
