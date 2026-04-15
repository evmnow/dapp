# evm.now

A streamlined, open-source version of the block explorer experience at [evm.now](https://evm.now) — a simple UI for looking up verified EVM contracts, inspecting their metadata and source, and calling read/write functions directly from the browser. Chain ID and RPC are configurable per-user and stored locally, so the same build works against any EVM network.

This repo ships two packages:

- **`@evmnow/dapp`** — the Nuxt app behind evm.now (published as versioned GitHub releases, not to npm).
- **`@evmnow/contract-reader`** — the reusable pieces powering the dapp as a Nuxt layer: Vue components, composables, and utilities for rendering ABIs, decoding inputs/outputs, resolving ENS, and wiring up read and write calls via viem and wagmi. Extend it from another Nuxt project to drop a contract UI into your own app.

We believe EVM contracts deserve a simple, open UI that lets users interact with them permissionlessly. This is the foundation — alongside the contract-metadata standard and SDK we're building to power better UX across the ecosystem.

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

- `packages/dapp` is the Nuxt app.
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
