import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person, Relationship } from '../../types'
import { getCircleColor } from './graphStyle'

export default function PersonNode({ data }: NodeProps) {
  const person = data.person as Person
  const relationship = data.relationship as Relationship | undefined
  const color = getCircleColor(person.circle)

  return (
    <button
      type="button"
      className="min-w-36 rounded-[1.2rem] bg-white/95 px-4 py-3 text-left shadow-soft ring-2 transition hover:-translate-y-0.5"
      style={{ borderColor: color, boxShadow: `0 16px 36px ${color}33` }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <p className="text-sm font-semibold text-ink">{person.name}</p>
      <p className="mt-1 text-xs text-ink/60">{relationship?.type ?? person.relationType}</p>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink/60">
        <span className="rounded-full bg-paper px-2 py-1">{person.circle}</span>
        <span>亲密 {relationship?.intimacy ?? person.intimacy}</span>
      </div>
    </button>
  )
}
