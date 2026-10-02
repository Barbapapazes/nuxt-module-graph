import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-04-15',
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  modules: ['@nuxt/devtools-ui-kit'],
  css: ['~/assets/main.css'],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/__module-graph/',
    head: {
      title: 'Module graph | Nuxt DevTools',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  nitro: {
    output: {
      publicDir: fileURLToPath(new URL('../dist/client', import.meta.url)),
    },
  },
  routeRules: {
    '/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },
  vite: {
    server: {
      hmr: {
        // Follow the starter: connect HMR directly to the client dev server.
        clientPort: Number(process.env.PORT || 3300),
      },
    },
  },
})
