import type { Edge, Node } from '@xyflow/react'
import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { filterPeopleByFilters, type PeopleFilters } from '../../utils/filter'
import { calculateCircularPosition } from './graphLayout'
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
      data: { person: selfPerson },
    })
  }

  people.forEach((person, index) => {
    const relationship = findRelationshipForPerson(person, relationships)
    nodes.push({
      id: person.id,
      type: 'personNode',
      position: calculateCircularPosition(person, index, people.length, relationship),
      data: { person, relationship },
    })
  })

  const personIds = new Set([...(selfPerson ? [selfPerson.id] : []), ...people.map((person) => person.id)])
  const edges: Edge[] = relationships
    .filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
    .map((relationship) => ({
      id: relationship.id,
      source: relationship.sourcePersonId,
      target: relationship.targetPersonId,
      label: relationship.type,
      animated: false,
      style: {
        stroke: getEdgeStroke(relationship.status, relationship.emotionalTone),
        strokeWidth: getEdgeWidth(relationship.intimacy),
        strokeDasharray: getEdgeDashArray(relationship.status),
      },
      labelStyle: {
        fill: '#40362d',
        fontSize: 12,
        fontWeight: 600,
      },
    }))

  return { selfPerson, people, relationships, nodes, edges }
}
