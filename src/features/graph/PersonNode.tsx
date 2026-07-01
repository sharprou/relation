import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useRef, type PointerEvent } from 'react'
import type { Person, Relationship } from '../../types'
import PersonAvatar from '../../components/common/PersonAvatar'
import { displayCircle } from '../../utils/display'
import { getCircleColor } from './graphStyle'

export type PersonNodeLabelPlacement = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const handleClass = '!h-2 !w-2 !border-0 !bg-transparent opacity-0'
const handlePositions = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
] as const

const labelPlacementClass: Record<PersonNodeLabelPlacement, string> = {
  left: 'right-[82px] top-1/2 -translate-y-1/2 text-right',
  right: 'left-[82px] top-1/2 -translate-y-1/2 text-left',
  'top-left': 'bottom-[78px] right-[48px] text-right',
  'top-right': 'bottom-[78px] left-[48px] text-left',
  'bottom-left': 'right-[48px] top-[78px] text-right',
  'bottom-right': 'left-[48px] top-[78px] text-left',
}

export default function PersonNode({ data }: NodeProps) {
  const person = data.person as Person
  const relationship = data.relationship as Relationship | undefined
  const placement = data.placement as { x: number; y: number } | undefined
  const labelPlacement = data.labelPlacement as PersonNodeLabelPlacement | undefined
  const isPathHighlighted = Boolean(data.isPathHighlighted)
  const isDimmed = Boolean(data.isDimmed)
  const onLongPress = data.onLongPress as ((personId: string) => void) | undefined
  const longPressTimerRef = useRef<number | undefined>(undefined)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const color = getCircleColor(person.circle)
  const fallbackPlacement = (placement?.x ?? -1) > 0 ? 'left' : 'right'
  const resolvedPlacement = labelPlacement ?? fallbackPlacement
  const alignsRight = resolvedPlacement.includes('left') || resolvedPlacement === 'left'
  const clearLongPress = () => {
    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = undefined
    }
  }
  const startLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress?.(person.id)
      clearLongPress()
    }, 520)
  }
  const cancelLongPressOnMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 9) clearLongPress()
  }

  return (
    <button
      type="button"
      className="group relative h-[74px] w-[74px] cursor-grab rounded-full p-0 text-left transition hover:-translate-y-0.5 active:cursor-grabbing"
      style={{ opacity: isDimmed ? 0.38 : 1 }}
      onPointerDown={startLongPress}
      onPointerMove={cancelLongPressOnMove}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
      onContextMenu={(event) => {
        event.preventDefault()
        onLongPress?.(person.id)
      }}
    >
      {handlePositions.map(([id, position]) => (
        <Handle key={`target-${id}`} id={id} type="target" position={position} className={handleClass} />
      ))}
      {handlePositions.map(([id, position]) => (
        <Handle key={`source-${id}`} id={id} type="source" position={position} className={handleClass} />
      ))}
      <div
        className="grid h-[74px] w-[74px] place-items-center rounded-full border-[2.5px] bg-white p-1.5 shadow-[0_14px_32px_rgba(239,113,147,0.16)]"
        style={{
          borderColor: isPathHighlighted ? '#ef7193' : color,
          boxShadow: isPathHighlighted
            ? `0 0 0 7px rgba(255,220,228,0.78), 0 16px 34px rgba(239,113,147,0.28)`
            : `0 14px 30px ${color}38`,
        }}
      >
        <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-full w-full text-xl shadow-none ring-0" />
      </div>
      <div className={`pointer-events-none absolute min-w-[86px] max-w-[112px] rounded-[0.85rem] bg-white/76 px-2 py-1 shadow-[0_8px_18px_rgba(239,113,147,0.09)] ring-1 ring-rose/10 backdrop-blur ${labelPlacementClass[resolvedPlacement]}`}>
        <p className="truncate text-[14px] font-black leading-5 text-ink">{person.name}</p>
        <p className={`mt-0.5 inline-flex max-w-[96px] truncate rounded-full bg-white/82 px-2 py-0.5 text-[11px] font-bold leading-4 text-ink/55 shadow-[0_8px_16px_rgba(239,113,147,0.08)] ring-1 ring-rose/10 ${alignsRight ? 'ml-auto' : ''}`}>
          {relationship?.type ?? (person.relationType || displayCircle(person.circle))}
        </p>
      </div>
    </button>
  )
}
