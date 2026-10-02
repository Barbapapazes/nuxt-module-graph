import type { Nuxt } from '@nuxt/schema'
import { isAbsolute, relative, resolve } from 'node:path'
import dagre from '@dagrejs/dagre'
import { resolveAlias } from '@nuxt/kit'

import type { ModuleEdge, ModuleGraph, ModuleGraphLayout, ModuleNode } from './types'

const { graphlib, layout } = dagre

const nodeWidth = 248
const nodeHeight = 76

function createLayout(nodes: ModuleNode[], edges: ModuleEdge[]): ModuleGraphLayout {
  const graph = new graphlib.Graph()
    .setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 100, marginx: 32, marginy: 32 })
    .setDefaultEdgeLabel(() => ({}))

  for (const node of nodes)
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  const ids = new Set(nodes.map(node => node.id))
  const visibleEdges = edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))
  for (const edge of visibleEdges)
    graph.setEdge(edge.source, edge.target)

  layout(graph)

  return {
    width: graph.graph().width || 1,
    height: graph.graph().height || 1,
    nodes: nodes.map(node => ({
      id: node.id,
      x: graph.node(node.id).x - nodeWidth / 2,
      y: graph.node(node.id).y - nodeHeight / 2,
    })),
    edges: visibleEdges.map(edge => ({
      source: edge.source,
      target: edge.target,
      points: graph.edge(edge.source, edge.target).points as { x: number, y: number }[],
    })),
    cycles: graphlib.alg.findCycles(graph),
  }
}

/** Keep Nuxt's internal installed-module registry access in this adapter. */
export async function collectModuleGraph(nuxt: Nuxt): Promise<ModuleGraph> {
  const registrations = (nuxt.options._installedModules || [])
    .filter(module => module.meta.name !== 'nuxt-module-graph')
  const installedModules: typeof registrations = []
  const registrationAliases = new Map<string, number>()
  const canonicalIndexes = new Map<string, number>()
  const nodes: ModuleNode[] = []
  const edges: ModuleEdge[] = []
  const aliases = new Map<string, string>()
  const warnings: string[] = []

  function describeReference(reference: string) {
    const aliased = resolveAlias(reference, nuxt.options.alias)
    const path = aliased.startsWith('.') ? resolve(nuxt.options.rootDir, aliased) : aliased
    const local = isAbsolute(path) && !path.replaceAll('\\', '/').includes('/node_modules/')
    return {
      key: path.replaceAll('\\', '/').replace(/\.(?:[cm]?[jt]s)$/, '').replace(/\/$/, '').replace(/\/index$/, ''),
      kind: local ? 'local' as const : 'package' as const,
      entryPath: local ? relative(nuxt.options.rootDir, path).replaceAll('\\', '/') : reference,
    }
  }

  // Nuxt can record the same module again when another module declares it as a
  // dependency. Merge these registrations rather than drawing duplicate nodes.
  for (const [registrationIndex, installed] of registrations.entries()) {
    const canonical = installed.meta.name
      || (installed.entryPath ? describeReference(installed.entryPath).key : `anonymous:${registrationIndex}`)
    let index = canonicalIndexes.get(canonical)
    if (index === undefined) {
      index = installedModules.length
      canonicalIndexes.set(canonical, index)
      installedModules.push(installed)
    }
    else if (installedModules[index]!.meta.disabled && !installed.meta.disabled) {
      installedModules[index] = installed
    }
    for (const alias of [installed.meta.name, installed.entryPath, installed.meta.rawPath]) {
      if (alias)
        registrationAliases.set(describeReference(alias).key, index)
    }
  }
  for (const [alias, index] of registrationAliases)
    aliases.set(alias, `module:${index}`)

  for (const [index, installed] of installedModules.entries()) {
    const entryPath = installed.entryPath || installed.meta.rawPath
    const name = installed.meta.name || entryPath || `Anonymous module ${index + 1}`
    const id = `module:${index}`
    const descriptor = entryPath ? describeReference(entryPath) : undefined
    nodes.push({
      id,
      name,
      kind: descriptor?.kind || 'package',
      installed: true,
      disabled: Boolean(installed.meta.disabled),
      version: installed.meta.version,
      entryPath: descriptor?.entryPath,
      declarations: installed.module.getModuleDependencies ? 'available' : 'unavailable',
    })
  }

  for (const [index, installed] of installedModules.entries()) {
    const source = nodes[index]!
    try {
      const dependencies = await installed.module.getModuleDependencies?.(nuxt) || {}
      for (const [reference, dependency] of Object.entries(dependencies)) {
        const descriptor = describeReference(reference)
        let target = aliases.get(descriptor.key)
        if (!target) {
          target = `unresolved:${descriptor.key}`
          aliases.set(descriptor.key, target)
          nodes.push({
            id: target,
            name: reference,
            kind: descriptor.kind,
            installed: false,
            disabled: false,
            entryPath: descriptor.entryPath,
            declarations: 'unavailable',
          })
        }
        edges.push({
          source: source.id,
          target,
          reference,
          optional: Boolean(dependency.optional),
          version: dependency.version,
        })
      }
    }
    catch {
      source.declarations = 'error'
      warnings.push(`Could not read declared dependencies for ${source.name}.`)
    }
  }

  const localIds = new Set(nodes.filter(node => node.kind === 'local').map(node => node.id))
  const neighborIds = new Set(localIds)
  for (const edge of edges) {
    if (localIds.has(edge.source))
      neighborIds.add(edge.target)
  }
  const layouts = {
    neighbors: createLayout(nodes.filter(node => neighborIds.has(node.id)), edges),
    local: createLayout(nodes.filter(node => localIds.has(node.id)), edges),
    all: createLayout(nodes, edges),
  }

  return { nodes, edges, layouts, warnings, nodeWidth, nodeHeight }
}
