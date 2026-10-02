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

## Development

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
