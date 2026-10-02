import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { GraphScope, ModuleGraph, ModuleNode } from '../../../src/types'
import { onDevtoolsReady, useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { MODULE_GRAPH_RPC } from '../../../src/rpc'

export function useModuleGraph() {
  // Initialize the iframe injection ref even when this composable is used
  // without the theme plugin. The host owns the RPC transport and connection.
  useDevtoolsClient()
  const rpc = shallowRef<DevToolsRpcClient>()
  const connected = computed(() => Boolean(rpc.value))
  const graph = shallowRef<ModuleGraph>()
  const pending = ref(false)
  const error = shallowRef<Error>()
  let requestId = 0

  async function refresh() {
    const connection = rpc.value
    if (!connection)
      return
    const currentRequest = ++requestId
    pending.value = true
    error.value = undefined
    try {
      const snapshot = await connection.call(MODULE_GRAPH_RPC)
      if (currentRequest !== requestId)
        return
      if (!snapshot || !Array.isArray(snapshot.nodes) || !snapshot.layouts)
        throw new Error('DevTools did not return a module graph.')
      graph.value = snapshot
    }
    catch (cause) {
      if (currentRequest === requestId)
        error.value = cause instanceof Error ? cause : new Error('Could not load the module graph through DevTools RPC.')
    }
    finally {
      if (currentRequest === requestId)
        pending.value = false
    }
  }

  const stop = onDevtoolsReady((connection) => {
    if (rpc.value === connection)
      return
    rpc.value = connection
    void refresh()
  })
  onScopeDispose(() => {
    requestId++
    stop?.()
  })
  const scope = ref<GraphScope>('neighbors')
  const query = ref('')
  const selectedId = ref<string>()
  const view = ref<'graph' | 'list'>('graph')
  const nodes = computed(() => new Map(graph.value?.nodes.map(node => [node.id, node]) || []))
  const layout = computed(() => graph.value?.layouts[scope.value])
  const selected = computed(() => selectedId.value ? nodes.value.get(selectedId.value) : undefined)
  const outgoing = computed(() => graph.value?.edges.filter(edge => edge.source === selectedId.value) || [])
  const incoming = computed(() => graph.value?.edges.filter(edge => edge.target === selectedId.value) || [])
  const dependencies = computed(() => new Set(outgoing.value.map(edge => edge.target)))
  const dependents = computed(() => new Set(incoming.value.map(edge => edge.source)))
  const visibleNodes = computed(() => (layout.value?.nodes || []).flatMap(position => {
    const node = nodes.value.get(position.id)
    return node ? [node] : []
  }))
  const matchingNodes = computed(() => visibleNodes.value.filter(matches).sort((a, b) => a.name.localeCompare(b.name)))
  const warnings = computed(() => [
    ...graph.value?.warnings || [],
    ...layout.value?.cycles.length ? [`${layout.value.cycles.length} declared dependency cycle(s) in this view. Select a module to inspect its links.`] : [],
    ...graph.value && !visibleNodes.value.length ? ['No modules in this scope. Try "All modules".'] : [],
  ])
  const selectedCycles = computed(() => {
    const ids = new Set(graph.value?.layouts.all.cycles.filter(cycle => selectedId.value && cycle.includes(selectedId.value)).flat())
    return [...ids].map(id => nodes.value.get(id)?.name).filter(Boolean).join(', ')
  })

  function matches(node: ModuleNode) {
    return `${node.name} ${node.entryPath || ''}`.toLowerCase().includes(query.value.trim().toLowerCase())
  }

  function select(id: string) {
    selectedId.value = id
    if (!layout.value?.nodes.some(node => node.id === id))
      scope.value = 'all'
  }

  function relation(id: string) {
    if (dependencies.value.has(id))
      return 'dependency'
    if (dependents.value.has(id))
      return 'dependent'
    return 'default'
  }

  function dimmed(node: ModuleNode) {
    return !matches(node) || Boolean(selectedId.value && selectedId.value !== node.id && relation(node.id) === 'default')
  }

  function countLinks(id: string, direction: 'source' | 'target') {
    return graph.value?.edges.filter(edge => edge[direction] === id).length || 0
  }

  watch(graph, () => {
    if (selectedId.value && !nodes.value.has(selectedId.value))
      selectedId.value = undefined
  })

  return {
    graph, connected, pending, error, refresh, scope, query, selectedId, selected, view,
    nodes, layout, visibleNodes, matchingNodes, outgoing, incoming,
    warnings, selectedCycles, matches, select, relation, dimmed, countLinks,
  }
}

export function moduleState(node: ModuleNode) {
  if (!node.installed)
    return 'Not installed / unresolved'
  if (node.disabled)
    return 'Disabled'
  return node.kind === 'local' ? 'Local' : 'Package'
}
