export interface ModuleNode {
  id: string
  name: string
  kind: 'local' | 'package'
  installed: boolean
  disabled: boolean
  version?: string
  entryPath?: string
  declarations: 'available' | 'unavailable' | 'error'
}

export interface ModuleEdge {
  source: string
  target: string
  reference: string
  optional: boolean
  version?: string
}

export type GraphScope = 'neighbors' | 'local' | 'all'

export interface ModuleGraphLayout {
  width: number
  height: number
  nodes: { id: string, x: number, y: number }[]
  edges: { source: string, target: string, points: { x: number, y: number }[] }[]
  cycles: string[][]
}

export interface ModuleGraph {
  nodes: ModuleNode[]
  edges: ModuleEdge[]
  layouts: Record<GraphScope, ModuleGraphLayout>
  warnings: string[]
  nodeWidth: number
  nodeHeight: number
}
