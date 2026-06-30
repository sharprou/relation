import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person } from '../../types'
import PersonAvatar from '../../components/common/PersonAvatar'

const handleClass = '!h-2 !w-2 !border-0 !bg-transparent opacity-0'
const handlePositions = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
] as const

export default function CenterNode({ data }: NodeProps) {
  const person = data.person as Person
  const fallbackName = person.isSelf ? '我' : person.name

  return (
    <div className="relative grid h-[96px] w-[96px] cursor-grab place-items-center rounded-full bg-[#fff1f4] p-2 text-center text-ink shadow-[0_18px_40px_rgba(239,113,147,0.18)] active:cursor-grabbing">
      <span className="pointer-events-none absolute inset-[-10px] -z-10 rounded-full bg-[#ffd9e2]/35 blur-xl" />
      {handlePositions.map(([id, position]) => (
        <Handle key={`source-${id}`} id={id} type="source" position={position} className={handleClass} />
      ))}
      {handlePositions.map(([id, position]) => (
        <Handle key={`target-${id}`} id={id} type="target" position={position} className={handleClass} />
      ))}
      <PersonAvatar
        name={fallbackName}
        avatar={person.avatar}
        seed={person.circle}
        className="h-full w-full text-[32px] text-[#6a3c4a] shadow-none ring-[3px] ring-white/80"
      />
    </div>
  )
}
