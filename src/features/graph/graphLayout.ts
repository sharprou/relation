import type { Person, Relationship } from '../../types'

export function getPersonRadius(person: Person, relationship?: Relationship): number {
  const intimacy = relationship?.intimacy ?? person.intimacy
  const intimacyFactor = (100 - intimacy) / 100

  return 220 + intimacyFactor * 160
}

export function calculateCircularPosition(person: Person, index: number, total: number, relationship?: Relationship) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2
  const radius = getPersonRadius(person, relationship)

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}
