import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateNetworkLayout, getHandlePairForPosition } from './graphLayout'
import { getRelationshipEdgeStyle, type GraphLineMetric } from './graphStyle'
import type { PersonNodeLabelPlacement } from './PersonNode'

export interface GraphData {
  selfPerson?: Person
  centerPerson?: Person
  people: Person[]
  relationships: Relationship[]
  nodes: Node[]
  edges: Edge[]
}

export interface GraphLoadOptions {
  filters?: PeopleFilters
  centerPersonId?: string
  lineMetric?: GraphLineMetric
  networkDepth?: 'direct' | 'all'
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
    if (rect.left < -330 || rect.right > 330) score -= 18
    if (rect.bottom > 300) score -= 28

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
): Edge {
  const handlePair = getRelationshipHandlePair(relationship, nodePositions)
  const isPrimary = isRelationshipConnectedToPerson(relationship, centerPersonId)

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
    zIndex: -10,
    style: getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary }),
    data: {
      relationship,
      isPrimary,
      lineMetric,
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

export async function loadGraphData(options: GraphLoadOptions = {}): Promise<GraphData> {
  const { filters, centerPersonId, lineMetric = 'intimacy', networkDepth = 'direct' } = options
  const [persons, relationships] = await Promise.all([
    db.persons.toArray(),
    db.relationships.toArray(),
  ])
  const selfPerson = persons.find((person) => person.isSelf)
  const centerPerson = persons.find((person) => person.id === centerPersonId) ?? selfPerson
  const personById = new Map(persons.map((person) => [person.id, person]))
  const regularPeople = persons.filter((person) => !person.isSelf)
  const filteredRegularPeople = filters ? filterPeopleByFilters(regularPeople, filters) : regularPeople
  const filteredRegularPersonIds = new Set(filteredRegularPeople.map((person) => person.id))
  const personPassesFilters = (person: Person): boolean => person.isSelf || filteredRegularPersonIds.has(person.id)
  const visiblePersonIds = new Set<string>()
  const reachableNetwork = centerPerson ? getReachableNetwork(centerPerson.id, relationships) : undefined

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
    nodes.push({
      id: centerPerson.id,
      type: 'centerNode',
      position: { x: 0, y: 0 },
      origin: [0.5, 0.5],
      selectable: false,
      data: { person: centerPerson },
    })
  }

  people.forEach((person) => {
    const relationship = layout?.directRelationshipsByPersonId.get(person.id)
      ?? (centerPerson ? findRelationshipBetween(visibleRelationships, centerPerson.id, person.id) : undefined)
      ?? visibleRelationships.find((item) => isRelationshipConnectedToPerson(item, person.id))
    const position = layout?.positions.get(person.id) ?? { x: 0, y: 0 }
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
        labelPlacement: getPersonNodeLabelPlacement(person.id, position, nodeAnchors),
      },
    })
  })

  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const visibleNodeCount = people.length
  const visibleEdgeCount = visibleRelationships.length
  const secondaryRelationships = centerPerson
    ? visibleRelationships.filter((relationship) => !isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const primaryRelationships = centerPerson
    ? visibleRelationships.filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const primaryEdgeSpreadById = centerPerson
    ? getPrimaryEdgeSpreadMap(primaryRelationships, nodePositions, centerPerson.id)
    : new Map<string, PrimaryEdgeSpread>()
  const endpointSpreadById = getEndpointSpreadMap(visibleRelationships, nodePositions)
  const showSecondaryLabels = secondaryRelationships.length <= 4 && visibleNodeCount <= 8
  const secondaryEdges = centerPerson
    ? secondaryRelationships
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
      ))
    : []
  const primaryEdges = centerPerson
    ? primaryRelationships
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
      ))
    : []
  const edges = [...secondaryEdges, ...primaryEdges]

  return { selfPerson, centerPerson, people, relationships, nodes, edges }
}
