import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'playground-feature' },
  moduleDependencies: {
    './modules/core': {},
    '@nuxt/devtools': { optional: true },
  },
  setup() {},
})
