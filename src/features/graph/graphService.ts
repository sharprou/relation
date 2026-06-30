import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateNetworkLayout, getHandlePairForPosition } from './graphLayout'
import { getRelationshipEdgeStyle, type GraphLineMetric } from './graphStyle'

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

function createGraphEdge(
  relationship: Relationship,
  nodePositions: Map<string, { x: number; y: number }>,
  centerPersonId: string,
  lineMetric: GraphLineMetric,
  visibleNodeCount: number,
  visibleEdgeCount: number,
): Edge {
  const sourcePosition = nodePositions.get(relationship.sourcePersonId)
  const targetPosition = nodePositions.get(relationship.targetPersonId)
  const handlePair = sourcePosition && targetPosition
    ? getHandlePairForPosition({
      x: targetPosition.x - sourcePosition.x,
      y: targetPosition.y - sourcePosition.y,
    })
    : undefined
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
    label: !isPrimary && visibleEdgeCount <= 6 ? relationship.type : undefined,
    zIndex: isPrimary ? 1 : 0,
    style: getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary }),
    data: {
      relationship,
      isPrimary,
      lineMetric,
      centerPosition: { x: 0, y: 0 },
      visibleNodeCount,
      visibleEdgeCount,
      showLabel: !isPrimary && visibleEdgeCount <= 6,
    },
  }
}

export async function loadGraphData(options: GraphLoadOptions = {}): Promise<GraphData> {
  const { filters, centerPersonId, lineMetric = 'intimacy' } = options
  const [persons, relationships] = await Promise.all([
    db.persons.toArray(),
    db.relationships.toArray(),
  ])
  const selfPerson = persons.find((person) => person.isSelf)
  const centerPerson = persons.find((person) => person.id === centerPersonId) ?? selfPerson
  const regularPeople = persons.filter((person) => !person.isSelf)
  const filteredRegularPeople = filters ? filterPeopleByFilters(regularPeople, filters) : regularPeople
  const filteredRegularPersonIds = new Set(filteredRegularPeople.map((person) => person.id))
  const directRelationships = centerPerson
    ? relationships.filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
    : []
  const directPersonIds = new Set(
    directRelationships
      .map((relationship) => centerPerson ? getOtherPersonId(relationship, centerPerson.id) : undefined)
      .filter((personId): personId is string => Boolean(personId)),
  )
  const visiblePeople = centerPerson
    ? persons.filter((person) => (
      person.id !== centerPerson.id &&
      directPersonIds.has(person.id) &&
      (person.isSelf || filteredRegularPersonIds.has(person.id))
    ))
    : []
  const personIds = new Set([...(centerPerson ? [centerPerson.id] : []), ...visiblePeople.map((person) => person.id)])
  const visibleRelationships = relationships.filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
  const layout = centerPerson
    ? calculateNetworkLayout({
      centerPersonId: centerPerson.id,
      people: visiblePeople,
      relationships: visibleRelationships,
    })
    : undefined
  const people = layout?.people ?? visiblePeople

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
    const relationship = layout?.directRelationshipsByPersonId.get(person.id) ?? (centerPerson ? findRelationshipBetween(visibleRelationships, centerPerson.id, person.id) : undefined)
    const position = layout?.positions.get(person.id) ?? { x: 0, y: 0 }
    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      selectable: false,
      data: { person, relationship, placement: position },
    })
  })

  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const visibleNodeCount = people.length
  const visibleEdgeCount = visibleRelationships.length
  const secondaryEdges = centerPerson
    ? visibleRelationships
      .filter((relationship) => !isRelationshipConnectedToPerson(relationship, centerPerson.id))
      .map((relationship) => createGraphEdge(relationship, nodePositions, centerPerson.id, lineMetric, visibleNodeCount, visibleEdgeCount))
    : []
  const primaryEdges = centerPerson
    ? visibleRelationships
      .filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
      .map((relationship) => createGraphEdge(relationship, nodePositions, centerPerson.id, lineMetric, visibleNodeCount, visibleEdgeCount))
    : []
  const edges = [...secondaryEdges, ...primaryEdges]

  return { selfPerson, centerPerson, people, relationships, nodes, edges }
}
