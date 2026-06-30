import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateCircularPosition, getHandlePairForPosition } from './graphLayout'
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
    type: 'straight',
    animated: false,
    interactionWidth: isPrimary ? 20 : 10,
    label: isPrimary ? undefined : relationship.type,
    labelStyle: isPrimary ? undefined : {
      fill: '#7c5360',
      fontSize: 10,
      fontWeight: 800,
    },
    labelBgStyle: isPrimary ? undefined : {
      fill: '#fff9fa',
      fillOpacity: 0.82,
    },
    labelBgPadding: isPrimary ? undefined : [4, 2],
    labelBgBorderRadius: isPrimary ? undefined : 999,
    zIndex: isPrimary ? 1 : 0,
    style: getRelationshipEdgeStyle(relationship, { metric: lineMetric, isPrimary }),
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
  const people = centerPerson
    ? persons.filter((person) => (
      person.id !== centerPerson.id &&
      directPersonIds.has(person.id) &&
      (person.isSelf || filteredRegularPersonIds.has(person.id))
    ))
    : []

  const nodes: Node[] = []
  if (centerPerson) {
    nodes.push({
      id: centerPerson.id,
      type: 'centerNode',
      position: { x: 0, y: 0 },
      origin: [0.5, 0.5],
      data: { person: centerPerson },
    })
  }

  people.forEach((person, index) => {
    const relationship = centerPerson ? findRelationshipBetween(relationships, centerPerson.id, person.id) : undefined
    const position = calculateCircularPosition(person, index, people.length, relationship)
    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      data: { person, relationship, placement: position },
    })
  })

  const personIds = new Set([...(centerPerson ? [centerPerson.id] : []), ...people.map((person) => person.id)])
  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const visibleRelationships = relationships.filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
  const secondaryEdges = centerPerson
    ? visibleRelationships
      .filter((relationship) => !isRelationshipConnectedToPerson(relationship, centerPerson.id))
      .map((relationship) => createGraphEdge(relationship, nodePositions, centerPerson.id, lineMetric))
    : []
  const primaryEdges = centerPerson
    ? visibleRelationships
      .filter((relationship) => isRelationshipConnectedToPerson(relationship, centerPerson.id))
      .map((relationship) => createGraphEdge(relationship, nodePositions, centerPerson.id, lineMetric))
    : []
  const edges = [...secondaryEdges, ...primaryEdges]

  return { selfPerson, centerPerson, people, relationships, nodes, edges }
}
