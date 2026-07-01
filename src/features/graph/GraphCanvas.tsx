import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Background, ReactFlow, type Edge, type Node, useEdgesState, useNodesState, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Crosshair } from 'lucide-react'
import clsx from 'clsx'
import PersonNode from './PersonNode'
import CenterNode from './CenterNode'
import RelationshipEdge from './RelationshipEdge'
import IslandFrameNode from './IslandFrameNode'
import { getRelationshipLegendItems, type GraphLineMetric } from './graphStyle'
import type { HighlightedPath } from './pathSearch'
import type { Relationship } from '../../types'

const nodeTypes = {
  centerNode: CenterNode,
  personNode: PersonNode,
  islandFrame: IslandFrameNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

interface ForceVelocity {
  x: number
  y: number
}

interface ForceNodeData {
  layoutAnchor?: {
    x: number
    y: number
  }
}

const FORCE_MAX_FRAMES = 180
const FORCE_MIN_MOTION = 0.18

function toInteractiveNodes(nodes: Node[], previousNodes?: Node[]): Node[] {
  const previousNodeById = new Map(previousNodes?.map((node) => [node.id, node]) ?? [])

  return nodes.map((node) => {
    if (node.type === 'islandFrame') {
      return {
        ...node,
        position: node.position,
        draggable: false,
        selectable: true,
        zIndex: 0,
      }
    }

    const previousNode = previousNodeById.get(node.id)
    const previousData = previousNode?.data as ForceNodeData | undefined
    const layoutAnchor = previousData?.layoutAnchor ?? { ...node.position }

    return {
      ...node,
      position: previousNode?.position ?? node.position,
      data: {
        ...node.data,
        layoutAnchor,
      },
      draggable: true,
      selectable: true,
      zIndex: node.type === 'centerNode' ? 30 : 24,
    }
  })
}

function getStableDirection(idA: string, idB: string) {
  let hash = 0
  const key = `${idA}:${idB}`

  for (let index = 0; index < key.length; index += 1) {
    hash = key.charCodeAt(index) + ((hash << 5) - hash)
  }

  const angle = (Math.abs(hash) % 360) * (Math.PI / 180)

  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  }
}

function getForceRadius(node: Node): number {
  return node.type === 'centerNode' ? 78 : 62
}

function getSpringLength(edge: Edge, nodeCount: number): number {
  const edgeData = edge.data as { isPrimary?: boolean } | undefined

  if (edgeData?.isPrimary) {
    if (nodeCount <= 5) return 188
    if (nodeCount <= 9) return 244
    return 278
  }

  if (nodeCount <= 5) return 248
  if (nodeCount <= 9) return 322
  return 365
}

function getForceSettledNodes(
  nodes: Node[],
  edges: Edge[],
  velocities: Map<string, ForceVelocity>,
): { nodes: Node[]; motion: number } {
  const nextNodes = nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }))
  const nodeById = new Map(nextNodes.map((node) => [node.id, node]))
  const forces = new Map(nextNodes.map((node) => [node.id, { x: 0, y: 0 }]))
  const physicalNodes = nextNodes.filter((node) => node.type !== 'islandFrame')
  const nodeCount = physicalNodes.length

  for (let indexA = 0; indexA < physicalNodes.length; indexA += 1) {
    for (let indexB = indexA + 1; indexB < physicalNodes.length; indexB += 1) {
      const nodeA = physicalNodes[indexA]
      const nodeB = physicalNodes[indexB]
      let dx = nodeB.position.x - nodeA.position.x
      let dy = nodeB.position.y - nodeA.position.y
      let distance = Math.hypot(dx, dy)

      if (distance < 0.001) {
        const stableDirection = getStableDirection(nodeA.id, nodeB.id)
        dx = stableDirection.x
        dy = stableDirection.y
        distance = 1
      }

      const nx = dx / distance
      const ny = dy / distance
      const desiredDistance = getForceRadius(nodeA) + getForceRadius(nodeB) + (nodeCount <= 6 ? 52 : nodeCount <= 12 ? 44 : 36)
      const overlap = Math.max(0, desiredDistance - distance)
      const charge = Math.min(2.8, 3800 / Math.max(distance * distance, 100))
      const push = overlap * 0.055 + charge
      const forceA = forces.get(nodeA.id)
      const forceB = forces.get(nodeB.id)

      if (forceA && forceB) {
        forceA.x -= nx * push
        forceA.y -= ny * push
        forceB.x += nx * push
        forceB.y += ny * push
      }
    }
  }

  edges.forEach((edge) => {
    const sourceNode = nodeById.get(edge.source)
    const targetNode = nodeById.get(edge.target)
    const sourceForce = forces.get(edge.source)
    const targetForce = forces.get(edge.target)

    if (!sourceNode || !targetNode || !sourceForce || !targetForce) return

    let dx = targetNode.position.x - sourceNode.position.x
    let dy = targetNode.position.y - sourceNode.position.y
    let distance = Math.hypot(dx, dy)

    if (distance < 0.001) {
      const stableDirection = getStableDirection(edge.source, edge.target)
      dx = stableDirection.x
      dy = stableDirection.y
      distance = 1
    }

    const nx = dx / distance
    const ny = dy / distance
    const desiredLength = getSpringLength(edge, nodeCount)
    const pull = (distance - desiredLength) * ((edge.data as { isPrimary?: boolean } | undefined)?.isPrimary ? 0.022 : 0.014)

    sourceForce.x += nx * pull
    sourceForce.y += ny * pull
    targetForce.x -= nx * pull
    targetForce.y -= ny * pull
  })

  let motion = 0

  nextNodes.forEach((node) => {
    if (node.type === 'islandFrame') return

    const force = forces.get(node.id)
    if (!force) return

    const gravity = node.type === 'centerNode' ? 0.018 : 0.002
    const layoutAnchor = (node.data as ForceNodeData | undefined)?.layoutAnchor
    const anchorPull = node.type === 'centerNode' ? 0.04 : nodeCount <= 6 ? 0.016 : nodeCount <= 12 ? 0.013 : 0.01
    const boundX = Math.max(0, Math.abs(node.position.x) - 450)
    const boundY = Math.max(0, Math.abs(node.position.y) - 420)
    const velocity = velocities.get(node.id) ?? { x: 0, y: 0 }

    force.x -= node.position.x * gravity
    force.y -= node.position.y * gravity

    if (layoutAnchor) {
      force.x += (layoutAnchor.x - node.position.x) * anchorPull
      force.y += (layoutAnchor.y - node.position.y) * anchorPull
    }

    if (boundX > 0) force.x -= Math.sign(node.position.x) * boundX * 0.035
    if (boundY > 0) force.y -= Math.sign(node.position.y) * boundY * 0.035

    const nextVelocity = {
      x: (velocity.x + force.x) * 0.82,
      y: (velocity.y + force.y) * 0.82,
    }

    node.position.x += nextVelocity.x
    node.position.y += nextVelocity.y
    node.data = {
      ...node.data,
      placement: { ...node.position },
    }
    velocities.set(node.id, nextVelocity)
    motion += Math.abs(nextVelocity.x) + Math.abs(nextVelocity.y)
  })

  return { nodes: nextNodes, motion }
}

function getWarmSettledNodes(nodes: Node[], edges: Edge[], rounds = Math.min(72, 34 + nodes.length * 5)): Node[] {
  let nextNodes = nodes
  const velocities = new Map<string, ForceVelocity>()

  for (let index = 0; index < rounds; index += 1) {
    const result = getForceSettledNodes(nextNodes, edges, velocities)
    nextNodes = result.nodes

    if (result.motion < FORCE_MIN_MOTION * 3) break
  }

  return nextNodes
}

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  lineMetric: GraphLineMetric
  onPersonClick: (personId: string) => void
  onPersonLongPress?: (personId: string) => void
  isIslandView?: boolean
  layoutResetKey?: string
  highlightedPath?: HighlightedPath | null
  className?: string
  emptyHint?: {
    text: string
    actionLabel?: string
    onAction?: () => void
  }
  onRelationshipClick?: (relationship: Relationship) => void
}

export default function GraphCanvas({
  nodes,
  edges,
  lineMetric,
  onPersonClick,
  isIslandView = false,
  layoutResetKey = '',
  highlightedPath,
  className,
  emptyHint,
  onRelationshipClick,
  onPersonLongPress,
}: GraphCanvasProps) {
  const reactFlow = useReactFlow()
  const lastLayoutSignatureRef = useRef('')
  const animationFrameRef = useRef<number | undefined>(undefined)
  const forceFrameRef = useRef(0)
  const velocityRef = useRef(new Map<string, ForceVelocity>())
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(toInteractiveNodes(nodes))
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges)
  const flowNodesRef = useRef(flowNodes)
  const flowEdgesRef = useRef(flowEdges)
  const hasPersonNodes = nodes.some((node) => node.type === 'personNode')
  const personNodeCount = nodes.filter((node) => node.type === 'personNode').length
  const legendItems = getRelationshipLegendItems(lineMetric)
  const fitViewConfig = useMemo(() => {
    if (isIslandView) return { padding: 0.24, maxZoom: 0.78, yOffset: 0 }
    if (personNodeCount <= 4) return { padding: 0.32, maxZoom: 1, yOffset: -38 }
    if (personNodeCount <= 8) return { padding: 0.48, maxZoom: 0.86, yOffset: -20 }
    if (personNodeCount <= 12) return { padding: 0.5, maxZoom: 0.8, yOffset: -8 }
    return { padding: 0.4, maxZoom: 0.82, yOffset: 0 }
  }, [isIslandView, personNodeCount])
  const layoutSignature = useMemo(
    () => [
      layoutResetKey,
      nodes.map((node) => `${node.id}:${Math.round(node.position.x)},${Math.round(node.position.y)}`).join('|'),
      edges.map((edge) => `${edge.id}:${edge.source}>${edge.target}`).sort().join('|'),
    ].join('::'),
    [edges, layoutResetKey, nodes],
  )
  const highlightedPathKey = highlightedPath
    ? [...highlightedPath.personIds, ...highlightedPath.relationshipIds].join('|')
    : ''

  useEffect(() => {
    setFlowEdges(edges)
    flowEdgesRef.current = edges
  }, [edges, setFlowEdges])

  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])

  useEffect(() => {
    flowEdgesRef.current = flowEdges
  }, [flowEdges])

  const stopForceSimulation = useCallback(() => {
    if (animationFrameRef.current !== undefined) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
  }, [])

  const startForceSimulation = useCallback(() => {
    stopForceSimulation()
    velocityRef.current = new Map()
    forceFrameRef.current = 0

    const tick = () => {
      forceFrameRef.current += 1
      const result = getForceSettledNodes(flowNodesRef.current, flowEdgesRef.current, velocityRef.current)

      flowNodesRef.current = result.nodes
      setFlowNodes(result.nodes)

      if (forceFrameRef.current < FORCE_MAX_FRAMES && result.motion > FORCE_MIN_MOTION) {
        animationFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        animationFrameRef.current = undefined
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
  }, [setFlowNodes, stopForceSimulation])

  useEffect(() => {
    const shouldInitializeLayout = lastLayoutSignatureRef.current !== layoutSignature
    lastLayoutSignatureRef.current = layoutSignature

    setFlowNodes((currentNodes) => {
      const interactiveNodes = toInteractiveNodes(nodes, shouldInitializeLayout ? undefined : currentNodes)
      const nextNodes = isIslandView || !shouldInitializeLayout
        ? interactiveNodes
        : getWarmSettledNodes(interactiveNodes, edges)

      flowNodesRef.current = nextNodes

      return nextNodes
    })

    if (!shouldInitializeLayout) return undefined

    stopForceSimulation()
    velocityRef.current = new Map()

    if (isIslandView) return undefined

    const timeoutId = window.setTimeout(() => {
      startForceSimulation()
    }, 90)

    return () => window.clearTimeout(timeoutId)
  }, [edges, isIslandView, layoutSignature, nodes, setFlowNodes, startForceSimulation, stopForceSimulation])

  useEffect(() => () => stopForceSimulation(), [stopForceSimulation])

  const fitGraphView = useCallback((duration = 320) => {
    reactFlow.fitView({ padding: fitViewConfig.padding, duration, maxZoom: fitViewConfig.maxZoom })

    if (hasPersonNodes && fitViewConfig.yOffset !== 0) {
      window.setTimeout(() => {
        const viewport = reactFlow.getViewport()
        reactFlow.setViewport({ ...viewport, y: viewport.y + fitViewConfig.yOffset }, { duration: 180 })
      }, duration + 40)
    }
  }, [fitViewConfig, hasPersonNodes, reactFlow])

  const focusGraphNode = useCallback((nodeId: string) => {
    reactFlow.fitView({
      nodes: [{ id: nodeId }],
      padding: 0.2,
      duration: 320,
      maxZoom: 1,
    })
  }, [reactFlow])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fitGraphView(320)
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [edges.length, fitGraphView, layoutSignature])

  useEffect(() => {
    if (!highlightedPath || highlightedPath.personIds.length === 0) return undefined

    const timeoutId = window.setTimeout(() => {
      const visiblePathNodes = highlightedPath.personIds
        .filter((personId) => flowNodesRef.current.some((node) => node.id === personId))
        .map((personId) => ({ id: personId }))

      if (visiblePathNodes.length === 0) return

      reactFlow.fitView({
        nodes: visiblePathNodes,
        padding: 0.42,
        duration: 420,
        maxZoom: 1,
      })
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [highlightedPath, highlightedPathKey, reactFlow])

  return (
    <div className={clsx('relative h-full min-h-0 overflow-hidden rounded-[1.65rem] bg-[radial-gradient(circle_at_50%_43%,rgba(255,215,224,0.70),transparent_7.5rem),radial-gradient(circle_at_18%_18%,rgba(255,229,233,0.56),transparent_7rem),radial-gradient(circle_at_86%_28%,rgba(255,226,211,0.42),transparent_8rem),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,249,249,0.76))] shadow-[0_18px_42px_rgba(218,116,139,0.11)] ring-1 ring-rose/10', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(239,113,147,0.09)_1px,transparent_1px)] bg-[length:22px_22px] opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white/82 to-white/0" />
      {emptyHint ? (
        <div className="pointer-events-auto absolute left-1/2 top-[58%] z-10 w-[220px] -translate-x-1/2 rounded-full bg-white/90 px-3.5 py-1.5 text-center text-[11px] font-bold text-ink/60 shadow-[0_14px_28px_rgba(239,113,147,0.12)] ring-1 ring-rose/10 backdrop-blur">
          <span>{emptyHint.text}</span>
          {emptyHint.actionLabel && emptyHint.onAction ? (
            <button type="button" className="ml-2 rounded-full bg-[#ffe6ec] px-2.5 py-1 text-rose" onClick={emptyHint.onAction}>
              {emptyHint.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="absolute bottom-[4.7rem] right-3 z-10">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink/70 shadow-[0_14px_28px_rgba(218,116,139,0.14)] ring-1 ring-rose/10 backdrop-blur"
          onClick={() => fitGraphView(350)}
          aria-label="重置视图"
        >
          <Crosshair className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="relative z-[1] h-full">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          className="relationship-flow"
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={stopForceSimulation}
          onNodeDragStop={() => {
            window.setTimeout(() => startForceSimulation(), 0)
          }}
          fitView
          fitViewOptions={{ padding: fitViewConfig.padding, maxZoom: fitViewConfig.maxZoom }}
          minZoom={0.24}
          maxZoom={1.35}
          nodesDraggable={!isIslandView}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          onNodeClick={(_, node) => {
            if (node.type === 'islandFrame') {
              focusGraphNode(node.id)
              return
            }
            if (node.type === 'personNode' || node.type === 'centerNode') onPersonClick(node.id)
          }}
          onNodeContextMenu={(event, node) => {
            if (node.type !== 'personNode' && node.type !== 'centerNode') return
            event.preventDefault()
            onPersonLongPress?.(node.id)
          }}
          onEdgeClick={(_, edge) => {
            const relationship = (edge.data as { relationship?: Relationship } | undefined)?.relationship
            if (relationship) onRelationshipClick?.(relationship)
          }}
        >
          <Background color="#f8dce4" gap={24} size={0.75} />
        </ReactFlow>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-[158px] rounded-[1.1rem] bg-white/88 px-3 py-2 text-[10px] font-bold text-ink/72 shadow-[0_14px_28px_rgba(218,116,139,0.10)] ring-1 ring-rose/10 backdrop-blur">
        <p className="mb-1.5 text-[10px] font-black text-ink">{lineMetric === 'trust' ? '信任度' : '亲密度'}</p>
        <div className="space-y-1">
          {legendItems.map((item) => (
            <LegendLine key={item.label} color={item.color} label={item.label} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
