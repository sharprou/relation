import type { Person, Relationship } from '../../types'

export interface HighlightedPath {
  personIds: string[]
  relationshipIds: string[]
}

interface NeighborStep {
  personId: string
  relationshipId: string
}

function compareRelationshipStable(relationshipA: Relationship, relationshipB: Relationship): number {
  const createdDelta = relationshipA.createdAt.localeCompare(relationshipB.createdAt)
  if (createdDelta !== 0) return createdDelta

  return relationshipA.id.localeCompare(relationshipB.id)
}

export function findShortestPath(
  persons: Person[],
  relationships: Relationship[],
  startPersonId: string,
  endPersonId: string,
): HighlightedPath | null {
  if (!startPersonId || !endPersonId || startPersonId === endPersonId) return null

  const personIds = new Set(persons.map((person) => person.id))
  if (!personIds.has(startPersonId) || !personIds.has(endPersonId)) return null

  const adjacency = new Map<string, NeighborStep[]>()

  relationships
    .filter((relationship) => personIds.has(relationship.sourcePersonId) && personIds.has(relationship.targetPersonId))
    .slice()
    .sort(compareRelationshipStable)
    .forEach((relationship) => {
      const sourceNeighbors = adjacency.get(relationship.sourcePersonId) ?? []
      const targetNeighbors = adjacency.get(relationship.targetPersonId) ?? []

      sourceNeighbors.push({ personId: relationship.targetPersonId, relationshipId: relationship.id })
      targetNeighbors.push({ personId: relationship.sourcePersonId, relationshipId: relationship.id })
      adjacency.set(relationship.sourcePersonId, sourceNeighbors)
      adjacency.set(relationship.targetPersonId, targetNeighbors)
    })

  adjacency.forEach((neighbors) => {
    neighbors.sort((neighborA, neighborB) => {
      const personDelta = neighborA.personId.localeCompare(neighborB.personId)
      if (personDelta !== 0) return personDelta

      return neighborA.relationshipId.localeCompare(neighborB.relationshipId)
    })
  })

  const queue = [startPersonId]
  const visited = new Set([startPersonId])
  const previous = new Map<string, NeighborStep>()

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const personId = queue[queueIndex]
    const neighbors = adjacency.get(personId) ?? []

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.personId)) continue

      visited.add(neighbor.personId)
      previous.set(neighbor.personId, { personId, relationshipId: neighbor.relationshipId })

      if (neighbor.personId === endPersonId) {
        const pathPersonIds = [endPersonId]
        const pathRelationshipIds: string[] = []
        let currentPersonId = endPersonId

        while (currentPersonId !== startPersonId) {
          const previousStep = previous.get(currentPersonId)
          if (!previousStep) break

          pathRelationshipIds.unshift(previousStep.relationshipId)
          pathPersonIds.unshift(previousStep.personId)
          currentPersonId = previousStep.personId
        }

        return {
          personIds: pathPersonIds,
          relationshipIds: pathRelationshipIds,
        }
      }

      queue.push(neighbor.personId)
    }
  }

  return null
}
