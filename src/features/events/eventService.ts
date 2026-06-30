import { db } from '../../db/database'
import type { EmotionalTone, InteractionEvent, Person, Relationship } from '../../types'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_EVENT_TYPES } from '../../utils/constants'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'
import { clampScore } from '../../utils/score'
import { getRelationshipByPersonId } from '../relationships/relationshipService'

export interface EventFormInput {
  personId: string
  title: string
  eventType: string
  eventDate: string
  emotionalTone: EmotionalTone
  affectRelationship: boolean
  intimacyChange: number
  trustChange: number
  note?: string
}

const MAX_RELATIONSHIP_CHANGE = 100

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getDefaultEventInput(personId = ''): EventFormInput {
  return {
    personId,
    title: '',
    eventType: DEFAULT_EVENT_TYPES.includes('其他') ? '其他' : DEFAULT_EVENT_TYPES[0],
    eventDate: todayISODate(),
    emotionalTone: DEFAULT_EMOTIONAL_TONES.includes('中性') ? '中性' : DEFAULT_EMOTIONAL_TONES[0],
    affectRelationship: false,
    intimacyChange: 0,
    trustChange: 0,
    note: '',
  }
}

function sanitizeRelationshipChange(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_RELATIONSHIP_CHANGE, Math.max(0, Math.trunc(value)))
}

function sanitizeEventInput(input: EventFormInput): EventFormInput {
  const affectRelationship = Boolean(input.affectRelationship)

  return {
    personId: input.personId.trim(),
    title: input.title.trim(),
    eventType: input.eventType.trim() || '其他',
    eventDate: input.eventDate.trim() || todayISODate(),
    emotionalTone: input.emotionalTone,
    affectRelationship,
    intimacyChange: affectRelationship ? sanitizeRelationshipChange(input.intimacyChange) : 0,
    trustChange: affectRelationship ? sanitizeRelationshipChange(input.trustChange) : 0,
    note: (input.note ?? '').trim(),
  }
}

function createEventFromInput(input: EventFormInput): InteractionEvent {
  const cleaned = sanitizeEventInput(input)
  const timestamp = nowISO()

  return {
    id: generateId(),
    ...cleaned,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function listEvents(): Promise<InteractionEvent[]> {
  return await db.events.orderBy('eventDate').reverse().toArray()
}

export async function listEventsByPersonId(personId: string): Promise<InteractionEvent[]> {
  const events = await db.events.where('personId').equals(personId).toArray()
  return events.sort((a, b) => b.eventDate.localeCompare(a.eventDate))
}

export async function getEventById(eventId: string): Promise<InteractionEvent | undefined> {
  return await db.events.get(eventId)
}

export async function applyEventRelationshipEffect(event: InteractionEvent): Promise<void> {
  const person = await db.persons.get(event.personId)
  if (!person) {
    console.warn('事件关联人物不存在，无法更新关系影响。', event.personId)
    return
  }

  const updatedPerson: Person = {
    ...person,
    intimacy: event.affectRelationship ? clampScore(person.intimacy + event.intimacyChange) : person.intimacy,
    trust: event.affectRelationship ? clampScore(person.trust + event.trustChange) : person.trust,
    lastInteractionAt: event.eventDate || nowISO(),
    updatedAt: nowISO(),
  }

  await db.persons.put(updatedPerson)

  const relationship = await getRelationshipByPersonId(event.personId)
  if (!relationship) {
    console.warn('事件关联人物暂无关系数据，跳过关系数值同步。', event.personId)
    return
  }

  const updatedRelationship: Relationship = {
    ...relationship,
    intimacy: event.affectRelationship ? clampScore(relationship.intimacy + event.intimacyChange) : relationship.intimacy,
    trust: event.affectRelationship ? clampScore(relationship.trust + event.trustChange) : relationship.trust,
    updatedAt: nowISO(),
  }

  await db.relationships.put(updatedRelationship)
}

export async function addEvent(input: EventFormInput): Promise<InteractionEvent> {
  const cleaned = sanitizeEventInput(input)
  if (!cleaned.title) throw new Error('请输入事件标题')
  if (!cleaned.personId) throw new Error('请选择关联人物')

  const event = createEventFromInput(cleaned)
  await db.transaction('rw', db.events, db.persons, db.relationships, async () => {
    await db.events.add(event)
    await applyEventRelationshipEffect(event)
  })

  return event
}

export async function updateEvent(eventId: string, input: EventFormInput): Promise<InteractionEvent> {
  const existing = await db.events.get(eventId)
  if (!existing) throw new Error('事件不存在')

  const cleaned = sanitizeEventInput(input)
  if (!cleaned.title) throw new Error('请输入事件标题')
  if (!cleaned.personId) throw new Error('请选择关联人物')

  const updated: InteractionEvent = {
    ...existing,
    ...cleaned,
    updatedAt: nowISO(),
  }

  await db.transaction('rw', db.events, db.persons, db.relationships, async () => {
    await db.events.put(updated)
    await applyEventRelationshipEffect(updated)
  })

  return updated
}

export async function deleteEvent(eventId: string): Promise<void> {
  await db.events.delete(eventId)
}
