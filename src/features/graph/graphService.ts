import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateNetworkLayout, getHandlePairForPosition } from './graphLayout'
import { getRelationshipEdgeStyle, type GraphLineMetric } from './graphStyle'
import type { HighlightedPath } from './pathSearch'
import type { PersonNodeLabelPlacement } from './PersonNode'

export interface GraphData {
  selfPerson?: Person
  centerPerson?: Person
  people: Person[]
  relationships: Relationship[]
  nodes: Node[]
  edges: Edge[]
  personIslandLabels: Record<string, string>
}

export type GraphEdgeMode = 'smart' | 'all'

export interface GraphLoadOptions {
  filters?: PeopleFilters
  centerPersonId?: string
  lineMetric?: GraphLineMetric
  networkDepth?: 'direct' | 'all'
  viewMode?: 'mine' | 'person' | 'islands'
  edgeMode?: GraphEdgeMode
  highlightedPath?: HighlightedPath | null
}

function getOtherPersonId(relationship: Relationship, personId: string): string | undefined {
  if (relationship.sourcePersonId === personId) return relationship.targetPersonId
  if (relationship.targetPersonId === personId) return relationship.sourcePersonId
  return undefined
}

function isRelationshipConnectedToPerson(relationship: Relationship, personId: string): boolean {
  return relationship.sourcePersonId === personId || relationship.targetPersonId === personId
}

function findRelationshipBetween(relationships: Relationship[], sourcePersonId: string, targetPersonId: string): Relationship | undefined {
  return relationships.find((relationship) => (
    (relationship.sourcePersonId === sourcePersonId && relationship.targetPersonId === targetPersonId) ||
    (relationship.sourcePersonId === targetPersonId && relationship.targetPersonId === sourcePersonId)
  ))
}

interface ReachableNetwork {
  depthByPersonId: Map<string, number>
  previousByPersonId: Map<string, string>
}

function getReachableNetwork(centerPersonId: string, relationships: Relationship[]): ReachableNetwork {
  const adjacency = new Map<string, string[]>()

  relationships
    .slice()
    .sort((relationshipA, relationshipB) => {
      const createdDelta = relationshipA.createdAt.localeCompare(relationshipB.createdAt)
      if (createdDelta !== 0) return createdDelta

      return relationshipA.id.localeCompare(relationshipB.id)
    })
    .forEach((relationship) => {
      const sourceNeighbors = adjacency.get(relationship.sourcePersonId) ?? []
      const targetNeighbors = adjacency.get(relationship.targetPersonId) ?? []

      sourceNeighbors.push(relationship.targetPersonId)
      targetNeighbors.push(relationship.sourcePersonId)
      adjacency.set(relationship.sourcePersonId, sourceNeighbors)
      adjacency.set(relationship.targetPersonId, targetNeighbors)
    })

  adjacency.forEach((neighbors) => neighbors.sort((personAId, personBId) => personAId.localeCompare(personBId)))

  const depthByPersonId = new Map<string, number>([[centerPersonId, 0]])
  const previousByPersonId = new Map<string, string>()
  const queue = [centerPersonId]

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const personId = queue[queueIndex]
    const depth = depthByPersonId.get(personId) ?? 0
    const neighbors = adjacency.get(personId) ?? []

    neighbors.forEach((neighborId) => {
      if (depthByPersonId.has(neighborId)) return

      depthByPersonId.set(neighborId, depth + 1)
      previousByPersonId.set(neighborId, personId)
      queue.push(neighborId)
    })
  }

  return { depthByPersonId, previousByPersonId }
}

function addPathToVisibleSet(personId: string, centerPersonId: string, previousByPersonId: Map<string, string>, visiblePersonIds: Set<string>) {
  let currentPersonId: string | undefined = personId

  while (currentPersonId && currentPersonId !== centerPersonId) {
    visiblePersonIds.add(currentPersonId)
    currentPersonId = previousByPersonId.get(currentPersonId)
  }
}

interface GraphNodeAnchor {
  id: string
  x: number
  y: number
  radius: number
  isCenter: boolean
}

interface LabelCandidate {
  placement: PersonNodeLabelPlacement
  center: { x: number; y: number }
  priority: number
}

interface PrimaryEdgeSpread {
  index: number
  total: number
}

interface EdgeEndpointSpread {
  source: PrimaryEdgeSpread
  target: PrimaryEdgeSpread
}

interface GraphComponent {
  id: string
  people: Person[]
  relationships: Relationship[]
}

type IslandKind = 'self' | 'network' | 'isolated'

interface IslandLayout {
  id: string
  title: string
  stats: string
  kind: IslandKind
  people: Person[]
  relationships: Relationship[]
  width: number
  height: number
  localPositions: Map<string, { x: number; y: number }>
  centerPersonId?: string
}

const NODE_LABEL_WIDTH = 112
const NODE_LABEL_HEIGHT = 44

function getRectDistanceToPoint(
  rect: { left: number; right: number; top: number; bottom: number },
  point: { x: number; y: number },
): number {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right)
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom)

  return Math.hypot(dx, dy)
}

function getLabelRect(center: { x: number; y: number }) {
  return {
    left: center.x - NODE_LABEL_WIDTH / 2,
    right: center.x + NODE_LABEL_WIDTH / 2,
    top: center.y - NODE_LABEL_HEIGHT / 2,
    bottom: center.y + NODE_LABEL_HEIGHT / 2,
  }
}

function getLabelCandidates(position: { x: number; y: number }): LabelCandidate[] {
  const horizontal = position.x >= 0 ? 'left' : 'right'
  const upperDiagonal = position.x >= 0 ? 'top-left' : 'top-right'
  const lowerDiagonal = position.x >= 0 ? 'bottom-left' : 'bottom-right'
  const sideOffset = 96
  const diagonalOffsetX = 74
  const diagonalOffsetY = 68

  return [
    {
      placement: position.y > 76 ? upperDiagonal : position.y < -118 ? lowerDiagonal : horizontal,
      center: {
        x: position.x + (position.x >= 0 ? -diagonalOffsetX : diagonalOffsetX),
        y: position.y + (position.y > 76 ? -diagonalOffsetY : position.y < -118 ? diagonalOffsetY : 0),
      },
      priority: 28,
    },
    {
      placement: horizontal,
      center: {
        x: position.x + (position.x >= 0 ? -sideOffset : sideOffset),
        y: position.y,
      },
      priority: 18,
    },
    {
      placement: upperDiagonal,
      center: {
        x: position.x + (position.x >= 0 ? -diagonalOffsetX : diagonalOffsetX),
        y: position.y - diagonalOffsetY,
      },
      priority: position.y > 32 ? 24 : 8,
    },
    {
      placement: lowerDiagonal,
      center: {
        x: position.x + (position.x >= 0 ? -diagonalOffsetX : diagonalOffsetX),
        y: position.y + diagonalOffsetY,
      },
      priority: position.y < -72 ? 22 : 6,
    },
    {
      placement: position.x >= 0 ? 'right' : 'left',
      center: {
        x: position.x + (position.x >= 0 ? sideOffset : -sideOffset),
        y: position.y,
      },
      priority: 0,
    },
  ]
}

function getPersonNodeLabelPlacement(
  personId: string,
  position: { x: number; y: number },
  anchors: GraphNodeAnchor[],
  respectCanvasBounds = true,
): PersonNodeLabelPlacement {
  const scoredCandidates = getLabelCandidates(position).map((candidate) => {
    const rect = getLabelRect(candidate.center)
    let score = candidate.priority

    anchors.forEach((anchor) => {
      if (anchor.id === personId) return

      const clearance = getRectDistanceToPoint(rect, anchor) - anchor.radius
      const safeGap = anchor.isCenter ? 28 : 18

      if (clearance < safeGap) score -= (safeGap - clearance) * (anchor.isCenter ? 3.1 : 2.5)
    })

    if (position.y > 72 && rect.bottom > position.y + 10) score -= 34
    if (position.y < -118 && rect.top < position.y - 10) score -= 24
    if (respectCanvasBounds) {
      if (rect.left < -330 || rect.right > 330) score -= 18
      if (rect.bottom > 300) score -= 28
    }

    return { ...candidate, score }
  })

  return scoredCandidates.sort((candidateA, candidateB) => candidateB.score - candidateA.score)[0]?.placement ?? (position.x >= 0 ? 'left' : 'right')
}

function getPrimaryEdgeSpreadMap(
  relationships: Relationship[],
  nodePositions: Map<string, { x: number; y: number }>,
  centerPersonId: string,
): Map<string, PrimaryEdgeSpread> {
  const groupedByCenterHandle = new Map<string, Relationship[]>()

  relationships.forEach((relationship) => {
    const otherPersonId = getOtherPersonId(relationship, centerPersonId)
    const position = otherPersonId ? nodePositions.get(otherPersonId) : undefined
    const centerHandle = position ? getHandlePairForPosition(position).selfHandle : 'center'
    const group = groupedByCenterHandle.get(centerHandle) ?? []

    group.push(relationship)
    groupedByCenterHandle.set(centerHandle, group)
  })

  const spreadByRelationshipId = new Map<string, PrimaryEdgeSpread>()

  groupedByCenterHandle.forEach((group) => {
    const orderedGroup = [...group].sort((relationshipA, relationshipB) => {
      const personAId = getOtherPersonId(relationshipA, centerPersonId)
      const personBId = getOtherPersonId(relationshipB, centerPersonId)
      const positionA = personAId ? nodePositions.get(personAId) : undefined
      const positionB = personBId ? nodePositions.get(personBId) : undefined
      const angleA = positionA ? Math.atan2(positionA.y, positionA.x) : 0
      const angleB = positionB ? Math.atan2(positionB.y, positionB.x) : 0
      const angleDelta = angleA - angleB

      if (Math.abs(angleDelta) > 0.001) return angleDelta

      const createdDelta = relationshipA.createdAt.localeCompare(relationshipB.createdAt)
      if (createdDelta !== 0) return createdDelta

      return relationshipA.id.localeCompare(relationshipB.id)
    })

    orderedGroup.forEach((relationship, index) => {
      spreadByRelationshipId.set(relationship.id, {
        index,
        total: orderedGroup.length,
      })
    })
  })

  return spreadByRelationshipId
}

function getRelationshipHandlePair(
  relationship: Relationship,
  nodePositions: Map<string, { x: number; y: number }>,
) {
  const sourcePosition = nodePositions.get(relationship.sourcePersonId)
  const targetPosition = nodePositions.get(relationship.targetPersonId)

  return sourcePosition && targetPosition
    ? getHandlePairForPosition({
      x: targetPosition.x - sourcePosition.x,
      y: targetPosition.y - sourcePosition.y,
    })
    : undefined
}

function getEndpointSpreadMap(
  relationships: Relationship[],
  nodePositions: Map<string, { x: number; y: number }>,
): Map<string, EdgeEndpointSpread> {
  const spreadByRelationshipId = new Map<string, EdgeEndpointSpread>()
  const groupedEndpoints = new Map<string, Array<{
    relationship: Relationship
    endpoint: 'source' | 'target'
    angle: number
  }>>()

  relationships.forEach((relationship) => {
    const sourcePosition = nodePositions.get(relationship.sourcePersonId)
    const targetPosition = nodePositions.get(relationship.targetPersonId)
    const handlePair = getRelationshipHandlePair(relationship, nodePositions)

    spreadByRelationshipId.set(relationship.id, {
      source: { index: 0, total: 1 },
      target: { index: 0, total: 1 },
    })

    if (!sourcePosition || !targetPosition || !handlePair) return

    const sourceGroupKey = `${relationship.sourcePersonId}:${handlePair.selfHandle}`
    const targetGroupKey = `${relationship.targetPersonId}:${handlePair.personHandle}`
    const sourceGroup = groupedEndpoints.get(sourceGroupKey) ?? []
    const targetGroup = groupedEndpoints.get(targetGroupKey) ?? []

    sourceGroup.push({
      relationship,
      endpoint: 'source',
      angle: Math.atan2(targetPosition.y - sourcePosition.y, targetPosition.x - sourcePosition.x),
    })
    targetGroup.push({
      relationship,
      endpoint: 'target',
      angle: Math.atan2(sourcePosition.y - targetPosition.y, sourcePosition.x - targetPosition.x),
    })

    groupedEndpoints.set(sourceGroupKey, sourceGroup)
    groupedEndpoints.set(targetGroupKey, targetGroup)
  })

  groupedEndpoints.forEach((group) => {
    const orderedGroup = [...group].sort((itemA, itemB) => {
      const angleDelta = itemA.angle - itemB.angle
      if (Math.abs(angleDelta) > 0.001) return angleDelta

      const createdDelta = itemA.relationship.createdAt.localeCompare(itemB.relationship.createdAt)
      if (createdDelta !== 0) return createdDelta

      return itemA.relationship.id.localeCompare(itemB.relationship.id)
    })

    orderedGroup.forEach((item, index) => {
      const spread = spreadByRelationshipId.get(item.relationship.id)
      if (!spread) return

      spread[item.endpoint] = {
        index,
        total: orderedGroup.length,
      }
    })
  })

  return spreadByRelationshipId
}

function createGraphEdge(
  relationship: Relationship,
  nodePositions: Map<string, { x: number; y: number }>,
  nodeAnchors: GraphNodeAnchor[],
  centerPersonId: string,
  lineMetric: GraphLineMetric,
  visibleNodeCount: number,
  visibleEdgeCount: number,
  showSecondaryLabel: boolean,
  primarySpread?: PrimaryEdgeSpread,
  endpointSpread?: EdgeEndpointSpread,
  highlightedPath?: HighlightedPath | null,
): Edge {
  const handlePair = getRelationshipHandlePair(relationship, nodePositions)
  const isPrimary = isRelationshipConnectedToPerson(relationship, centerPersonId)
  const isPathHighlighted = Boolean(highlightedPath?.relationshipIds.includes(relationship.id))
  const isDimmed = Boolean(highlightedPath && !isPathHighlighted)

  return {
    id: relationship.id,
    source: relationship.sourcePersonId,
    target: relationship.targetPersonId,
    sourceHandle: handlePair?.selfHandle,
    targetHandle: handlePair?.personHandle,
    type: 'relationshipEdge',
    animated: false,
    selectable: true,
    interactionWidth: isPrimary ? 20 : 10,
    label: !isPrimary && showSecondaryLabel ? relationship.type : undefined,
    zIndex: isPathHighlighted ? 18 : -10,
    style: getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary }),
    data: {
      relationship,
      isPrimary,
      lineMetric,
      isPathHighlighted,
      isDimmed,
      centerPosition: { x: 0, y: 0 },
      visibleNodeCount,
      visibleEdgeCount,
      showLabel: !isPrimary && showSecondaryLabel,
      avoidNodes: nodeAnchors,
      sourceRadius: relationship.sourcePersonId === centerPersonId ? 48 : 37,
      targetRadius: relationship.targetPersonId === centerPersonId ? 48 : 37,
      primarySpreadIndex: primarySpread?.index ?? 0,
      primarySpreadTotal: primarySpread?.total ?? 1,
      sourceEndpointSpreadIndex: endpointSpread?.source.index ?? 0,
      sourceEndpointSpreadTotal: endpointSpread?.source.total ?? 1,
      targetEndpointSpreadIndex: endpointSpread?.target.index ?? 0,
      targetEndpointSpreadTotal: endpointSpread?.target.total ?? 1,
    },
  }
}

function comparePeopleStable(personA: Person, personB: Person): number {
  if (personA.isSelf !== personB.isSelf) return personA.isSelf ? -1 : 1

  const createdDelta = personA.createdAt.localeCompare(personB.createdAt)
  if (createdDelta !== 0) return createdDelta

  return personA.id.localeCompare(personB.id)
}

function relationshipStrength(relationship: Relationship): number {
  return relationship.intimacy * 0.6 + relationship.trust * 0.4
}

function getRelationshipMetricValue(relationship: Relationship, lineMetric: GraphLineMetric): number {
  return lineMetric === 'trust' ? relationship.trust : relationship.intimacy
}

function getRelationshipPriority(
  relationship: Relationship,
  lineMetric: GraphLineMetric,
  personById: Map<string, Person>,
  centerPersonId?: string,
  highlightedPath?: HighlightedPath | null,
): number {
  const sourceImportance = personById.get(relationship.sourcePersonId)?.importance ?? 3
  const targetImportance = personById.get(relationship.targetPersonId)?.importance ?? 3
  const metricValue = getRelationshipMetricValue(relationship, lineMetric)
  let score = metricValue * 2.8 + relationshipStrength(relationship) * 1.5 + (sourceImportance + targetImportance) * 8

  if (highlightedPath?.relationshipIds.includes(relationship.id)) score += 10000
  if (centerPersonId && isRelationshipConnectedToPerson(relationship, centerPersonId)) score += 520
  if (relationship.status === '重要') score += 120
  if (relationship.status === '亲近') score += 84
  if (relationship.status === '冲突' || relationship.status === '断联') score += 72
  if (relationship.emotionalTone === '正向') score += 24
  if (relationship.emotionalTone === '复杂') score += 18

  return score
}

function compareRelationshipsByPriority(
  relationshipA: Relationship,
  relationshipB: Relationship,
  lineMetric: GraphLineMetric,
  personById: Map<string, Person>,
  centerPersonId?: string,
  highlightedPath?: HighlightedPath | null,
): number {
  const scoreDelta = getRelationshipPriority(relationshipB, lineMetric, personById, centerPersonId, highlightedPath) -
    getRelationshipPriority(relationshipA, lineMetric, personById, centerPersonId, highlightedPath)
  if (Math.abs(scoreDelta) > 0.001) return scoreDelta

  const metricDelta = getRelationshipMetricValue(relationshipB, lineMetric) - getRelationshipMetricValue(relationshipA, lineMetric)
  if (metricDelta !== 0) return metricDelta

  const createdDelta = relationshipA.createdAt.localeCompare(relationshipB.createdAt)
  if (createdDelta !== 0) return createdDelta

  return relationshipA.id.localeCompare(relationshipB.id)
}

function getSmartPrimaryEdgeLimit(nodeCount: number): number {
  if (nodeCount <= 8) return Number.MAX_SAFE_INTEGER
  if (nodeCount <= 12) return 10
  if (nodeCount <= 18) return 11
  if (nodeCount <= 26) return 12
  return 14
}

function getSmartSecondaryEdgeLimit(nodeCount: number): number {
  if (nodeCount <= 8) return 6
  if (nodeCount <= 12) return 4
  if (nodeCount <= 18) return 3
  return 2
}

function selectTopRelationships(
  relationships: Relationship[],
  limit: number,
  lineMetric: GraphLineMetric,
  personById: Map<string, Person>,
  centerPersonId?: string,
  highlightedPath?: HighlightedPath | null,
): Relationship[] {
  if (relationships.length <= limit) return relationships

  const highlightedIds = new Set(highlightedPath?.relationshipIds ?? [])
  const selectedIds = new Set<string>()
  const sortedRelationships = [...relationships].sort((relationshipA, relationshipB) => (
    compareRelationshipsByPriority(relationshipA, relationshipB, lineMetric, personById, centerPersonId, highlightedPath)
  ))

  sortedRelationships.forEach((relationship) => {
    if (highlightedIds.has(relationship.id)) selectedIds.add(relationship.id)
  })

  sortedRelationships.forEach((relationship) => {
    if (selectedIds.size >= limit && !highlightedIds.has(relationship.id)) return
    selectedIds.add(relationship.id)
  })

  return relationships.filter((relationship) => selectedIds.has(relationship.id))
}

function getSmartIslandEdgeLimit(component: GraphComponent): number {
  const peopleCount = component.people.length

  if (peopleCount <= 6) return Math.min(component.relationships.length, 8)
  if (peopleCount <= 10) return peopleCount + 1
  if (peopleCount <= 16) return peopleCount + 2
  return peopleCount + 3
}

function selectSmartIslandRelationships(
  components: GraphComponent[],
  visibleRelationships: Relationship[],
  lineMetric: GraphLineMetric,
  personById: Map<string, Person>,
  highlightedPath?: HighlightedPath | null,
): Relationship[] {
  const selectedIds = new Set<string>()
  const highlightedIds = new Set(highlightedPath?.relationshipIds ?? [])

  components.forEach((component) => {
    if (component.relationships.length === 0) return

    const limit = getSmartIslandEdgeLimit(component)
    const parent = new Map(component.people.map((person) => [person.id, person.id]))
    const find = (personId: string): string => {
      const parentId = parent.get(personId) ?? personId
      if (parentId === personId) return personId

      const rootId = find(parentId)
      parent.set(personId, rootId)
      return rootId
    }
    const union = (personAId: string, personBId: string): boolean => {
      const rootAId = find(personAId)
      const rootBId = find(personBId)
      if (rootAId === rootBId) return false

      parent.set(rootBId, rootAId)
      return true
    }
    const sortedRelationships = [...component.relationships].sort((relationshipA, relationshipB) => (
      compareRelationshipsByPriority(relationshipA, relationshipB, lineMetric, personById, undefined, highlightedPath)
    ))

    sortedRelationships.forEach((relationship) => {
      if (union(relationship.sourcePersonId, relationship.targetPersonId)) selectedIds.add(relationship.id)
    })

    sortedRelationships.forEach((relationship) => {
      if (highlightedIds.has(relationship.id)) selectedIds.add(relationship.id)
    })

    sortedRelationships.forEach((relationship) => {
      const selectedComponentEdgeCount = component.relationships.filter((item) => selectedIds.has(item.id)).length
      if (selectedComponentEdgeCount >= limit && !highlightedIds.has(relationship.id)) return

      selectedIds.add(relationship.id)
    })
  })

  return visibleRelationships.filter((relationship) => selectedIds.has(relationship.id))
}

function selectFocusedDisplayRelationships(
  visibleRelationships: Relationship[],
  primaryRelationships: Relationship[],
  secondaryRelationships: Relationship[],
  people: Person[],
  centerPersonId: string,
  lineMetric: GraphLineMetric,
  personById: Map<string, Person>,
  edgeMode: GraphEdgeMode,
  highlightedPath?: HighlightedPath | null,
): Relationship[] {
  if (edgeMode === 'all' || visibleRelationships.length <= 16 || people.length <= 8) {
    return visibleRelationships
  }

  const primaryEdges = selectTopRelationships(
    primaryRelationships,
    getSmartPrimaryEdgeLimit(people.length),
    lineMetric,
    personById,
    centerPersonId,
    highlightedPath,
  )
  const secondaryEdges = selectTopRelationships(
    secondaryRelationships,
    getSmartSecondaryEdgeLimit(people.length),
    lineMetric,
    personById,
    centerPersonId,
    highlightedPath,
  )
  const selectedIds = new Set([...primaryEdges, ...secondaryEdges].map((relationship) => relationship.id))

  highlightedPath?.relationshipIds.forEach((relationshipId) => {
    if (visibleRelationships.some((relationship) => relationship.id === relationshipId)) selectedIds.add(relationshipId)
  })

  return visibleRelationships.filter((relationship) => selectedIds.has(relationship.id))
}

function getConnectedComponents(persons: Person[], relationships: Relationship[]): GraphComponent[] {
  const personById = new Map(persons.map((person) => [person.id, person]))
  const adjacency = new Map(persons.map((person) => [person.id, new Set<string>()]))
  const visibleRelationships = relationships.filter((relationship) => (
    personById.has(relationship.sourcePersonId) &&
    personById.has(relationship.targetPersonId)
  ))

  visibleRelationships.forEach((relationship) => {
    adjacency.get(relationship.sourcePersonId)?.add(relationship.targetPersonId)
    adjacency.get(relationship.targetPersonId)?.add(relationship.sourcePersonId)
  })

  const visited = new Set<string>()
  const components: GraphComponent[] = []
  const orderedPeople = [...persons].sort(comparePeopleStable)

  orderedPeople.forEach((person) => {
    if (visited.has(person.id)) return

    const queue = [person.id]
    const componentIds: string[] = []
    visited.add(person.id)

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const personId = queue[queueIndex]
      componentIds.push(personId)

      Array.from(adjacency.get(personId) ?? [])
        .sort((personAId, personBId) => personAId.localeCompare(personBId))
        .forEach((nextPersonId) => {
          if (visited.has(nextPersonId)) return

          visited.add(nextPersonId)
          queue.push(nextPersonId)
        })
    }

    const componentIdSet = new Set(componentIds)
    const componentPeople = componentIds
      .map((personId) => personById.get(personId))
      .filter((item): item is Person => Boolean(item))
      .sort(comparePeopleStable)
    const componentRelationships = visibleRelationships.filter((relationship) => (
      componentIdSet.has(relationship.sourcePersonId) &&
      componentIdSet.has(relationship.targetPersonId)
    ))

    components.push({
      id: componentIds.slice().sort((personAId, personBId) => personAId.localeCompare(personBId)).join('__'),
      people: componentPeople,
      relationships: componentRelationships,
    })
  })

  return components.sort((componentA, componentB) => {
    const selfDelta = Number(componentB.people.some((person) => person.isSelf)) - Number(componentA.people.some((person) => person.isSelf))
    if (selfDelta !== 0) return selfDelta

    const sizeDelta = componentB.people.length - componentA.people.length
    if (sizeDelta !== 0) return sizeDelta

    return componentA.id.localeCompare(componentB.id)
  })
}

function getComponentCenterPerson(component: GraphComponent): Person {
  const selfPerson = component.people.find((person) => person.isSelf)
  if (selfPerson) return selfPerson

  const degreeByPersonId = new Map(component.people.map((person) => [person.id, 0]))
  const strengthByPersonId = new Map(component.people.map((person) => [person.id, 0]))

  component.relationships.forEach((relationship) => {
    degreeByPersonId.set(relationship.sourcePersonId, (degreeByPersonId.get(relationship.sourcePersonId) ?? 0) + 1)
    degreeByPersonId.set(relationship.targetPersonId, (degreeByPersonId.get(relationship.targetPersonId) ?? 0) + 1)
    strengthByPersonId.set(relationship.sourcePersonId, (strengthByPersonId.get(relationship.sourcePersonId) ?? 0) + relationshipStrength(relationship))
    strengthByPersonId.set(relationship.targetPersonId, (strengthByPersonId.get(relationship.targetPersonId) ?? 0) + relationshipStrength(relationship))
  })

  return [...component.people].sort((personA, personB) => {
    const degreeDelta = (degreeByPersonId.get(personB.id) ?? 0) - (degreeByPersonId.get(personA.id) ?? 0)
    if (degreeDelta !== 0) return degreeDelta

    const strengthDelta = (strengthByPersonId.get(personB.id) ?? 0) - (strengthByPersonId.get(personA.id) ?? 0)
    if (Math.abs(strengthDelta) > 0.001) return strengthDelta

    return comparePeopleStable(personA, personB)
  })[0]
}

function getIslandTitle(component: GraphComponent): string {
  if (component.people.some((person) => person.isSelf)) return '我的关系圈'

  return `${getComponentCenterPerson(component).name}的关系圈`
}

function getIslandStats(peopleCount: number, relationshipCount: number): string {
  return relationshipCount > 0
    ? `${peopleCount} 人 · ${relationshipCount} 条关系`
    : `${peopleCount} 人`
}

function getPositionBounds(positions: Map<string, { x: number; y: number }>) {
  const points = Array.from(positions.values())

  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y),
  }), {
    minX: points[0].x,
    maxX: points[0].x,
    minY: points[0].y,
    maxY: points[0].y,
  })
}

function buildComponentIslandLayout(component: GraphComponent): IslandLayout {
  const componentCenter = getComponentCenterPerson(component)
  const componentReachableNetwork = getReachableNetwork(componentCenter.id, component.relationships)
  const layout = calculateNetworkLayout({
    centerPersonId: componentCenter.id,
    people: component.people.filter((person) => person.id !== componentCenter.id),
    relationships: component.relationships,
    depthByPersonId: componentReachableNetwork.depthByPersonId,
  })
  const rawPositions = new Map<string, { x: number; y: number }>([[componentCenter.id, { x: 0, y: 0 }]])

  layout.people.forEach((person) => {
    rawPositions.set(person.id, layout.positions.get(person.id) ?? { x: 0, y: 0 })
  })

  const bounds = getPositionBounds(rawPositions)
  const padding = { left: 190, right: 190, top: 156, bottom: 150 }
  const frameLeft = bounds.minX - padding.left
  const frameTop = bounds.minY - padding.top
  const width = Math.max(390, bounds.maxX - bounds.minX + padding.left + padding.right)
  const height = Math.max(320, bounds.maxY - bounds.minY + padding.top + padding.bottom)
  const localPositions = new Map<string, { x: number; y: number }>()

  rawPositions.forEach((position, personId) => {
    localPositions.set(personId, {
      x: position.x - frameLeft,
      y: position.y - frameTop,
    })
  })

  return {
    id: component.id,
    title: getIslandTitle(component),
    stats: getIslandStats(component.people.length, component.relationships.length),
    kind: component.people.some((person) => person.isSelf) ? 'self' : 'network',
    people: component.people,
    relationships: component.relationships,
    width,
    height,
    localPositions,
    centerPersonId: componentCenter.id,
  }
}

function buildIsolatedIslandLayout(people: Person[]): IslandLayout {
  const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(people.length))))
  const rows = Math.ceil(people.length / columns)
  const stepX = 154
  const stepY = 132
  const width = Math.max(390, columns * stepX + 124)
  const height = Math.max(270, rows * stepY + 164)
  const localPositions = new Map<string, { x: number; y: number }>()

  people
    .slice()
    .sort(comparePeopleStable)
    .forEach((person, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)

      localPositions.set(person.id, {
        x: 86 + column * stepX,
        y: 128 + row * stepY,
      })
    })

  return {
    id: 'isolated-people',
    title: '独立人物',
    stats: getIslandStats(people.length, 0),
    kind: 'isolated',
    people,
    relationships: [],
    width,
    height,
    localPositions,
  }
}

function layoutAllIslands(layouts: IslandLayout[]): Map<string, { x: number; y: number }> {
  const offsets = new Map<string, { x: number; y: number }>()
  const columns = layouts.length <= 1 ? 1 : 2
  const rows = Math.ceil(layouts.length / columns)
  const maxWidth = Math.max(420, ...layouts.map((layout) => layout.width))
  const maxHeight = Math.max(340, ...layouts.map((layout) => layout.height))
  const gapX = 130
  const gapY = 126
  const cellWidth = maxWidth + gapX
  const cellHeight = maxHeight + gapY

  layouts.forEach((layout, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)

    offsets.set(layout.id, {
      x: (column - (columns - 1) / 2) * cellWidth - layout.width / 2,
      y: (row - (rows - 1) / 2) * cellHeight - layout.height / 2,
    })
  })

  return offsets
}

function buildIslandLayouts(components: GraphComponent[]): IslandLayout[] {
  const isolatedPeople = components
    .filter((component) => component.people.length === 1 && component.relationships.length === 0 && !component.people[0].isSelf)
    .flatMap((component) => component.people)
  const relationshipLayouts = components
    .filter((component) => !(component.people.length === 1 && component.relationships.length === 0 && !component.people[0].isSelf))
    .map(buildComponentIslandLayout)
  const isolatedLayout = isolatedPeople.length > 0 ? [buildIsolatedIslandLayout(isolatedPeople)] : []

  return [...relationshipLayouts, ...isolatedLayout]
}

function buildPersonIslandLabels(persons: Person[], relationships: Relationship[]): Record<string, string> {
  const labels: Record<string, string> = {}
  const components = getConnectedComponents(persons, relationships)
  const isolatedPeople = components
    .filter((component) => component.people.length === 1 && component.relationships.length === 0 && !component.people[0].isSelf)
    .flatMap((component) => component.people)

  components.forEach((component) => {
    const isRegularIsolated = component.people.length === 1 && component.relationships.length === 0 && !component.people[0].isSelf
    if (isRegularIsolated) return

    const title = component.relationships.length === 0 && component.people[0]?.isSelf
      ? '我的关系圈'
      : getIslandTitle(component)

    component.people.forEach((person) => {
      labels[person.id] = title
    })
  })

  isolatedPeople.forEach((person) => {
    labels[person.id] = '独立人物'
  })

  return labels
}

function buildRelationshipForIslandNode(personId: string, centerPersonId: string, relationships: Relationship[]): Relationship | undefined {
  return findRelationshipBetween(relationships, centerPersonId, personId)
    ?? relationships.find((relationship) => isRelationshipConnectedToPerson(relationship, personId))
}

function buildAllIslandsGraphData(
  persons: Person[],
  relationships: Relationship[],
  lineMetric: GraphLineMetric,
  personPassesFilters: (person: Person) => boolean,
  selfPerson?: Person,
  edgeMode: GraphEdgeMode = 'smart',
  highlightedPath?: HighlightedPath | null,
): GraphData {
  const visiblePeople = persons.filter(personPassesFilters)
  const visiblePersonIds = new Set(visiblePeople.map((person) => person.id))
  const visibleRelationships = relationships.filter((relationship) => (
    visiblePersonIds.has(relationship.sourcePersonId) &&
    visiblePersonIds.has(relationship.targetPersonId)
  ))
  const components = getConnectedComponents(visiblePeople, visibleRelationships)
  const personById = new Map(visiblePeople.map((person) => [person.id, person]))
  const displayRelationships = edgeMode === 'smart'
    ? selectSmartIslandRelationships(components, visibleRelationships, lineMetric, personById, highlightedPath)
    : visibleRelationships
  const islandLayouts = buildIslandLayouts(components)
  const islandOffsets = layoutAllIslands(islandLayouts)
  const nodePositions = new Map<string, { x: number; y: number }>()
  const islandCenterByPersonId = new Map<string, string>()
  const islandByPersonId = new Map<string, IslandLayout>()
  const orderedNodeIds: string[] = []
  const nodes: Node[] = []

  islandLayouts.forEach((island, index) => {
    const offset = islandOffsets.get(island.id) ?? { x: 0, y: 0 }

    nodes.push({
      id: `island-frame-${index}-${island.id}`,
      type: 'islandFrame',
      position: offset,
      origin: [0, 0],
      selectable: true,
      draggable: false,
      zIndex: 0,
      data: {
        title: island.title,
        stats: island.stats,
        kind: island.kind,
        width: island.width,
        height: island.height,
      },
    })

    island.people.forEach((person) => {
      const localPosition = island.localPositions.get(person.id) ?? { x: island.width / 2, y: island.height / 2 }
      nodePositions.set(person.id, {
        x: localPosition.x + offset.x,
        y: localPosition.y + offset.y,
      })
      islandCenterByPersonId.set(person.id, island.centerPersonId ?? person.id)
      islandByPersonId.set(person.id, island)
      orderedNodeIds.push(person.id)
    })
  })

  const nodeAnchors: GraphNodeAnchor[] = orderedNodeIds
    .map((personId) => {
      const person = visiblePeople.find((item) => item.id === personId)
      const position = nodePositions.get(personId)
      if (!person || !position) return null

      return {
        id: person.id,
        x: position.x,
        y: position.y,
        radius: person.isSelf ? 76 : 58,
        isCenter: person.isSelf,
      }
    })
    .filter((item): item is GraphNodeAnchor => Boolean(item))

  orderedNodeIds.forEach((personId) => {
    const person = personById.get(personId)
    const position = nodePositions.get(personId)
    const island = islandByPersonId.get(personId)
    if (!person || !position || !island) return

    if (person.isSelf) {
      const isPathHighlighted = Boolean(highlightedPath?.personIds.includes(person.id))

      nodes.push({
        id: person.id,
        type: 'centerNode',
        position,
        origin: [0.5, 0.5],
        selectable: false,
        data: {
          person,
          isPathHighlighted,
          isDimmed: Boolean(highlightedPath && !isPathHighlighted),
        },
      })
      return
    }

    const componentCenterId = islandCenterByPersonId.get(person.id) ?? person.id
    const relationship = buildRelationshipForIslandNode(person.id, componentCenterId, island.relationships)
    const isPathHighlighted = Boolean(highlightedPath?.personIds.includes(person.id))

    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      selectable: false,
      data: {
        person,
        relationship,
        placement: position,
        isPathHighlighted,
        isDimmed: Boolean(highlightedPath && !isPathHighlighted),
        labelPlacement: island.kind === 'isolated'
          ? 'bottom-right'
          : getPersonNodeLabelPlacement(person.id, position, nodeAnchors, false),
      },
    })
  })

  const visibleNodeCount = visiblePeople.filter((person) => !person.isSelf).length
  const visibleEdgeCount = displayRelationships.length
  const endpointSpreadById = getEndpointSpreadMap(displayRelationships, nodePositions)
  const showSecondaryLabels = displayRelationships.length <= 6 && visibleNodeCount <= 8
  const edges = displayRelationships.map((relationship) => createGraphEdge(
    relationship,
    nodePositions,
    nodeAnchors,
    selfPerson?.id ?? '',
    lineMetric,
    visibleNodeCount,
    visibleEdgeCount,
    showSecondaryLabels,
    undefined,
    endpointSpreadById.get(relationship.id),
    highlightedPath,
  ))

  return {
    selfPerson,
    centerPerson: selfPerson,
    people: visiblePeople.filter((person) => !person.isSelf),
    relationships: visibleRelationships,
    nodes,
    edges,
    personIslandLabels: buildPersonIslandLabels(persons, relationships),
  }
}

export async function loadGraphData(options: GraphLoadOptions = {}): Promise<GraphData> {
  const { filters, centerPersonId, lineMetric = 'intimacy', networkDepth = 'direct', viewMode = 'mine', edgeMode = 'smart', highlightedPath } = options
  const [persons, relationships] = await Promise.all([
    db.persons.toArray(),
    db.relationships.toArray(),
  ])
  const personIslandLabels = buildPersonIslandLabels(persons, relationships)
  const selfPerson = persons.find((person) => person.isSelf)
  const centerPerson = persons.find((person) => person.id === centerPersonId) ?? selfPerson
  const personById = new Map(persons.map((person) => [person.id, person]))
  const regularPeople = persons.filter((person) => !person.isSelf)
  const filteredRegularPeople = filters ? filterPeopleByFilters(regularPeople, filters) : regularPeople
  const filteredRegularPersonIds = new Set(filteredRegularPeople.map((person) => person.id))
  const personPassesFilters = (person: Person): boolean => person.isSelf || filteredRegularPersonIds.has(person.id)
  const visiblePersonIds = new Set<string>()
  const reachableNetwork = centerPerson ? getReachableNetwork(centerPerson.id, relationships) : undefined

  if (viewMode === 'islands') {
    return buildAllIslandsGraphData(persons, relationships, lineMetric, personPassesFilters, selfPerson, edgeMode, highlightedPath)
  }

  if (centerPerson) {
    reachableNetwork?.depthByPersonId.forEach((depth, personId) => {
      if (personId === centerPerson.id || depth === 0) return

      const person = personById.get(personId)
      if (!person) return

      if (networkDepth === 'direct') {
        if (depth === 1 && personPassesFilters(person)) visiblePersonIds.add(personId)
        return
      }

      if (personPassesFilters(person)) {
        addPathToVisibleSet(personId, centerPerson.id, reachableNetwork.previousByPersonId, visiblePersonIds)
      }
    })

  }

  const visiblePeople = centerPerson
    ? persons.filter((person) => (
      person.id !== centerPerson.id &&
      visiblePersonIds.has(person.id)
    ))
    : []
  const personIds = new Set([...(centerPerson ? [centerPerson.id] : []), ...visiblePeople.map((person) => person.id)])
  const visibleRelationships = relationships.filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
  const layout = centerPerson
    ? calculateNetworkLayout({
      centerPersonId: centerPerson.id,
      people: visiblePeople,
      relationships: visibleRelationships,
      depthByPersonId: reachableNetwork?.depthByPersonId,
    })
    : undefined
  const people = layout?.people ?? visiblePeople

  const nodeAnchors: GraphNodeAnchor[] = [
    ...(centerPerson ? [{
      id: centerPerson.id,
      x: 0,
      y: 0,
      radius: 76,
      isCenter: true,
    }] : []),
    ...people.map((person) => {
      const position = layout?.positions.get(person.id) ?? { x: 0, y: 0 }

      return {
        id: person.id,
        x: position.x,
        y: position.y,
        radius: 58,
        isCenter: false,
      }
    }),
  ]
  const nodes: Node[] = []
  if (centerPerson) {
    const isPathHighlighted = Boolean(highlightedPath?.personIds.includes(centerPerson.id))

    nodes.push({
      id: centerPerson.id,
      type: 'centerNode',
      position: { x: 0, y: 0 },
      origin: [0.5, 0.5],
      selectable: false,
      data: {
        person: centerPerson,
        isPathHighlighted,
        isDimmed: Boolean(highlightedPath && !isPathHighlighted),
      },
    })
  }

  people.forEach((person) => {
    const relationship = layout?.directRelationshipsByPersonId.get(person.id)
      ?? (centerPerson ? findRelationshipBetween(visibleRelationships, centerPerson.id, person.id) : undefined)
      ?? visibleRelationships.find((item) => isRelationshipConnectedToPerson(item, person.id))
    const position = layout?.positions.get(person.id) ?? { x: 0, y: 0 }
    const isPathHighlighted = Boolean(highlightedPath?.personIds.includes(person.id))
    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      selectable: false,
      data: {
        person,
        relationship,
        placement: position,
        isPathHighlighted,
        isDimmed: Boolean(highlightedPath && !isPathHighlighted),
        labelPlacement: getPersonNodeLabelPlacement(person.id, position, nodeAnchors),
      },
    })
  })

  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const secondaryRelationships = centerPerson
    ? visibleRelationships.filter((relationship) => !isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const primaryRelationships = centerPerson
    ? visibleRelationships.filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const displayRelationships = centerPerson
    ? selectFocusedDisplayRelationships(
      visibleRelationships,
      primaryRelationships,
      secondaryRelationships,
      people,
      centerPerson.id,
      lineMetric,
      personById,
      edgeMode,
      highlightedPath,
    )
    : []
  const visibleNodeCount = people.length
  const visibleEdgeCount = displayRelationships.length
  const displaySecondaryRelationships = centerPerson
    ? displayRelationships.filter((relationship) => !isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const displayPrimaryRelationships = centerPerson
    ? displayRelationships.filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const primaryEdgeSpreadById = centerPerson
    ? getPrimaryEdgeSpreadMap(displayPrimaryRelationships, nodePositions, centerPerson.id)
    : new Map<string, PrimaryEdgeSpread>()
  const endpointSpreadById = getEndpointSpreadMap(displayRelationships, nodePositions)
  const showSecondaryLabels = displaySecondaryRelationships.length <= 4 && visibleNodeCount <= 8
  const secondaryEdges = centerPerson
    ? displaySecondaryRelationships
      .map((relationship) => createGraphEdge(
        relationship,
        nodePositions,
        nodeAnchors,
        centerPerson.id,
        lineMetric,
        visibleNodeCount,
        visibleEdgeCount,
        showSecondaryLabels,
        undefined,
        endpointSpreadById.get(relationship.id),
        highlightedPath,
      ))
    : []
  const primaryEdges = centerPerson
    ? displayPrimaryRelationships
      .map((relationship) => createGraphEdge(
        relationship,
        nodePositions,
        nodeAnchors,
        centerPerson.id,
        lineMetric,
        visibleNodeCount,
        visibleEdgeCount,
        false,
        primaryEdgeSpreadById.get(relationship.id),
        endpointSpreadById.get(relationship.id),
        highlightedPath,
      ))
    : []
  const edges = [...secondaryEdges, ...primaryEdges]

  return { selfPerson, centerPerson, people, relationships, nodes, edges, personIslandLabels }
}
