import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'
import { initApp } from '../app/initApp'

function buildRelationship(person: Person, sourcePersonId: string): Relationship {
  const timestamp = nowISO()

  return {
    id: generateId(),
    sourcePersonId,
    targetPersonId: person.id,
    type: person.relationType,
    status: person.status,
    intimacy: person.intimacy,
    trust: person.trust,
    emotionalTone: person.emotionalTone,
    note: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function listRelationships(): Promise<Relationship[]> {
  return await db.relationships.toArray()
}

export async function getRelationshipByPersonId(personId: string): Promise<Relationship | undefined> {
  return await db.relationships.where('targetPersonId').equals(personId).first()
}

export async function ensureRelationshipForPerson(person: Person): Promise<Relationship> {
  const relationship = await getRelationshipByPersonId(person.id)
  if (relationship) return relationship

  const selfPerson = await db.persons.filter((item) => item.isSelf).first()
  if (!selfPerson) {
    throw new Error('未找到“我”节点，无法创建关系。')
  }

  const created = buildRelationship(person, selfPerson.id)
  await db.relationships.add(created)
  return created
}

export async function createRelationshipForPerson(person: Person): Promise<Relationship> {
  if (person.isSelf) {
    throw new Error('“我”节点不能创建普通关系。')
  }

  let selfPerson = await db.persons.filter((item) => item.isSelf).first()
  if (!selfPerson) {
    await initApp()
    selfPerson = await db.persons.filter((item) => item.isSelf).first()
  }

  if (!selfPerson) {
    console.error('未找到“我”节点，无法创建关系。')
    throw new Error('未找到“我”节点，无法创建关系。')
  }

  const created = buildRelationship(person, selfPerson.id)
  await db.relationships.add(created)
  return created
}

export async function syncRelationshipFromPerson(person: Person): Promise<void> {
  if (person.isSelf) return

  const relationship = await getRelationshipByPersonId(person.id)
  if (relationship) {
    const updated: Relationship = {
      ...relationship,
      type: person.relationType,
      status: person.status,
      intimacy: person.intimacy,
      trust: person.trust,
      emotionalTone: person.emotionalTone,
      updatedAt: nowISO(),
    }

    await db.relationships.put(updated)
    return
  }

  await createRelationshipForPerson(person)
}

export async function deleteRelationshipsByPersonId(personId: string): Promise<void> {
  const relationships = await db.relationships
    .filter((relationship) => relationship.sourcePersonId === personId || relationship.targetPersonId === personId)
    .toArray()

  await db.relationships.bulkDelete(relationships.map((relationship) => relationship.id))
}
