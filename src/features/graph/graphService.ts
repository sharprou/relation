import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateCircularPosition, getHandlePairForPosition } from './graphLayout'
import { getEdgeDashArray, getEdgeStroke, getEdgeWidth, getSecondaryEdgeStroke, getSecondaryEdgeWidth } from './graphStyle'

export interface GraphData {
  selfPerson?: Person
  people: Person[]
  relationships: Relationship[]
  nodes: Node[]
  edges: Edge[]
}

function findSelfRelationshipForPerson(person: Person, relationships: Relationship[], selfPerson?: Person): Relationship | undefined {
  if (!selfPerson) return undefined
  return relationships.find((relationship) => relationship.sourcePersonId === selfPerson.id && relationship.targetPersonId === person.id)
}

function isSelfRelationship(relationship: Relationship, selfPerson?: Person): boolean {
  return Boolean(selfPerson && relationship.sourcePersonId === selfPerson.id)
}

function isPersonToPersonRelationship(relationship: Relationship, visiblePersonIds: Set<string>): boolean {
  return visiblePersonIds.has(relationship.sourcePersonId) && visiblePersonIds.has(relationship.targetPersonId)
}

export async function loadGraphData(filters?: PeopleFilters): Promise<GraphData> {
  const [persons, relationships] = await Promise.all([
    db.persons.toArray(),
    db.relationships.toArray(),
  ])
  const selfPerson = persons.find((person) => person.isSelf)
  const regularPeople = persons.filter((person) => !person.isSelf)
  const people = filters ? filterPeopleByFilters(regularPeople, filters) : regularPeople

  const nodes: Node[] = []
  if (selfPerson) {
    nodes.push({
      id: selfPerson.id,
      type: 'selfNode',
      position: { x: 0, y: 0 },
      origin: [0.5, 0.5],
      data: { person: selfPerson },
    })
  }

  people.forEach((person, index) => {
    const relationship = findSelfRelationshipForPerson(person, relationships, selfPerson)
    const position = calculateCircularPosition(person, index, people.length, relationship)
    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      data: { person, relationship, placement: position },
    })
  })

  const visibleRegularPersonIds = new Set(people.map((person) => person.id))
  const personIds = new Set([...(selfPerson ? [selfPerson.id] : []), ...visibleRegularPersonIds])
  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const visibleRelationships = relationships.filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
  const secondaryEdges: Edge[] = visibleRelationships
    .filter((relationship) => !isSelfRelationship(relationship, selfPerson) && isPersonToPersonRelationship(relationship, visibleRegularPersonIds))
    .map((relationship) => {
      const sourcePosition = nodePositions.get(relationship.sourcePersonId)
      const targetPosition = nodePositions.get(relationship.targetPersonId)
      const handlePair = sourcePosition && targetPosition
        ? getHandlePairForPosition({
          x: targetPosition.x - sourcePosition.x,
          y: targetPosition.y - sourcePosition.y,
        })
        : undefined

      return {
        id: relationship.id,
        source: relationship.sourcePersonId,
        target: relationship.targetPersonId,
        sourceHandle: handlePair?.selfHandle,
        targetHandle: handlePair?.personHandle,
        type: 'straight',
        animated: false,
        interactionWidth: 8,
        label: relationship.type,
        labelStyle: {
          fill: '#7c5360',
          fontSize: 10,
          fontWeight: 800,
        },
        labelBgStyle: {
          fill: '#fff9fa',
          fillOpacity: 0.82,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 999,
        zIndex: 0,
        style: {
          stroke: getSecondaryEdgeStroke(relationship.status, relationship.emotionalTone, relationship.intimacy),
          strokeWidth: getSecondaryEdgeWidth(relationship.intimacy),
          strokeDasharray: getEdgeDashArray(relationship.status),
          strokeLinecap: 'round',
          opacity: 0.58,
        },
      }
    })
  const primaryEdges: Edge[] = visibleRelationships
    .filter((relationship) => isSelfRelationship(relationship, selfPerson) && visibleRegularPersonIds.has(relationship.targetPersonId))
    .map((relationship) => {
      const personPosition = nodePositions.get(relationship.targetPersonId)
      const handlePair = personPosition ? getHandlePairForPosition(personPosition) : undefined

      return {
        id: relationship.id,
        source: relationship.sourcePersonId,
        target: relationship.targetPersonId,
        sourceHandle: handlePair?.selfHandle,
        targetHandle: handlePair?.personHandle,
        type: 'straight',
        animated: false,
        interactionWidth: 20,
        zIndex: 1,
        style: {
          stroke: getEdgeStroke(relationship.status, relationship.emotionalTone, relationship.intimacy),
          strokeWidth: getEdgeWidth(relationship.intimacy),
          strokeDasharray: getEdgeDashArray(relationship.status),
          strokeLinecap: 'round',
          opacity: 0.88,
        },
      }
    })
  const edges = [...secondaryEdges, ...primaryEdges]

  return { selfPerson, people, relationships, nodes, edges }
}
