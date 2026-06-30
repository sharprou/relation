import { db } from '../../db/database'
import type { Person, Relationship } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'
import { clampScore } from '../../utils/score'
import { initApp } from '../app/initApp'

export interface RelationshipFormInput {
  sourcePersonId: string
  targetPersonId: string
  type: string
  status: string
  intimacy: number
  trust: number
  emotionalTone: Relationship['emotionalTone']
  note?: string
}

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

function sanitizeRelationshipInput(input: RelationshipFormInput): RelationshipFormInput {
  return {
    sourcePersonId: input.sourcePersonId.trim(),
    targetPersonId: input.targetPersonId.trim(),
    type: input.type.trim() || '普通认识',
    status: input.status.trim() || '正常',
    intimacy: clampScore(input.intimacy),
    trust: clampScore(input.trust),
    emotionalTone: input.emotionalTone,
    note: (input.note ?? '').trim(),
  }
}

function isSamePair(relationship: Relationship, sourcePersonId: string, targetPersonId: string): boolean {
  return (
    (relationship.sourcePersonId === sourcePersonId && relationship.targetPersonId === targetPersonId) ||
    (relationship.sourcePersonId === targetPersonId && relationship.targetPersonId === sourcePersonId)
  )
}

async function getSelfPerson(): Promise<Person | undefined> {
  return await db.persons.filter((item) => item.isSelf).first()
}

async function validatePersonPair(input: RelationshipFormInput): Promise<{
  cleaned: RelationshipFormInput
  sourcePerson: Person
  targetPerson: Person
}> {
  const cleaned = sanitizeRelationshipInput(input)

  if (!cleaned.sourcePersonId) throw new Error('请选择人物 A。')
  if (!cleaned.targetPersonId) throw new Error('请选择人物 B。')
  if (cleaned.sourcePersonId === cleaned.targetPersonId) throw new Error('人物 A 不能关联自己。')

  const [sourcePerson, targetPerson] = await Promise.all([
    db.persons.get(cleaned.sourcePersonId),
    db.persons.get(cleaned.targetPersonId),
  ])

  if (!sourcePerson || !targetPerson) {
    throw new Error('关系中的人物不存在，请刷新后重试。')
  }

  if (sourcePerson.isSelf || targetPerson.isSelf) {
    throw new Error('人物之间关系请选择普通人物，“我”节点会自动维护关系。')
  }

  return { cleaned, sourcePerson, targetPerson }
}

function createRelationshipFromInput(input: RelationshipFormInput): Relationship {
  const timestamp = nowISO()

  return {
    id: generateId(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function listRelationships(): Promise<Relationship[]> {
  return await db.relationships.toArray()
}

export async function getRelationshipByPersonId(personId: string): Promise<Relationship | undefined> {
  const selfPerson = await getSelfPerson()
  if (!selfPerson) return await db.relationships.where('targetPersonId').equals(personId).first()

  return await db.relationships
    .where('targetPersonId')
    .equals(personId)
    .filter((relationship) => relationship.sourcePersonId === selfPerson.id)
    .first()
}

export async function listRelationshipsByPersonId(personId: string): Promise<Relationship[]> {
  return await db.relationships
    .filter((relationship) => relationship.sourcePersonId === personId || relationship.targetPersonId === personId)
    .toArray()
}

export async function listPersonToPersonRelationships(): Promise<Relationship[]> {
  const persons = await db.persons.toArray()
  const regularPersonIds = new Set(persons.filter((person) => !person.isSelf).map((person) => person.id))

  return await db.relationships
    .filter((relationship) => regularPersonIds.has(relationship.sourcePersonId) && regularPersonIds.has(relationship.targetPersonId))
    .toArray()
}

export async function relationshipExistsBetween(
  sourcePersonId: string,
  targetPersonId: string,
  excludeRelationshipId?: string,
): Promise<boolean> {
  if (!sourcePersonId || !targetPersonId || sourcePersonId === targetPersonId) return false

  const relationships = await db.relationships
    .filter((relationship) => relationship.id !== excludeRelationshipId && isSamePair(relationship, sourcePersonId, targetPersonId))
    .toArray()

  return relationships.length > 0
}

export async function addPersonRelationship(input: RelationshipFormInput): Promise<Relationship> {
  const { cleaned } = await validatePersonPair(input)

  if (await relationshipExistsBetween(cleaned.sourcePersonId, cleaned.targetPersonId)) {
    throw new Error('这两个人之间已经有关系了。')
  }

  const relationship = createRelationshipFromInput(cleaned)
  await db.relationships.add(relationship)
  return relationship
}

export async function updateRelationship(relationshipId: string, input: RelationshipFormInput): Promise<Relationship> {
  const existing = await db.relationships.get(relationshipId)
  if (!existing) throw new Error('关系不存在。')

  const selfPerson = await getSelfPerson()
  if (selfPerson && (existing.sourcePersonId === selfPerson.id || existing.targetPersonId === selfPerson.id)) {
    throw new Error('系统自动关系请通过人物资料维护。')
  }

  const { cleaned } = await validatePersonPair(input)

  if (await relationshipExistsBetween(cleaned.sourcePersonId, cleaned.targetPersonId, relationshipId)) {
    throw new Error('这两个人之间已经有关系了。')
  }

  const updated: Relationship = {
    ...existing,
    ...cleaned,
    updatedAt: nowISO(),
  }

  await db.relationships.put(updated)
  return updated
}

export async function deleteRelationship(relationshipId: string): Promise<void> {
  const existing = await db.relationships.get(relationshipId)
  if (!existing) return

  const selfPerson = await getSelfPerson()
  if (selfPerson && (existing.sourcePersonId === selfPerson.id || existing.targetPersonId === selfPerson.id)) {
    throw new Error('系统自动关系请通过删除人物资料清理。')
  }

  await db.relationships.delete(relationshipId)
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
