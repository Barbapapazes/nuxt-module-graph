<script setup lang="ts">
import type { ModuleEdge, ModuleGraph, ModuleNode } from '../../../src/types'

const props = defineProps<{
  graph: ModuleGraph
  node?: ModuleNode
  outgoing: ModuleEdge[]
  incoming: ModuleEdge[]
  cycles: string
}>()
const emit = defineEmits<{ select: [id: string] }>()
const heading = useTemplateRef('heading')
const nodes = computed(() => new Map(props.graph.nodes.map(node => [node.id, node])))
const groups = computed(() => [
  { title: 'Depends on', direction: 'target' as const, edges: props.outgoing, empty: 'No declared dependencies available.' },
  { title: 'Depended on by', direction: 'source' as const, edges: props.incoming, empty: 'No declared dependents.' },
].map(group => ({ ...group, links: group.edges.flatMap(edge => {
  const node = nodes.value.get(edge[group.direction])
  return node ? [{ edge, node }] : []
}).sort((a, b) => a.node.name.localeCompare(b.node.name)) })))

async function select(id: string) {
  emit('select', id)
  await nextTick()
  heading.value?.focus()
}
</script>

<template>
  <aside aria-labelledby="details-heading">
    <h2 id="details-heading" ref="heading" tabindex="-1">Module details</h2>
    <template v-if="node">
      <strong>{{ node.name }}</strong>
      <p class="meta">{{ moduleState(node) }}<template v-if="node.version"> · {{ node.version }}</template></p>
      <p v-if="node.entryPath" class="entry">{{ node.entryPath }}</p>
      <p v-if="node.declarations === 'unavailable'" class="meta">This module does not expose declared dependency metadata. No links can be inferred from that.</p>
      <p v-if="node.declarations === 'error'" class="warning">Reading this module's dependency metadata failed.</p>
      <p v-if="node.disabled" class="meta">This module is disabled. Its declarations do not imply active dependencies.</p>
      <section v-for="group in groups" :key="group.direction" :aria-label="group.title">
        <h3>{{ group.title }} · {{ group.edges.length }}</h3>
        <p v-if="!group.edges.length" class="meta">{{ group.empty }}</p>
        <ul v-else class="link-list">
          <li v-for="{ edge, node: linkedNode } in group.links" :key="`${edge.source}:${edge.target}:${edge.reference}`">
            <NButton :aria-pressed="linkedNode.id === node.id" @click="select(linkedNode.id)">{{ linkedNode.name }}</NButton>
            <small>{{ [edge.optional ? 'Optional' : 'Required', edge.version ? `Version ${edge.version}` : undefined, edge.reference].filter(Boolean).join(' · ') }}</small>
          </li>
        </ul>
      </section>
      <p v-if="cycles" class="warning">Part of a declared dependency cycle with {{ cycles }}.</p>
    </template>
    <p v-else>Select a module in the graph or list.</p>
  </aside>
</template>
