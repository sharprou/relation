import { db } from '../../db/database'
import type { Person } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'
import { clampScore } from '../../utils/score'
import {
  createRelationshipForPerson,
  deleteRelationshipsByPersonId,
  syncRelationshipFromPerson,
} from '../relationships/relationshipService'

type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'isSelf'>

export interface AddPersonOptions {
  connectToPersonId?: string
}

export function getDefaultPersonInput(): PersonInput {
  return {
    name: '',
    nickname: '',
    avatar: '',
    relationType: '普通认识',
    circle: '普通圈',
    intimacy: 50,
    trust: 50,
    importance: 3,
    status: '正常',
    emotionalTone: '中性',
    tags: [],
    contactInfo: '',
    birthday: '',
    metDate: '',
    lastInteractionAt: '',
    note: '',
  }
}

export function sanitizePersonInput(input: PersonInput): PersonInput {
  return {
    ...input,
    name: input.name.trim(),
    nickname: (input.nickname ?? '').trim(),
    avatar: (input.avatar ?? '').trim(),
    relationType: input.relationType.trim() || '普通认识',
    circle: input.circle.trim() || '普通圈',
    intimacy: clampScore(input.intimacy),
    trust: clampScore(input.trust),
    importance: Math.min(5, Math.max(1, Number.isFinite(input.importance) ? Math.round(input.importance) : 3)),
    status: input.status.trim() || '正常',
    emotionalTone: input.emotionalTone,
    tags: Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))),
    contactInfo: (input.contactInfo ?? '').trim(),
    birthday: (input.birthday ?? '').trim(),
    metDate: (input.metDate ?? '').trim(),
    lastInteractionAt: (input.lastInteractionAt ?? '').trim(),
    note: (input.note ?? '').trim(),
  }
}

export function createPersonFromInput(input: PersonInput, isSelf = false): Person {
  const cleaned = sanitizePersonInput(input)
  const timestamp = nowISO()

  return {
    id: generateId(),
    ...cleaned,
    isSelf,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function listPeople(): Promise<Person[]> {
  return await db.persons.orderBy('updatedAt').reverse().toArray()
}

export async function getPersonById(personId: string): Promise<Person | undefined> {
  return await db.persons.get(personId)
}

export async function addPerson(input: PersonInput, options: AddPersonOptions = {}): Promise<Person> {
  if (!input.name.trim()) {
    throw new Error('请输入人物姓名')
  }

  const person = createPersonFromInput(input, false)
  await db.transaction('rw', db.persons, db.relationships, async () => {
    await db.persons.add(person)
    await createRelationshipForPerson(person, options.connectToPersonId)
  })

  return person
}

export async function updatePerson(personId: string, input: PersonInput): Promise<Person> {
  const existing = await db.persons.get(personId)

  if (!existing) {
    throw new Error('人物不存在')
  }

  const cleaned = sanitizePersonInput(input)
  const updated: Person = {
    ...existing,
    ...cleaned,
    isSelf: existing.isSelf,
    updatedAt: nowISO(),
  }

  await db.transaction('rw', db.persons, db.relationships, async () => {
    await db.persons.put(updated)
    if (!updated.isSelf) {
      await syncRelationshipFromPerson(updated)
    }
  })

  return updated
}

export async function deletePerson(personId: string): Promise<void> {
  const existing = await db.persons.get(personId)

  if (!existing) {
    return
  }

  if (existing.isSelf) {
    throw new Error('“我”节点不可删除。')
  }

  await db.transaction('rw', db.persons, db.relationships, async () => {
    await db.persons.delete(personId)
    await deleteRelationshipsByPersonId(personId)
  })
}
