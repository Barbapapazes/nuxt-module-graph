import { onDevtoolsReady } from '@nuxt/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'
import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { setupDevToolsUI } from './devtools'
import { collectModuleGraph } from './graph'
import { MODULE_GRAPH_RPC } from './rpc'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-module-graph',
    configKey: 'moduleGraph',
    compatibility: { nuxt: '^4.5.2' },
  },
  setup(_options, nuxt) {
    const devtools = nuxt.options.devtools
    if (!nuxt.options.dev || devtools === false || (typeof devtools === 'object' && devtools.enabled === false))
      return

    const resolver = createResolver(import.meta.url)
    setupDevToolsUI(nuxt, resolver)

    let snapshot: Awaited<ReturnType<typeof collectModuleGraph>> | undefined
    nuxt.hook('modules:done', async () => {
      snapshot = await collectModuleGraph(nuxt)
    })

    onDevtoolsReady((context) => {
      const setup = () => ({
        handler: async () => {
          if (!snapshot)
            throw new Error('Nuxt is still installing modules. Try refreshing shortly.')
          return snapshot
        },
      })
      const definition = defineRpcFunction({ name: MODULE_GRAPH_RPC, type: 'query', setup })
      // Keep the context-free setup. The wrapper's optional context-bound fields
      // are narrower than the shared RPC host in these package versions.
      context.rpc.register({ name: definition.name, type: definition.type, setup })
    }, nuxt)
  },
})
