# Nuxt Module Graph

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Explore your Nuxt modules and their declared dependencies in a **Module graph** tab in Nuxt DevTools.

## Features

- Interactive graph, searchable list, and dependency/dependent details.
- Local modules, local modules with direct dependencies, or all installed modules.
- Optional, unresolved, and disabled dependencies, plus cycle warnings.
- Development only: no production routes, public assets, or analytics.

## Quick Setup

> [!NOTE]
> This initial release targets **Nuxt 4.5.2+** and **Nuxt DevTools 4.0.0-beta.2**. The DevTools v4 RPC API is still in beta; keep the host and this module's DevTools versions aligned.

```bash
pnpm add -D nuxt-module-graph @nuxt/devtools@4.0.0-beta.2
```

Add the module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-module-graph'],
  devtools: { enabled: true },
})
```

Start Nuxt, open Nuxt DevTools, and select **Module graph**. Published packages include the generated iframe client; consumers do not need a separate client server. The module is inactive when development or DevTools is disabled.

## Usage

The default scope shows local modules and their direct dependencies. Disable **Show package modules** for local modules only, or enable **All installed modules** to see every installed module. Arrows point to dependencies; optional dependencies have dashed edges.

Select a module to highlight its dependencies and dependents. Search highlights matching nodes and filters the list without resetting graph positions, zoom, or pan. Changing scope creates a new network layout.

The list and details drawer provide keyboard-accessible module selection. Use Escape or the labelled close button to clear the selection. The graph supports dragging, wheel zoom, keyboard panning, and explicit zoom/fit buttons. The iframe follows the DevTools color mode, falling back to the system preference.

**Refresh** reloads the server's graph snapshot. Nuxt rebuilds that snapshot after module installation whenever the host restarts; refreshing does not run module setup again.

## Development

The structure follows the [Nuxt DevTools module guide](https://devtools.nuxt.com/module/guide) and its [module-devtools starter](https://github.com/nuxt/starter/tree/module-devtools):

```text
src/
  module.ts       # Nuxt module and DevTools RPC registration
  devtools.ts     # Iframe serving, development proxy, custom tab
  graph.ts        # Nuxt installed-module registry adapter
  rpc.ts          # Shared RPC name and return contract
  types.ts        # Shared graph types
client/           # Standalone, client-rendered Nuxt iframe app
.playground/      # Host Nuxt app with example local modules
```

Use **Node.js 24+** and the pnpm version pinned in `package.json`.

Install and prepare the module and both apps:

```bash
pnpm install
pnpm dev:prepare
```

Start the iframe client and playground in **separate terminals**:

```bash
pnpm client:dev  # 127.0.0.1:3300
pnpm dev        # .playground host
```

Open the playground's Nuxt DevTools and select **Module graph**. The playground has local `playground-core` and `playground-feature` modules, with required local and optional package dependencies.

Opening the iframe directly displays connection instructions: graph data requires the host's DevTools RPC connection. There is no standalone JSON endpoint. Client startup and shutdown are managed by your terminals; no subprocess is spawned automatically.

```bash
pnpm typecheck
```

To build a publishable package, use `pnpm prepack`. This runs Nuxt Module Builder and generates the iframe into `dist/client`. `pnpm play:prod` serves that packaged client in the development playground; it does not enable the integration in a production Nuxt app. Only `dist/` is published.

When `dist/client/index.html` exists, `src/devtools.ts` serves it through `sirv` in `vite:serverCreated`, with SPA fallback. Otherwise it proxies `/__module-graph` to the client dev server. Remove `dist/client` and restart the host to switch back to the development proxy. HMR connects directly to port 3300.

The host's app base URL prefixes the iframe route. For example, a host with `/preview/` needs `NUXT_APP_BASE_URL=/preview/__module-graph/ pnpm client:dev` (or the same environment variable when generating the packaged client).

### Developing with beta.soubiran.dev

That sibling app links this package locally. Run `pnpm install` and `pnpm dev:prepare` here before installing dependencies in `../beta.soubiran.dev`. Start `pnpm dev:module-graph` in the site directory (equivalent to this package's `pnpm client:dev`), and run the site's `pnpm dev` in another terminal.

## Publishing

### Validate the package

```bash
pnpm install --frozen-lockfile
pnpm dev:prepare
pnpm typecheck
pnpm build
```

`pnpm pack` creates a tarball for testing in another Nuxt project; its `prepack` hook builds the module and client automatically.

### First release

1. Create the public GitHub repository `Barbapapazes/nuxt-module-graph` and push this project to its `main` branch, including `.github/workflows`.
2. Ensure your npm account can publish the `nuxt-module-graph` name and has two-factor authentication enabled.
3. Run the validation commands above, then authenticate and publish the initial version:

   ```bash
   npm login
   pnpm publish --access public
   ```

4. In the npm package's **Settings → Trusted publishing**, add a GitHub Actions publisher:
   - Organization or user: `Barbapapazes`
   - Repository: `nuxt-module-graph`
   - Workflow filename: `release.yml`
   - Environment: leave blank (the workflow does not use one).
5. Tag the initial release after publishing so future changelogs have a baseline:

   ```bash
   git tag -s v0.0.1 -m "v0.0.1"
   git push origin v0.0.1
   ```

   This triggers the release workflow, which skips npm publication for an already-published version and creates the GitHub release.

### Subsequent releases

From a clean, up-to-date `main` branch, run:

```bash
pnpm release
```

Like the other packages in this profile, this uses `bumpp --sign` to update the version, create a signed commit and tag, and push them. Configure Git commit/tag signing before running it. The release workflow verifies the tag matches `package.json`, runs type checks, builds the package, publishes to npm with OIDC provenance, and generates a GitHub release with `changelogithub`. No long-lived `NPM_TOKEN` secret is needed.

CI runs the same type checks and build on pushes and pull requests to `main`. Prerelease versions are not assigned a separate npm dist-tag automatically; adapt the publish command before releasing one.

## Data and privacy

`src/graph.ts` reads Nuxt's internal installed-module registry after `modules:done` and calls each module's `getModuleDependencies(nuxt)` getter. Names and entry paths resolve to the same node, and repeated registrations are merged. Registry access is isolated for future Nuxt upgrades.

Modules without dependency getters have unknown metadata, not necessarily zero dependencies. Missing references remain visible as unresolved nodes. Disabled modules are marked explicitly. Cycle detection reflects declared dependencies, including declarations from disabled modules. Imports and auto-import relationships are not inferred.

Only names, entry paths, versions, optional flags, dependency constraints, and graph layouts reach the viewer. Defaults, overrides, runtime configuration, and credentials are not serialized. No module information or UI interactions are sent to analytics. Client telemetry and its own DevTools are disabled. Both the client and built-client middleware mark responses `noindex`.

The module registers a typed query through `onDevtoolsReady` and `defineRpcFunction`; the iframe calls it using the connected client's `kit.call`. It deliberately uses the v4 transport, not the deprecated `extendServerRpc` examples still present in parts of the guide.

The iframe UI retains `@nuxt/devtools-ui-kit@4.0.0-beta.2`, which is deprecated upstream, to preserve the migrated UI. The graph uses `vis-network` and `vis-data`, with force-layout settings based on the DevTools Components graph.

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/barbapapazes">
    <img src="https://cdn.jsdelivr.net/gh/barbapapazes/static/sponsors.svg" alt="Sponsors" />
  </a>
</p>

## License

[MIT](./LICENSE) License © 2026-PRESENT [Estéban Soubiran](https://github.com/Barbapapazes)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nuxt-module-graph/latest.svg?style=flat&colorA=000&colorB=171717
[npm-version-href]: https://npmjs.com/package/nuxt-module-graph

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-module-graph.svg?style=flat&colorA=000&colorB=171717
[npm-downloads-href]: https://npmjs.com/package/nuxt-module-graph

[license-src]: https://img.shields.io/npm/l/nuxt-module-graph.svg?style=flat&colorA=000&colorB=171717
[license-href]: ./LICENSE

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
