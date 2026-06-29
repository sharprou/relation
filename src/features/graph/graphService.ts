import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateCircularPosition, getHandlePairForPosition } from './graphLayout'
import { getEdgeDashArray, getEdgeStroke, getEdgeWidth } from './graphStyle'

export interface GraphData {
  selfPerson?: Person
  people: Person[]
  relationships: Relationship[]
  nodes: Node[]
  edges: Edge[]
}

function findRelationshipForPerson(person: Person, relationships: Relationship[]): Relationship | undefined {
  return relationships.find((relationship) => relationship.targetPersonId === person.id || relationship.sourcePersonId === person.id)
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
    const relationship = findRelationshipForPerson(person, relationships)
    const position = calculateCircularPosition(person, index, people.length, relationship)
    nodes.push({
      id: person.id,
      type: 'personNode',
      position,
      origin: [0.5, 0.5],
      data: { person, relationship, placement: position },
    })
  })

  const personIds = new Set([...(selfPerson ? [selfPerson.id] : []), ...people.map((person) => person.id)])
  const nodePositions = new Map(nodes.map((node) => [node.id, node.position]))
  const edges: Edge[] = relationships
    .filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
    .map((relationship) => {
      const sourceIsSelf = relationship.sourcePersonId === selfPerson?.id
      const personPosition = sourceIsSelf ? nodePositions.get(relationship.targetPersonId) : nodePositions.get(relationship.sourcePersonId)
      const handlePair = personPosition ? getHandlePairForPosition(personPosition) : undefined

      return {
        id: relationship.id,
        source: relationship.sourcePersonId,
        target: relationship.targetPersonId,
        sourceHandle: handlePair ? (sourceIsSelf ? handlePair.selfHandle : handlePair.personHandle) : undefined,
        targetHandle: handlePair ? (sourceIsSelf ? handlePair.personHandle : handlePair.selfHandle) : undefined,
        type: 'straight',
        animated: false,
        interactionWidth: 20,
        style: {
          stroke: getEdgeStroke(relationship.status, relationship.emotionalTone, relationship.intimacy),
          strokeWidth: getEdgeWidth(relationship.intimacy),
          strokeDasharray: getEdgeDashArray(relationship.status),
          strokeLinecap: 'round',
          opacity: 0.88,
        },
      }
    })

  return { selfPerson, people, relationships, nodes, edges }
}
