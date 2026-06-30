import { useCallback, useEffect, useMemo } from 'react'
import { Background, ReactFlow, type Edge, type Node, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Crosshair } from 'lucide-react'
import clsx from 'clsx'
import PersonNode from './PersonNode'
import CenterNode from './CenterNode'
import RelationshipEdge from './RelationshipEdge'
import { getRelationshipLegendItems, type GraphLineMetric } from './graphStyle'

const nodeTypes = {
  centerNode: CenterNode,
  personNode: PersonNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  lineMetric: GraphLineMetric
  onPersonClick: (personId: string) => void
  className?: string
  emptyHint?: {
    text: string
    actionLabel?: string
    onAction?: () => void
  }
}

export default function GraphCanvas({ nodes, edges, lineMetric, onPersonClick, className, emptyHint }: GraphCanvasProps) {
  const reactFlow = useReactFlow()
  const hasPersonNodes = nodes.some((node) => node.type === 'personNode')
  const personNodeCount = nodes.filter((node) => node.type === 'personNode').length
  const legendItems = getRelationshipLegendItems(lineMetric)
  const fitViewConfig = useMemo(() => {
    if (personNodeCount <= 4) return { padding: 0.22, maxZoom: 1.12, yOffset: -82 }
    if (personNodeCount <= 8) return { padding: 0.28, maxZoom: 1, yOffset: -52 }
    if (personNodeCount <= 12) return { padding: 0.34, maxZoom: 0.92, yOffset: -24 }
    return { padding: 0.4, maxZoom: 0.82, yOffset: 0 }
  }, [personNodeCount])
  const layoutSignature = useMemo(
    () => nodes.map((node) => `${node.id}:${Math.round(node.position.x)},${Math.round(node.position.y)}`).join('|'),
    [nodes],
  )

  const fitGraphView = useCallback((duration = 320) => {
    reactFlow.fitView({ padding: fitViewConfig.padding, duration, maxZoom: fitViewConfig.maxZoom })

    if (hasPersonNodes && fitViewConfig.yOffset !== 0) {
      window.setTimeout(() => {
        const viewport = reactFlow.getViewport()
        reactFlow.setViewport({ ...viewport, y: viewport.y + fitViewConfig.yOffset }, { duration: 180 })
      }, duration + 40)
    }
  }, [fitViewConfig, hasPersonNodes, reactFlow])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fitGraphView(320)
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [edges.length, fitGraphView, layoutSignature])

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
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: fitViewConfig.padding, maxZoom: fitViewConfig.maxZoom }}
          minZoom={0.24}
          maxZoom={1.35}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          onNodeClick={(_, node) => {
            if (node.type === 'personNode' || node.type === 'centerNode') onPersonClick(node.id)
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
