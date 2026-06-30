import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person, Relationship } from '../../types'
import PersonAvatar from '../../components/common/PersonAvatar'
import { displayCircle } from '../../utils/display'
import { getCircleColor } from './graphStyle'

const handleClass = '!h-2 !w-2 !border-0 !bg-transparent opacity-0'
const handlePositions = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
] as const

export default function PersonNode({ data }: NodeProps) {
  const person = data.person as Person
  const relationship = data.relationship as Relationship | undefined
  const placement = data.placement as { x: number; y: number } | undefined
  const color = getCircleColor(person.circle)
  const isRightSide = (placement?.x ?? -1) > 0

  return (
    <button
      type="button"
      className="group relative h-[74px] w-[74px] rounded-full p-0 text-left transition hover:-translate-y-0.5"
    >
      {handlePositions.map(([id, position]) => (
        <Handle key={`target-${id}`} id={id} type="target" position={position} className={handleClass} />
      ))}
      {handlePositions.map(([id, position]) => (
        <Handle key={`source-${id}`} id={id} type="source" position={position} className={handleClass} />
      ))}
      <div
        className="grid h-[74px] w-[74px] place-items-center rounded-full border-[2.5px] bg-white/85 p-1.5 shadow-[0_14px_32px_rgba(239,113,147,0.16)] backdrop-blur"
        style={{ borderColor: color, boxShadow: `0 14px 30px ${color}38` }}
      >
        <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-full w-full text-xl shadow-none ring-0" />
      </div>
      <div className={`pointer-events-none absolute top-1/2 min-w-[82px] -translate-y-1/2 ${isRightSide ? 'right-[82px] text-right' : 'left-[82px] text-left'}`}>
        <p className="truncate text-[14px] font-black leading-5 text-ink">{person.name}</p>
        <p className={`mt-0.5 inline-flex max-w-[92px] truncate rounded-full bg-white/82 px-2 py-0.5 text-[11px] font-bold leading-4 text-ink/55 shadow-[0_8px_16px_rgba(239,113,147,0.08)] ring-1 ring-rose/10 ${isRightSide ? 'ml-auto' : ''}`}>
          {relationship?.type ?? (person.relationType || displayCircle(person.circle))}
        </p>
      </div>
    </button>
  )
}
