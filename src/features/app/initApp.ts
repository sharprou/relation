import { db } from '../../db/database'
import type { AppSettings, Person } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'

export const APP_VERSION = '0.1.0'
export const DEFAULT_SETTINGS_ID = 'default'

function createDefaultSelfPerson(timestamp: string): Person {
  return {
    id: generateId(),
    name: '我',
    nickname: '',
    avatar: '',
    relationType: '自己',
    circle: '自我',
    intimacy: 100,
    trust: 100,
    importance: 5,
    status: '自己',
    emotionalTone: '正向',
    tags: [],
    contactInfo: '',
    birthday: '',
    metDate: '',
    lastInteractionAt: '',
    note: '',
    isSelf: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createDefaultSettings(timestamp: string): AppSettings {
  return {
    id: DEFAULT_SETTINGS_ID,
    appVersion: APP_VERSION,
    initialized: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function initApp(): Promise<void> {
  await db.transaction('rw', db.persons, db.settings, async () => {
    const [selfPerson, settings] = await Promise.all([
      db.persons.filter((person) => person.isSelf).first(),
      db.settings.get(DEFAULT_SETTINGS_ID),
    ])

    if (!selfPerson) {
      const timestamp = nowISO()
      await db.persons.add(createDefaultSelfPerson(timestamp))
    }

    if (!settings) {
      const timestamp = nowISO()
      await db.settings.put(createDefaultSettings(timestamp))
    }
  })
}
