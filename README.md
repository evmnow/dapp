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

## Using the library

Install in another Nuxt project:

```sh
pnpm add @evmnow/contract-reader
```

Then extend it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['@evmnow/contract-reader'],
})
```

Components, types, utils, and composables are also importable directly — e.g. `@evmnow/contract-reader/components/Function/Cards`, `@evmnow/contract-reader/utils/contract`.

## Releasing

Releases are managed with [changesets](https://github.com/changesets/changesets).

1. Add a changeset for your changes:
   ```sh
   pnpm changeset
   ```
   Pick the affected packages and a bump type. Commit the resulting `.changeset/*.md` file with your PR.
2. On merge to `main`, the [Release workflow](.github/workflows/release.yml) opens (or updates) a "Version Packages" PR that bumps versions and writes CHANGELOGs.
3. Merging that PR triggers the workflow again, which:
   - publishes `@evmnow/contract-reader` to npm;
   - creates a `@evmnow/dapp@x.y.z` GitHub release for the dapp (private, not published).

## License

[MIT](./LICENSE) © 1001.digital
