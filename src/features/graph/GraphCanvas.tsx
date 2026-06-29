import { Background, Controls, ReactFlow, type Edge, type Node, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
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
}

export default function GraphCanvas({ nodes, edges, onPersonClick }: GraphCanvasProps) {
  const reactFlow = useReactFlow()

  return (
    <div className="h-[520px] min-h-[420px] overflow-hidden rounded-[1.5rem] bg-white/70 shadow-soft ring-1 ring-white sm:h-[640px]">
      <div className="flex justify-end p-3">
        <button
          type="button"
          className="rounded-2xl bg-paper px-4 py-2 text-xs font-medium text-ink shadow-sm ring-1 ring-white"
          onClick={() => reactFlow.fitView({ padding: 0.25, duration: 350 })}
        >
          重置视图
        </button>
      </div>
      <div className="h-[calc(100%-56px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.35}
          maxZoom={1.8}
          panOnScroll
          onNodeClick={(_, node) => {
            if (node.type === 'personNode') onPersonClick(node.id)
          }}
        >
          <Background color="#d8cfc4" gap={20} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}
