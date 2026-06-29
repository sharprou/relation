import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Person } from '../../types'

const handleClass = '!h-2 !w-2 !border-0 !bg-transparent opacity-0'

export default function SelfNode({ data }: NodeProps) {
  const person = data.person as Person

  return (
    <div className="relative grid h-[104px] w-[104px] place-items-center rounded-full bg-[radial-gradient(circle_at_50%_45%,#fff6f4_0%,#ffdce7_56%,#ffeaf0_100%)] text-center text-ink shadow-[0_22px_48px_rgba(239,113,147,0.24)] ring-[16px] ring-[#ffdce7]/50">
      {(['top', 'right', 'bottom', 'left'] as const).map((position) => (
        <Handle key={`source-${position}`} id={position} type="source" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position]} className={handleClass} />
      ))}
      {(['top', 'right', 'bottom', 'left'] as const).map((position) => (
        <Handle key={`target-${position}`} id={position} type="target" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position]} className={handleClass} />
      ))}
      <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fff6f4] text-[34px] font-black leading-none text-[#6a3c4a] shadow-[inset_0_0_0_8px_rgba(255,210,218,0.86)]">
        {person.name.trim().slice(0, 1) || '我'}
      </div>
    </div>
  )
}
