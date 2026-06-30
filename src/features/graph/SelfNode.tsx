import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person } from '../../types'
import PersonAvatar from '../../components/common/PersonAvatar'

const handleClass = '!h-2 !w-2 !border-0 !bg-transparent opacity-0'

export default function SelfNode({ data }: NodeProps) {
  const person = data.person as Person

  return (
    <div className="relative grid h-[94px] w-[94px] place-items-center rounded-full bg-[#fff1f4] p-2 text-center text-ink shadow-[0_18px_40px_rgba(239,113,147,0.18)]">
      <span className="pointer-events-none absolute inset-[-10px] -z-10 rounded-full bg-[#ffd9e2]/35 blur-xl" />
      {(['top', 'right', 'bottom', 'left'] as const).map((position) => (
        <Handle key={`source-${position}`} id={position} type="source" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position]} className={handleClass} />
      ))}
      {(['top', 'right', 'bottom', 'left'] as const).map((position) => (
        <Handle key={`target-${position}`} id={position} type="target" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position]} className={handleClass} />
      ))}
      <PersonAvatar
        name={person.name || '我'}
        avatar={person.avatar}
        seed={person.circle}
        className="h-full w-full text-[32px] text-[#6a3c4a] shadow-none ring-[3px] ring-white/80"
      />
    </div>
  )
}
