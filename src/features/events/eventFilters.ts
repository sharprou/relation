import type { InteractionEvent, Person } from '../../types'

export type EventRelationshipFilter = 'all' | 'affected' | 'unaffected'
export type EventSortType = 'newest' | 'oldest' | 'intimacyImpact' | 'trustImpact' | 'recentlyUpdated'

export interface EventFilterOptions {
  keyword?: string
  personId?: string
  relationshipFilter?: EventRelationshipFilter
  eventType?: string
  peopleById?: Map<string, Person>
}

function normalizeSearchText(value: unknown): string {
  if (typeof value !== 'string') return ''

  return value
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

function getRecordString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

function getRecordStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function eventMatchesPerson(event: InteractionEvent, personId: string): boolean {
  if (!personId) return true

  const eventRecord = event as unknown as Record<string, unknown>
  const personIds = getRecordStringArray(eventRecord, 'personIds')

  return (
    event.personId === personId ||
    personIds.includes(personId) ||
    getRecordString(eventRecord, 'targetPersonId') === personId ||
    getRecordString(eventRecord, 'sourcePersonId') === personId
  )
}

export function eventMatchesKeyword(
  event: InteractionEvent,
  keyword: string,
  peopleById: Map<string, Person> = new Map(),
): boolean {
  const terms = normalizeSearchText(keyword).split(' ').filter(Boolean)
  if (terms.length === 0) return true

  const person = peopleById.get(event.personId)
  const eventRecord = event as unknown as Record<string, unknown>
  const searchableParts = [
    event.title,
    event.note,
    event.eventType,
    event.emotionalTone,
    getRecordString(eventRecord, 'description'),
    getRecordString(eventRecord, 'content'),
    getRecordString(eventRecord, 'type'),
    getRecordString(eventRecord, 'category'),
    ...getRecordStringArray(eventRecord, 'tags'),
    person?.name,
    person?.nickname,
    person?.relationType,
    person?.circle,
    ...(person?.tags ?? []),
  ]
  const haystack = normalizeSearchText(searchableParts.filter(Boolean).join(' '))

  return terms.every((term) => haystack.includes(term))
}

export function filterEvents(events: InteractionEvent[], options: EventFilterOptions): InteractionEvent[] {
  return events.filter((event) => {
    if (!eventMatchesKeyword(event, options.keyword ?? '', options.peopleById)) return false
    if (!eventMatchesPerson(event, options.personId ?? '')) return false

    if (options.relationshipFilter === 'affected' && event.affectRelationship !== true) return false
    if (options.relationshipFilter === 'unaffected' && event.affectRelationship !== false) return false

    if (options.eventType && event.eventType !== options.eventType) return false

    return true
  })
}

function compareDateString(a: string, b: string): number {
  return a.localeCompare(b)
}

function compareNumberDesc(a: number, b: number): number {
  const safeA = Number.isFinite(a) ? a : 0
  const safeB = Number.isFinite(b) ? b : 0

  return safeB - safeA
}

export function sortEvents(events: InteractionEvent[], sortType: EventSortType): InteractionEvent[] {
  return [...events].sort((eventA, eventB) => {
    if (sortType === 'oldest') {
      return compareDateString(eventA.eventDate, eventB.eventDate) || compareDateString(eventA.createdAt, eventB.createdAt)
    }

    if (sortType === 'intimacyImpact') {
      return compareNumberDesc(eventA.intimacyChange, eventB.intimacyChange) || compareDateString(eventB.eventDate, eventA.eventDate)
    }

    if (sortType === 'trustImpact') {
      return compareNumberDesc(eventA.trustChange, eventB.trustChange) || compareDateString(eventB.eventDate, eventA.eventDate)
    }

    if (sortType === 'recentlyUpdated') {
      return compareDateString(eventB.updatedAt, eventA.updatedAt) || compareDateString(eventB.eventDate, eventA.eventDate)
    }

    return compareDateString(eventB.eventDate, eventA.eventDate) || compareDateString(eventB.createdAt, eventA.createdAt)
  })
}
