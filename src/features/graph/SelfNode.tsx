import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person } from '../../types'

export default function SelfNode({ data }: NodeProps) {
  const person = data.person as Person

  return (
    <div className="min-w-28 rounded-[1.35rem] bg-clay px-5 py-4 text-center text-white shadow-soft ring-4 ring-white">
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <p className="text-lg font-semibold">{person.name}</p>
      <p className="mt-1 text-xs text-white/80">中心节点</p>
    </div>
  )
}
