import type { Person, Relationship } from '../../types'

export interface GraphPoint {
  x: number
  y: number
}

export interface NetworkLayoutResult {
  people: Person[]
  positions: Map<string, GraphPoint>
  directRelationshipsByPersonId: Map<string, Relationship>
}

interface NetworkLayoutInput {
  centerPersonId: string
  people: Person[]
  relationships: Relationship[]
}

const MIN_NODE_DISTANCE = 118
const CENTER_SAFE_RADIUS = 116
const SAFE_BOUNDS = {
  minX: -232,
  maxX: 232,
  minY: -178,
  maxY: 178,
}

const PRESET_POSITIONS: Record<number, GraphPoint[]> = {
  1: [{ x: 160, y: -58 }],
  2: [
    { x: -156, y: 94 },
    { x: 166, y: -88 },
  ],
  3: [
    { x: 126, y: -142 },
    { x: -168, y: 94 },
    { x: 168, y: 124 },
  ],
  4: [
    { x: -164, y: -126 },
    { x: 164, y: -120 },
    { x: -166, y: 130 },
    { x: 166, y: 126 },
  ],
}

function relationStrength(relationship?: Relationship): number {
  if (!relationship) return 0
  return relationship.intimacy * 0.6 + relationship.trust * 0.4
}

function relationKey(sourcePersonId: string, targetPersonId: string): string {
  return [sourcePersonId, targetPersonId].sort().join('__')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalize(point: GraphPoint): GraphPoint {
  const length = Math.hypot(point.x, point.y)
  if (length < 0.001) return { x: 1, y: 0 }
  return { x: point.x / length, y: point.y / length }
}

function distance(pointA: GraphPoint, pointB: GraphPoint): number {
  return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y)
}

function stableComparePeople(
  centerPersonId: string,
  relationshipsByPair: Map<string, Relationship>,
  degreeByPersonId: Map<string, number>,
) {
  return (personA: Person, personB: Person) => {
    const relationshipA = relationshipsByPair.get(relationKey(centerPersonId, personA.id))
    const relationshipB = relationshipsByPair.get(relationKey(centerPersonId, personB.id))
    const strengthDelta = relationStrength(relationshipB) - relationStrength(relationshipA)
    if (Math.abs(strengthDelta) > 0.001) return strengthDelta

    const degreeDelta = (degreeByPersonId.get(personB.id) ?? 0) - (degreeByPersonId.get(personA.id) ?? 0)
    if (degreeDelta !== 0) return degreeDelta

    const createdDelta = personA.createdAt.localeCompare(personB.createdAt)
    if (createdDelta !== 0) return createdDelta

    return personA.id.localeCompare(personB.id)
  }
}

function buildRelationshipMaps(relationships: Relationship[]): {
  relationshipsByPair: Map<string, Relationship>
  degreeByPersonId: Map<string, number>
} {
  const relationshipsByPair = new Map<string, Relationship>()
  const degreeByPersonId = new Map<string, number>()

  relationships.forEach((relationship) => {
    relationshipsByPair.set(relationKey(relationship.sourcePersonId, relationship.targetPersonId), relationship)
    degreeByPersonId.set(relationship.sourcePersonId, (degreeByPersonId.get(relationship.sourcePersonId) ?? 0) + 1)
    degreeByPersonId.set(relationship.targetPersonId, (degreeByPersonId.get(relationship.targetPersonId) ?? 0) + 1)
  })

  return { relationshipsByPair, degreeByPersonId }
}

function createInitialPositions(people: Person[], centerPersonId: string, relationshipsByPair: Map<string, Relationship>): Map<string, GraphPoint> {
  const positions = new Map<string, GraphPoint>()
  const preset = PRESET_POSITIONS[people.length]

  if (preset) {
    people.forEach((person, index) => {
      positions.set(person.id, { ...preset[index] })
    })
    return positions
  }

  people.forEach((person, index) => {
    const directRelationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
    const strength = relationStrength(directRelationship)
    const angle = -Math.PI / 2 + (index / Math.max(people.length, 1)) * Math.PI * 2
    const radiusX = 194 - strength * 0.22
    const radiusY = 148 - strength * 0.14

    positions.set(person.id, {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
    })
  })

  return positions
}

function clampToSafeArea(point: GraphPoint): GraphPoint {
  const clamped = {
    x: clamp(point.x, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
    y: clamp(point.y, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
  }
  const centerDistance = Math.hypot(clamped.x, clamped.y)

  if (centerDistance < CENTER_SAFE_RADIUS) {
    const direction = normalize(clamped)
    return {
      x: clamp(direction.x * CENTER_SAFE_RADIUS, SAFE_BOUNDS.minX, SAFE_BOUNDS.maxX),
      y: clamp(direction.y * CENTER_SAFE_RADIUS, SAFE_BOUNDS.minY, SAFE_BOUNDS.maxY),
    }
  }

  return clamped
}

function relaxPositions(
  people: Person[],
  positions: Map<string, GraphPoint>,
  relationships: Relationship[],
  centerPersonId: string,
  relationshipsByPair: Map<string, Relationship>,
  degreeByPersonId: Map<string, number>,
): Map<string, GraphPoint> {
  const nextPositions = new Map([...positions].map(([personId, point]) => [personId, { ...point }]))
  const visiblePersonIds = new Set(people.map((person) => person.id))
  const visibleRelationships = relationships.filter((relationship) => (
    visiblePersonIds.has(relationship.sourcePersonId) &&
    visiblePersonIds.has(relationship.targetPersonId)
  ))

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const deltas = new Map(people.map((person) => [person.id, { x: 0, y: 0 }]))

    for (let index = 0; index < people.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < people.length; nextIndex += 1) {
        const personA = people[index]
        const personB = people[nextIndex]
        const pointA = nextPositions.get(personA.id)
        const pointB = nextPositions.get(personB.id)
        const deltaA = deltas.get(personA.id)
        const deltaB = deltas.get(personB.id)
        if (!pointA || !pointB || !deltaA || !deltaB) continue

        const dx = pointB.x - pointA.x
        const dy = pointB.y - pointA.y
        const pairDistance = Math.max(0.001, Math.hypot(dx, dy))
        const requiredDistance = MIN_NODE_DISTANCE + Math.min(18, (degreeByPersonId.get(personA.id) ?? 0) + (degreeByPersonId.get(personB.id) ?? 0))

        if (pairDistance < requiredDistance) {
          const push = (requiredDistance - pairDistance) * 0.11
          const direction = { x: dx / pairDistance, y: dy / pairDistance }
          deltaA.x -= direction.x * push
          deltaA.y -= direction.y * push
          deltaB.x += direction.x * push
          deltaB.y += direction.y * push
        }
      }
    }

    visibleRelationships.forEach((relationship) => {
      const pointA = nextPositions.get(relationship.sourcePersonId)
      const pointB = nextPositions.get(relationship.targetPersonId)
      const deltaA = deltas.get(relationship.sourcePersonId)
      const deltaB = deltas.get(relationship.targetPersonId)
      if (!pointA || !pointB || !deltaA || !deltaB) return

      const pairDistance = Math.max(0.001, distance(pointA, pointB))
      const targetDistance = 136 + (100 - relationStrength(relationship)) * 0.22
      const pull = (pairDistance - targetDistance) * 0.012
      const direction = { x: (pointB.x - pointA.x) / pairDistance, y: (pointB.y - pointA.y) / pairDistance }

      deltaA.x += direction.x * pull
      deltaA.y += direction.y * pull
      deltaB.x -= direction.x * pull
      deltaB.y -= direction.y * pull
    })

    people.forEach((person) => {
      const point = nextPositions.get(person.id)
      const delta = deltas.get(person.id)
      if (!point || !delta) return

      const directRelationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
      const strength = relationStrength(directRelationship)
      const degree = degreeByPersonId.get(person.id) ?? 0
      const targetRadius = clamp(198 - strength * 0.42 - degree * 4, 128, 204)
      const radialDistance = Math.max(0.001, Math.hypot(point.x, point.y))
      const radialDirection = { x: point.x / radialDistance, y: point.y / radialDistance }
      const radialPull = (radialDistance - targetRadius) * 0.018

      delta.x -= radialDirection.x * radialPull
      delta.y -= radialDirection.y * radialPull
    })

    people.forEach((person) => {
      const point = nextPositions.get(person.id)
      const delta = deltas.get(person.id)
      if (!point || !delta) return

      nextPositions.set(person.id, clampToSafeArea({
        x: point.x + delta.x,
        y: point.y + delta.y,
      }))
    })
  }

  return nextPositions
}

export function calculateNetworkLayout({ centerPersonId, people, relationships }: NetworkLayoutInput): NetworkLayoutResult {
  const { relationshipsByPair, degreeByPersonId } = buildRelationshipMaps(relationships)
  const orderedPeople = [...people].sort(stableComparePeople(centerPersonId, relationshipsByPair, degreeByPersonId))
  const directRelationshipsByPersonId = new Map<string, Relationship>()

  orderedPeople.forEach((person) => {
    const relationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
    if (relationship) directRelationshipsByPersonId.set(person.id, relationship)
  })

  const initialPositions = createInitialPositions(orderedPeople, centerPersonId, relationshipsByPair)
  const positions = relaxPositions(
    orderedPeople,
    initialPositions,
    relationships,
    centerPersonId,
    relationshipsByPair,
    degreeByPersonId,
  )

  return { people: orderedPeople, positions, directRelationshipsByPersonId }
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
