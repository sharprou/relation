import { db } from '../../db/database'
import type { EmotionalTone, InteractionEvent, Person, Relationship } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'

interface SamplePersonDraft {
  name: string
  relationType: string
  circle: string
  intimacy: number
  trust: number
  importance: number
  status?: string
  emotionalTone?: EmotionalTone
  note?: string
}

function createSamplePerson(draft: SamplePersonDraft, timestamp: string): Person {
  return {
    id: generateId(),
    name: draft.name,
    nickname: '',
    avatar: '',
    relationType: draft.relationType,
    circle: draft.circle,
    intimacy: draft.intimacy,
    trust: draft.trust,
    importance: draft.importance,
    status: draft.status ?? '正常',
    emotionalTone: draft.emotionalTone ?? '中性',
    tags: [],
    contactInfo: '',
    birthday: '',
    metDate: '',
    lastInteractionAt: '',
    note: draft.note ?? '',
    isSelf: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createSampleRelationship(
  sourcePersonId: string,
  targetPersonId: string,
  type: string,
  intimacy: number,
  trust: number,
  timestamp: string,
  note = '',
): Relationship {
  return {
    id: generateId(),
    sourcePersonId,
    targetPersonId,
    type,
    status: '正常',
    intimacy,
    trust,
    emotionalTone: '正向',
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createSampleEvent(
  personId: string,
  title: string,
  eventType: string,
  eventDate: string,
  note: string,
  intimacyChange: number,
  trustChange: number,
  timestamp: string,
): InteractionEvent {
  return {
    id: generateId(),
    personId,
    title,
    eventType,
    eventDate,
    emotionalTone: intimacyChange >= 0 && trustChange >= 0 ? '正向' : '复杂',
    affectRelationship: true,
    intimacyChange,
    trustChange,
    photo: '',
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function loadSampleGraphData(force = false): Promise<void> {
  const persons = await db.persons.toArray()
  const regularPeople = persons.filter((person) => !person.isSelf)

  if (regularPeople.length > 0 && !force) {
    throw new Error('已有真实人物数据，示例图谱不会自动载入。')
  }

  const timestamp = nowISO()
  const selfPerson = persons.find((person) => person.isSelf)

  if (!selfPerson) {
    throw new Error('未找到“我”节点，请刷新后重试。')
  }

  const samples = {
    xiaomei: createSamplePerson({ name: '小美', relationType: '朋友', circle: '我的关系圈', intimacy: 78, trust: 74, importance: 4 }, timestamp),
    xiaoshuai: createSamplePerson({ name: '小帅', relationType: '同事', circle: '我的关系圈', intimacy: 62, trust: 70, importance: 3 }, timestamp),
    xiaozhi: createSamplePerson({ name: '小智', relationType: '朋友', circle: '我的关系圈', intimacy: 58, trust: 64, importance: 3 }, timestamp),
    lin: createSamplePerson({ name: '林经理', relationType: '同事', circle: '独立项目组', intimacy: 66, trust: 72, importance: 4 }, timestamp),
    ops: createSamplePerson({ name: '运营同学', relationType: '同事', circle: '独立项目组', intimacy: 56, trust: 62, importance: 3 }, timestamp),
    art: createSamplePerson({ name: '美术同学', relationType: '同事', circle: '独立项目组', intimacy: 61, trust: 68, importance: 3 }, timestamp),
    dev: createSamplePerson({ name: '程序同学', relationType: '合作', circle: '独立项目组', intimacy: 54, trust: 66, importance: 3 }, timestamp),
    xiaoyun: createSamplePerson({ name: '小云', relationType: '普通认识', circle: '独立人物', intimacy: 40, trust: 45, importance: 2 }, timestamp),
  }

  const samplePersons = Object.values(samples)
  const sampleRelationships = [
    createSampleRelationship(selfPerson.id, samples.xiaomei.id, '朋友', 78, 74, timestamp, '常一起吃饭聊天。'),
    createSampleRelationship(selfPerson.id, samples.xiaoshuai.id, '同事', 62, 70, timestamp, '工作上经常协作。'),
    createSampleRelationship(samples.xiaomei.id, samples.xiaozhi.id, '朋友', 58, 64, timestamp, '小美介绍认识的朋友。'),
    createSampleRelationship(samples.lin.id, samples.ops.id, '同事', 66, 72, timestamp),
    createSampleRelationship(samples.lin.id, samples.art.id, '同事', 61, 68, timestamp),
    createSampleRelationship(samples.art.id, samples.dev.id, '协作', 54, 66, timestamp),
  ]
  const sampleEvents = [
    createSampleEvent(samples.xiaomei.id, '和小美一起吃饭', '见面', '2026-06-16', '聊到了最近的状态，感觉关系更近了一点。', 8, 5, timestamp),
    createSampleEvent(samples.lin.id, '项目组晨会沟通', '合作', '2026-06-18', '林经理协调了运营、美术和程序同学的分工。', 3, 6, timestamp),
  ]

  await db.transaction('rw', db.persons, db.relationships, db.events, db.tags, async () => {
    await db.relationships.clear()
    await db.events.clear()
    await db.tags.clear()
    await db.persons.bulkDelete(regularPeople.map((person) => person.id))
    await db.persons.bulkAdd(samplePersons)
    await db.relationships.bulkAdd(sampleRelationships)
    await db.events.bulkAdd(sampleEvents)
  })
}
