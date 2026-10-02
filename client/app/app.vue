<script setup lang="ts">
const {
  graph, connected, pending, error, refresh, scope, query, selectedId, selected, view,
  layout, visibleNodes, matchingNodes, outgoing, incoming, warnings,
  selectedCycles, select, relation, dimmed, countLinks,
} = useModuleGraph()
const navbar = useTemplateRef('navbar')
const canvas = useTemplateRef('canvas')
const { height: navbarHeight } = useElementSize(navbar, undefined, { box: 'border-box' })
const includePackages = computed({
  get: () => scope.value !== 'local',
  set: value => { scope.value = value ? 'neighbors' : 'local' },
})
const showAll = computed({
  get: () => scope.value === 'all',
  set: value => { scope.value = value ? 'all' : 'neighbors' },
})
const status = computed(() => {
  if (!connected.value)
    return 'Waiting for the Nuxt DevTools RPC connection.'
  if (pending.value)
    return 'Loading modules...'
  if (error.value)
    return 'Could not load the graph through DevTools RPC. Try Refresh.'
  return `${visibleNodes.value.length} modules · ${layout.value?.edges.length || 0} declared links${query.value.trim() ? ` · ${matchingNodes.value.length} search matches` : ''}${selected.value ? ` · Selected ${selected.value.name}` : ''}`
})

async function clearSelection() {
  selectedId.value = undefined
  await nextTick()
  if (view.value === 'graph')
    canvas.value?.focus()
}

onKeyStroke('Escape', () => {
  if (selectedId.value)
    clearSelection()
})
</script>

<template>
  <main class="module-graph-app">
    <h1 class="sr-only">Module graph</h1>
    <header ref="navbar" class="app-navbar">
      <NNavbar>
        <template #search>
          <label class="graph-search">
            <span class="sr-only">Search modules by name or entry path</span>
            <NTextInput v-model="query" type="search" icon="carbon-search" n="primary" placeholder="Search modules..." autocomplete="off" />
          </label>
        </template>
        <template #actions>
          <div class="navbar-filters">
            <NCheckbox v-model="includePackages" n="primary sm">Show package modules</NCheckbox>
            <NCheckbox v-model="showAll" n="primary sm">All installed modules</NCheckbox>
          </div>
          <NButton v-if="selectedId" class="clear-selection" n="sm" @click="clearSelection">Clear selection</NButton>
          <div class="navbar-actions">
            <NButton :border="false" :icon="view === 'graph' ? 'i-carbon-list' : 'i-carbon-network-4'" :aria-label="view === 'graph' ? 'Switch to list view' : 'Switch to graph view'" :title="view === 'graph' ? 'Switch to list view' : 'Switch to graph view'" @click="view = view === 'graph' ? 'list' : 'graph'" />
            <NButton :border="false" icon="i-carbon-renew" :disabled="pending || !connected" aria-label="Refresh modules" title="Refresh modules" @click="refresh()" />
          </div>
        </template>
        <p class="graph-description">Declared dependencies only. Click a module to highlight its dependencies and dependents.</p>
        <p class="status" role="status" aria-live="polite">{{ status }}</p>
        <p v-if="warnings.length" class="warning">{{ warnings.join('\n') }}</p>
      </NNavbar>
    </header>

    <div v-if="!connected" class="empty-state" :style="{ paddingTop: `${navbarHeight + 24}px` }">
      <NCard>Open the Module graph tab inside Nuxt DevTools. This view uses its RPC connection to load graph data.</NCard>
    </div>
    <div v-else-if="error" class="empty-state" role="alert" :style="{ paddingTop: `${navbarHeight + 24}px` }">
      <NCard>
        <p>The graph RPC call failed. Check that the host app and DevTools are connected.</p>
        <NButton n="primary" @click="refresh()">Try again</NButton>
      </NCard>
    </div>
    <template v-else-if="graph && layout">
      <GraphCanvas
        v-show="view === 'graph'"
        ref="canvas"
        :graph="graph"
        :layout="layout"
        :selected="selectedId"
        :visible="view === 'graph'"
        :relation="relation"
        :dimmed="dimmed"
        :count-links="countLinks"
        @select="select"
      />
      <div v-show="view === 'list'" class="list-panel" :style="{ paddingTop: `${navbarHeight}px` }">
        <table>
          <caption class="sr-only">Modules in the selected scope matching your search</caption>
          <thead><tr><th scope="col">Module</th><th scope="col">State</th><th scope="col">Dependencies</th><th scope="col">Dependents</th></tr></thead>
          <tbody>
            <tr v-for="node in matchingNodes" :key="node.id">
              <td>
                <NButton class="module-button" :aria-pressed="node.id === selectedId" @click="select(node.id)">{{ node.name }}</NButton>
                <div v-if="node.entryPath" class="entry">{{ node.entryPath }}</div>
              </td>
              <td>{{ moduleState(node) }}</td>
              <td>{{ countLinks(node.id, 'source') }}</td>
              <td>{{ countLinks(node.id, 'target') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!matchingNodes.length" class="empty">No modules match this search.</p>
      </div>
      <NDrawer :model-value="!!selected" :top="navbar || undefined" class="module-drawer" @close="clearSelection">
        <NButton class="drawer-close" :border="false" icon="i-carbon-close" aria-label="Close module details and clear selection" @click="clearSelection" />
        <ModuleDetails :graph="graph" :node="selected" :outgoing="outgoing" :incoming="incoming" :cycles="selectedCycles" @select="select" />
      </NDrawer>
    </template>
    <p class="sr-only">The viewer does not scan source imports or auto-import usage. No module options or analytics are collected.</p>
  </main>
</template>
