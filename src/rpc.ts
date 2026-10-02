import type {} from '@vitejs/devtools-kit'
import type { ModuleGraph } from './types'

export const MODULE_GRAPH_RPC = 'nuxt-module-graph:get-graph' as const

// Both the module registration and the iframe call use this contract.
declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    [MODULE_GRAPH_RPC]: () => Promise<ModuleGraph>
  }
}
