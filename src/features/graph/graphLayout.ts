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
  depthByPersonId?: Map<string, number>
}

interface LayoutConfig {
  radiusX: number
  radiusY: number
  minNodeDistance: number
  centerSafeRadius: number
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  iterations: number
}

const DOUBLE_RING_THRESHOLD = 10

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

function getLayoutConfig(count: number): LayoutConfig {
  const radiusX = count <= 4 ? 150 : count <= 8 ? 205 : count <= 12 ? 310 : 365
  const radiusY = count <= 4 ? 170 : count <= 8 ? 220 : count <= 12 ? 335 : 395
  const minNodeDistance = count <= 4 ? 110 : count <= 8 ? 125 : count <= 12 ? 150 : 155
  const centerSafeRadius = count <= 4 ? 112 : count <= 8 ? 126 : count <= 12 ? 190 : 210

  return {
    radiusX,
    radiusY,
    minNodeDistance,
    centerSafeRadius,
    bounds: {
      minX: -radiusX - 86,
      maxX: radiusX + 86,
      minY: -radiusY - 86,
      maxY: radiusY + 86,
    },
    iterations: count <= 4 ? 26 : count <= 8 ? 36 : 44,
  }
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
  depthByPersonId?: Map<string, number>,
) {
  return (personA: Person, personB: Person) => {
    const depthDelta = (depthByPersonId?.get(personA.id) ?? 1) - (depthByPersonId?.get(personB.id) ?? 1)
    if (depthDelta !== 0) return depthDelta

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

function getPersonDepth(personId: string, centerPersonId: string, relationshipsByPair: Map<string, Relationship>, depthByPersonId?: Map<string, number>): number {
  const depth = depthByPersonId?.get(personId)
  if (depth && depth > 0) return depth

  return relationshipsByPair.has(relationKey(centerPersonId, personId)) ? 1 : 2
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

function clampToSafeArea(point: GraphPoint, config: LayoutConfig): GraphPoint {
  const clamped = {
    x: clamp(point.x, config.bounds.minX, config.bounds.maxX),
    y: clamp(point.y, config.bounds.minY, config.bounds.maxY),
  }
  const centerDistance = Math.hypot(clamped.x, clamped.y)

  if (centerDistance < config.centerSafeRadius) {
    const direction = normalize(clamped)
    return {
      x: clamp(direction.x * config.centerSafeRadius, config.bounds.minX, config.bounds.maxX),
      y: clamp(direction.y * config.centerSafeRadius, config.bounds.minY, config.bounds.maxY),
    }
  }

  return clamped
}

function placePeopleOnRing(
  ringPeople: Person[],
  positions: Map<string, GraphPoint>,
  options: {
    centerPersonId: string
    relationshipsByPair: Map<string, Relationship>
    degreeByPersonId: Map<string, number>
    config: LayoutConfig
    radiusX: number
    radiusY: number
    angleOffset: number
  },
) {
  const { centerPersonId, relationshipsByPair, degreeByPersonId, config, radiusX, radiusY, angleOffset } = options
  const total = Math.max(ringPeople.length, 1)

  ringPeople.forEach((person, index) => {
    const directRelationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
    const strength = relationStrength(directRelationship)
    const degree = degreeByPersonId.get(person.id) ?? 0
    const radiusScale = clamp(1 - strength * 0.0009 - Math.min(0.045, degree * 0.005), 0.88, 1)
    const angle = angleOffset + (index / total) * Math.PI * 2

    positions.set(person.id, clampToSafeArea({
      x: Math.cos(angle) * radiusX * radiusScale,
      y: Math.sin(angle) * radiusY * radiusScale,
    }, config))
  })
}

function createInitialPositions(
  people: Person[],
  centerPersonId: string,
  relationshipsByPair: Map<string, Relationship>,
  degreeByPersonId: Map<string, number>,
  config: LayoutConfig,
  depthByPersonId?: Map<string, number>,
): Map<string, GraphPoint> {
  const positions = new Map<string, GraphPoint>()
  const maxDepth = Math.max(1, ...people.map((person) => getPersonDepth(person.id, centerPersonId, relationshipsByPair, depthByPersonId)))

  if (maxDepth > 1) {
    const groupedByDepth = new Map<number, Person[]>()

    people.forEach((person) => {
      const depth = getPersonDepth(person.id, centerPersonId, relationshipsByPair, depthByPersonId)
      const group = groupedByDepth.get(depth) ?? []

      group.push(person)
      groupedByDepth.set(depth, group)
    })

    Array.from(groupedByDepth.keys()).sort((depthA, depthB) => depthA - depthB).forEach((depth) => {
      const ringPeople = groupedByDepth.get(depth) ?? []
      const safeDepth = Math.min(depth, 4)
      const radiusX = clamp(config.centerSafeRadius + 82 + (safeDepth - 1) * 108, config.centerSafeRadius + 48, config.bounds.maxX - 36)
      const radiusY = clamp(config.centerSafeRadius + 96 + (safeDepth - 1) * 118, config.centerSafeRadius + 56, config.bounds.maxY - 36)
      const angleOffset = -Math.PI / 2 + (depth - 1) * (Math.PI / Math.max(ringPeople.length, 3))

      placePeopleOnRing(ringPeople, positions, {
        centerPersonId,
        relationshipsByPair,
        degreeByPersonId,
        config,
        radiusX,
        radiusY,
        angleOffset,
      })
    })

    return positions
  }

  const preset = PRESET_POSITIONS[people.length]

  if (preset) {
    people.forEach((person, index) => {
      positions.set(person.id, clampToSafeArea({ ...preset[index] }, config))
    })
    return positions
  }

  if (people.length > DOUBLE_RING_THRESHOLD) {
    const innerCount = Math.ceil(people.length * 0.55)
    const outerPeople = people.slice(innerCount)
    const outerStep = (Math.PI * 2) / Math.max(outerPeople.length, 1)

    placePeopleOnRing(people.slice(0, innerCount), positions, {
      centerPersonId,
      relationshipsByPair,
      degreeByPersonId,
      config,
      radiusX: config.radiusX * 0.86,
      radiusY: config.radiusY * 0.86,
      angleOffset: -Math.PI / 2,
    })

    placePeopleOnRing(outerPeople, positions, {
      centerPersonId,
      relationshipsByPair,
      degreeByPersonId,
      config,
      radiusX: config.radiusX,
      radiusY: config.radiusY,
      angleOffset: -Math.PI / 2 + outerStep / 2,
    })

    return positions
  }

  placePeopleOnRing(people, positions, {
    centerPersonId,
    relationshipsByPair,
    degreeByPersonId,
    config,
    radiusX: config.radiusX,
    radiusY: config.radiusY,
    angleOffset: -Math.PI / 2,
  })

  return positions
}

function relaxPositions(
  people: Person[],
  positions: Map<string, GraphPoint>,
  relationships: Relationship[],
  centerPersonId: string,
  relationshipsByPair: Map<string, Relationship>,
  degreeByPersonId: Map<string, number>,
  config: LayoutConfig,
  depthByPersonId?: Map<string, number>,
): Map<string, GraphPoint> {
  const nextPositions = new Map([...positions].map(([personId, point]) => [personId, { ...point }]))
  const visiblePersonIds = new Set(people.map((person) => person.id))
  const visibleRelationships = relationships.filter((relationship) => (
    visiblePersonIds.has(relationship.sourcePersonId) &&
    visiblePersonIds.has(relationship.targetPersonId)
  ))
  const innerRingCount = people.length > DOUBLE_RING_THRESHOLD ? Math.ceil(people.length * 0.55) : people.length

  for (let iteration = 0; iteration < config.iterations; iteration += 1) {
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
        const hasRelationship = relationshipsByPair.has(relationKey(personA.id, personB.id))
        const degreeBuffer = Math.min(24, ((degreeByPersonId.get(personA.id) ?? 0) + (degreeByPersonId.get(personB.id) ?? 0)) * 2)
        const requiredDistance = config.minNodeDistance + degreeBuffer + (hasRelationship ? 8 : 0)

        if (pairDistance < requiredDistance) {
          const push = (requiredDistance - pairDistance) * 0.13
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
      const relationshipSpacing = people.length > 8 ? 58 : 30
      const pullStrength = people.length > 8 ? 0.005 : 0.009
      const targetDistance = config.minNodeDistance + relationshipSpacing + (100 - relationStrength(relationship)) * 0.25
      const pull = (pairDistance - targetDistance) * pullStrength
      const direction = { x: (pointB.x - pointA.x) / pairDistance, y: (pointB.y - pointA.y) / pairDistance }

      deltaA.x += direction.x * pull
      deltaA.y += direction.y * pull
      deltaB.x -= direction.x * pull
      deltaB.y -= direction.y * pull
    })

    people.forEach((person, index) => {
      const point = nextPositions.get(person.id)
      const delta = deltas.get(person.id)
      if (!point || !delta) return

      const directRelationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
      const strength = relationStrength(directRelationship)
      const degree = degreeByPersonId.get(person.id) ?? 0
      const depth = getPersonDepth(person.id, centerPersonId, relationshipsByPair, depthByPersonId)
      const safeDepth = Math.min(depth, 4)
      const averageRadius = (config.radiusX + config.radiusY) / 2
      const depthRingBias = config.centerSafeRadius + 82 + (safeDepth - 1) * 112
      const ringBias = depth > 1
        ? depthRingBias
        : people.length > DOUBLE_RING_THRESHOLD && index >= innerRingCount
          ? averageRadius + 42
          : averageRadius - (people.length > DOUBLE_RING_THRESHOLD ? 24 : 0)
      const minRadialTarget = people.length > DOUBLE_RING_THRESHOLD
        ? config.centerSafeRadius + 58
        : config.centerSafeRadius + 22
      const targetRadius = clamp(
        ringBias - strength * (depth > 1 ? 0.12 : 0.34) - degree * (depth > 1 ? 1.2 : 2.8),
        depth > 1 ? config.centerSafeRadius + 72 + (safeDepth - 2) * 82 : minRadialTarget,
        Math.min(Math.max(config.bounds.maxX, config.bounds.maxY) - 48, averageRadius + 52 + (safeDepth - 1) * 96),
      )
      const radialDistance = Math.max(0.001, Math.hypot(point.x, point.y))
      const radialDirection = { x: point.x / radialDistance, y: point.y / radialDistance }
      const radialPull = (radialDistance - targetRadius) * (people.length > 8 ? 0.028 : 0.018)

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
      }, config))
    })
  }

  return nextPositions
}

export function calculateNetworkLayout({ centerPersonId, people, relationships, depthByPersonId }: NetworkLayoutInput): NetworkLayoutResult {
  const { relationshipsByPair, degreeByPersonId } = buildRelationshipMaps(relationships)
  const orderedPeople = [...people].sort(stableComparePeople(centerPersonId, relationshipsByPair, degreeByPersonId, depthByPersonId))
  const directRelationshipsByPersonId = new Map<string, Relationship>()
  const layoutConfig = getLayoutConfig(orderedPeople.length)

  orderedPeople.forEach((person) => {
    const relationship = relationshipsByPair.get(relationKey(centerPersonId, person.id))
    if (relationship) directRelationshipsByPersonId.set(person.id, relationship)
  })

  const initialPositions = createInitialPositions(orderedPeople, centerPersonId, relationshipsByPair, degreeByPersonId, layoutConfig, depthByPersonId)
  const positions = relaxPositions(
    orderedPeople,
    initialPositions,
    relationships,
    centerPersonId,
    relationshipsByPair,
    degreeByPersonId,
    layoutConfig,
    depthByPersonId,
  )

  return { people: orderedPeople, positions, directRelationshipsByPersonId }
}

export type GraphHandlePosition = 'top' | 'right' | 'bottom' | 'left'

export function getHandlePairForPosition(position: { x: number; y: number }): {
  selfHandle: GraphHandlePosition
  personHandle: GraphHandlePosition
} {
  const absX = Math.abs(position.x)
  const absY = Math.abs(position.y)
  const diagonalShouldUseSideHandle = absY > absX && absX / Math.max(absY, 1) > 0.52

  if (absX >= absY || diagonalShouldUseSideHandle) {
    return position.x >= 0
      ? { selfHandle: 'right', personHandle: 'left' }
      : { selfHandle: 'left', personHandle: 'right' }
  }

  return position.y >= 0
    ? { selfHandle: 'bottom', personHandle: 'top' }
    : { selfHandle: 'top', personHandle: 'bottom' }
}
