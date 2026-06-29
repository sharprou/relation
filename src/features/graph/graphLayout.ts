import type { Person, Relationship } from '../../types'

export function getPersonRadius(person: Person, relationship?: Relationship): number {
  const intimacy = relationship?.intimacy ?? person.intimacy
  const intimacyFactor = (100 - intimacy) / 100

  return 148 + intimacyFactor * 50
}

export function calculateCircularPosition(person: Person, index: number, total: number, relationship?: Relationship) {
  const angle = total === 1 ? -Math.PI / 6 : -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  const radius = getPersonRadius(person, relationship)

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

export type GraphHandlePosition = 'top' | 'right' | 'bottom' | 'left'

export function getHandlePairForPosition(position: { x: number; y: number }): {
  selfHandle: GraphHandlePosition
  personHandle: GraphHandlePosition
} {
  if (Math.abs(position.x) >= Math.abs(position.y)) {
    return position.x >= 0
      ? { selfHandle: 'right', personHandle: 'left' }
      : { selfHandle: 'left', personHandle: 'right' }
  }

  return position.y >= 0
    ? { selfHandle: 'bottom', personHandle: 'top' }
    : { selfHandle: 'top', personHandle: 'bottom' }
}
