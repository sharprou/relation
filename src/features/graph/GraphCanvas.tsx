import { useEffect } from 'react'
import { Background, ReactFlow, type Edge, type Node, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Crosshair } from 'lucide-react'
import clsx from 'clsx'
import PersonNode from './PersonNode'
import SelfNode from './SelfNode'

const nodeTypes = {
  selfNode: SelfNode,
  personNode: PersonNode,
}

interface GraphCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onPersonClick: (personId: string) => void
  className?: string
  emptyHint?: {
    text: string
    actionLabel?: string
    onAction?: () => void
  }
}

export default function GraphCanvas({ nodes, edges, onPersonClick, className, emptyHint }: GraphCanvasProps) {
  const reactFlow = useReactFlow()
  const hasPersonNodes = nodes.some((node) => node.type === 'personNode')

  const fitGraphView = (duration = 320) => {
    reactFlow.fitView({ padding: 0.22, duration, maxZoom: 1.12 })

    if (hasPersonNodes) {
      window.setTimeout(() => {
        const viewport = reactFlow.getViewport()
        reactFlow.setViewport({ ...viewport, y: viewport.y - 82 }, { duration: 180 })
      }, duration + 40)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fitGraphView(320)
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [edges.length, nodes.length, reactFlow])

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
          fitView
          fitViewOptions={{ padding: 0.22, maxZoom: 1.12 }}
          minZoom={0.35}
          maxZoom={1.25}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          onNodeClick={(_, node) => {
            if (node.type === 'personNode') onPersonClick(node.id)
          }}
        >
          <Background color="#f8dce4" gap={24} size={0.75} />
        </ReactFlow>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-[188px] rounded-[1.1rem] bg-white/88 px-3 py-2 text-[10px] font-bold text-ink/72 shadow-[0_14px_28px_rgba(218,116,139,0.10)] ring-1 ring-rose/10 backdrop-blur">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-[10px] font-black text-ink">亲密度</p>
            <div className="space-y-1">
              <LegendLine color="#f5a375" label="80-100" />
              <LegendLine color="#ef8fae" label="60-80" />
              <LegendLine color="#e8bfc8" label="40-60" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-black text-ink">信任度</p>
            <div className="space-y-1">
              <LegendLine color="#8ab7f3" label="高" />
              <LegendLine color="#f0a7ba" label="中" />
              <LegendLine color="#d8cdd0" label="低" />
            </div>
          </div>
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
