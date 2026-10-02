export default defineNuxtConfig({
  compatibilityDate: '2026-04-15',
  telemetry: false,
  devtools: { enabled: true },
  modules: ['../src/module'],
  app: {
    head: {
      title: 'Nuxt module graph playground',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
})
