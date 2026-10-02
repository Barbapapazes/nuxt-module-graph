import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { existsSync } from 'node:fs'
import { joinURL } from 'ufo'

export const DEVTOOLS_UI_ROUTE = '/__module-graph'
export const DEVTOOLS_UI_LOCAL_PORT = 3300

export function setupDevToolsUI(nuxt: Nuxt, resolver: Resolver) {
  const route = joinURL(nuxt.options.app.baseURL, DEVTOOLS_UI_ROUTE)
  // Works from both src/module.ts and the published dist/module.mjs.
  const clientPath = resolver.resolve('../dist/client')
  const isProductionBuild = existsSync(resolver.resolve('../dist/client/index.html'))

  if (isProductionBuild) {
    nuxt.hook('vite:serverCreated', async (server, { isClient }) => {
      if (!isClient)
        return
      const { default: sirv } = await import('sirv')
      server.middlewares.use(route, sirv(clientPath, {
        dev: true,
        single: true,
        setHeaders(response) {
          response.setHeader('X-Robots-Tag', 'noindex, nofollow')
          response.setHeader('X-Content-Type-Options', 'nosniff')
        },
      }))
    })
  }
  else {
    // Like the starter, the Nuxt client runs separately on a fixed dev port.
    nuxt.hook('vite:extendConfig', (config, { isClient }) => {
      if (!isClient || !config.server)
        return
      config.server.proxy ||= {}
      config.server.proxy[route] = {
        target: `http://127.0.0.1:${DEVTOOLS_UI_LOCAL_PORT}${route}`,
        changeOrigin: true,
        followRedirects: true,
        rewrite: path => path.replace(route, ''),
      }
    })
  }

  nuxt.hook('devtools:customTabs', (tabs) => {
    tabs.push({
      name: 'nuxt-module-graph',
      title: 'Module graph',
      icon: 'lucide:network',
      view: { type: 'iframe', src: `${route}/` },
    })
  })
}
