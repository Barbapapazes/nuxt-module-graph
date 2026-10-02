<script setup lang="ts">
import type { Edge, Node, Options } from 'vis-network'
import type { ModuleGraph, ModuleGraphLayout, ModuleNode } from '../../../src/types'
import { DataSet } from 'vis-data'
import { Network } from 'vis-network'

const props = defineProps<{
  graph: ModuleGraph
  layout: ModuleGraphLayout
  selected?: string
  visible: boolean
  relation: (id: string) => string
  dimmed: (node: ModuleNode) => boolean
  countLinks: (id: string, direction: 'source' | 'target') => number
}>()
const emit = defineEmits<{ select: [id: string] }>()
const container = useTemplateRef('container')
const network = shallowRef<Network>()
const nodeData = new DataSet<Node>()
const edgeData = new DataSet<Edge>()
const dark = useState<boolean>('module-graph-dark')
const zoom = ref(1)
const moduleNodes = computed(() => new Map(props.graph.nodes.map(node => [node.id, node])))
const visibleNodes = computed(() => props.layout.nodes.flatMap(position => {
  const node = moduleNodes.value.get(position.id)
  return node ? [node] : []
}))

function nodeStyle(node: ModuleNode): Node {
  const isSelected = node.id === props.selected
  const dimmed = !isSelected && props.dimmed(node)
  const relation = props.relation(node.id)
  const color = dimmed ? '#8883'
    : isSelected ? '#60a5fa'
      : relation === 'dependency' ? '#42b883'
        : relation === 'dependent' ? '#c084fc'
          : !node.installed || node.disabled ? '#b86542'
            : node.kind === 'local' ? '#42b883' : '#b4b842'
  return {
    id: node.id,
    color,
    borderWidth: isSelected ? 3 : 1,
    size: 15 + Math.min(props.countLinks(node.id, 'source') / 2, 8) + (isSelected ? 4 : 0),
    font: { color: dimmed ? '#8885' : dark.value ? '#fff' : '#111' },
  }
}

function edgeStyle(source: string, target: string): Edge {
  const relation = source === props.selected ? 'dependency' : target === props.selected ? 'dependent' : 'default'
  return {
    color: { color: relation === 'dependency' ? '#42b883' : relation === 'dependent' ? '#c084fc' : props.selected ? '#8882' : '#8886', inherit: false },
    width: relation === 'default' ? 1 : 2,
  }
}

function setData() {
  const visibleIds = new Set(visibleNodes.value.map(node => node.id))
  nodeData.clear()
  edgeData.clear()
  nodeData.add(visibleNodes.value.map(node => ({
    ...nodeStyle(node),
    label: node.name,
    shape: 'dot',
    group: !node.installed || node.disabled ? 'unknown' : node.kind === 'local' ? 'user' : 'lib',
  })))
  edgeData.add(props.graph.edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map((edge, index) => ({
    id: `edge:${index}`,
    from: edge.source,
    to: edge.target,
    dashes: edge.optional,
    arrows: { to: { enabled: true, scaleFactor: 0.8 } },
    ...edgeStyle(edge.source, edge.target),
  })))
  network.value?.setOptions({ physics: { enabled: true } })
  network.value?.setData({ nodes: nodeData, edges: edgeData })
}

function updateHighlights() {
  if (!network.value)
    return
  // Update appearance without rebuilding the network, so clicks and searches
  // preserve the current positions, zoom, and pan.
  nodeData.update(visibleNodes.value.map(nodeStyle))
  edgeData.update(edgeData.get().map(edge => ({ id: edge.id!, ...edgeStyle(String(edge.from), String(edge.to)) })))
  network.value.selectNodes(props.selected && nodeData.get(props.selected) ? [props.selected] : [], false)
}

function fit() {
  network.value?.fit({ animation: false })
}

function changeZoom(factor: number) {
  if (!network.value)
    return
  const scale = Math.max(0.1, Math.min(3, network.value.getScale() * factor))
  network.value.moveTo({ scale, animation: false })
  zoom.value = scale
}

function focus() {
  container.value?.focus()
}

defineExpose({ fit, focus, changeZoom })

onMounted(() => {
  const options: Options = {
    nodes: { shape: 'dot', size: 16 },
    physics: {
      repulsion: { centralGravity: 0.7, springLength: 100, springConstant: 0.01 },
      maxVelocity: 146,
      solver: 'forceAtlas2Based',
      timestep: 0.35,
      stabilization: { enabled: true, iterations: 200 },
    },
    groups: {
      user: { color: '#42b883' },
      lib: { color: '#b4b842' },
      unknown: { color: '#b86542' },
    },
    interaction: { hover: true, keyboard: { enabled: true, bindToWindow: false } },
  }
  network.value = new Network(container.value!, { nodes: nodeData, edges: edgeData }, options)
  network.value.on('click', (event: { nodes: (string | number)[] }) => {
    const id = event.nodes[0]
    if (id !== undefined)
      emit('select', String(id))
  })
  network.value.on('zoom', (event: { scale: number }) => { zoom.value = event.scale })
  network.value.on('stabilizationIterationsDone', () => {
    zoom.value = network.value?.getScale() || 1
    network.value?.setOptions({ physics: { enabled: false } })
  })
  setData()
})

watch([() => props.graph, () => props.layout], setData)
watchEffect(updateHighlights)
watch(() => props.visible, async (visible) => {
  if (visible) {
    await nextTick()
    network.value?.redraw()
  }
})
onBeforeUnmount(() => network.value?.destroy())
</script>

<template>
  <div class="network-view">
    <div ref="container" class="network-canvas" tabindex="0" role="region" aria-label="Declared module dependency graph. Drag to pan, scroll to zoom, and click a module to highlight its links. Use the list view for keyboard module selection." />
    <NCard class="graph-legend" border="0" n-glass-effect>
      <div class="legend-row"><span class="legend-dot local-dot" /><span>Local module</span></div>
      <div class="legend-row"><span class="legend-dot package-dot" /><span>Package module</span></div>
      <div class="legend-row"><span class="legend-dot unknown-dot" /><span>Disabled / unresolved</span></div>
      <div class="legend-row"><span class="legend-dot selected-dot" /><span>Selected module</span></div>
      <div class="legend-row"><span class="legend-dot dependency-dot" /><span>Dependency</span></div>
      <div class="legend-row"><span class="legend-dot dependent-dot" /><span>Dependent</span></div>
      <p>Arrows point to dependencies.<br>Dashed edges are optional.</p>
    </NCard>
    <div class="graph-zoom" role="group" aria-label="Graph zoom">
      <NButton aria-label="Zoom out" @click="changeZoom(1 / 1.25)">−</NButton>
      <output aria-label="Zoom level">{{ Math.round(zoom * 100) }}%</output>
      <NButton aria-label="Zoom in" @click="changeZoom(1.25)">+</NButton>
      <NButton @click="fit">Fit</NButton>
    </div>
  </div>
</template>
