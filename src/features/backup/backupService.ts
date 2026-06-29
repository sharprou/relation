import { db } from '../../db/database'
import { APP_VERSION, initApp } from '../app/initApp'
import type { AppSettings, BackupData, InteractionEvent, Person, Relationship, TagItem } from '../../types'

const BACKUP_FILE_PREFIX = 'relationship-graph-backup'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStringField(value: unknown, field: string): boolean {
  return isRecord(value) && typeof value[field] === 'string'
}

function hasNumberField(value: unknown, field: string): boolean {
  return isRecord(value) && typeof value[field] === 'number'
}

function hasBooleanField(value: unknown, field: string): boolean {
  return isRecord(value) && typeof value[field] === 'boolean'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPerson(value: unknown): value is Person {
  return (
    isRecord(value) &&
    hasStringField(value, 'id') &&
    hasStringField(value, 'name') &&
    hasStringField(value, 'relationType') &&
    hasStringField(value, 'circle') &&
    hasNumberField(value, 'intimacy') &&
    hasNumberField(value, 'trust') &&
    hasNumberField(value, 'importance') &&
    hasStringField(value, 'status') &&
    hasStringField(value, 'emotionalTone') &&
    isStringArray(value.tags) &&
    hasBooleanField(value, 'isSelf') &&
    hasStringField(value, 'createdAt') &&
    hasStringField(value, 'updatedAt')
  )
}

function isRelationship(value: unknown): value is Relationship {
  return (
    isRecord(value) &&
    hasStringField(value, 'id') &&
    hasStringField(value, 'sourcePersonId') &&
    hasStringField(value, 'targetPersonId') &&
    hasStringField(value, 'type') &&
    hasStringField(value, 'status') &&
    hasNumberField(value, 'intimacy') &&
    hasNumberField(value, 'trust') &&
    hasStringField(value, 'emotionalTone') &&
    hasStringField(value, 'createdAt') &&
    hasStringField(value, 'updatedAt')
  )
}

function isInteractionEvent(value: unknown): value is InteractionEvent {
  return (
    isRecord(value) &&
    hasStringField(value, 'id') &&
    hasStringField(value, 'personId') &&
    hasStringField(value, 'title') &&
    hasStringField(value, 'eventType') &&
    hasStringField(value, 'eventDate') &&
    hasStringField(value, 'emotionalTone') &&
    hasBooleanField(value, 'affectRelationship') &&
    hasNumberField(value, 'intimacyChange') &&
    hasNumberField(value, 'trustChange') &&
    hasStringField(value, 'createdAt') &&
    hasStringField(value, 'updatedAt')
  )
}

function isTagItem(value: unknown): value is TagItem {
  return isRecord(value) && hasStringField(value, 'id') && hasStringField(value, 'name') && hasStringField(value, 'color') && hasStringField(value, 'createdAt')
}

function isAppSettings(value: unknown): value is AppSettings {
  return (
    isRecord(value) &&
    hasStringField(value, 'id') &&
    hasStringField(value, 'appVersion') &&
    hasBooleanField(value, 'initialized') &&
    hasStringField(value, 'createdAt') &&
    hasStringField(value, 'updatedAt')
  )
}

function getBackupFileName(date = new Date()): string {
  const yyyyMmDd = date.toISOString().slice(0, 10)
  return `${BACKUP_FILE_PREFIX}-${yyyyMmDd}.json`
}

async function clearBusinessTables(): Promise<void> {
  await db.persons.clear()
  await db.relationships.clear()
  await db.events.clear()
  await db.tags.clear()
  await db.settings.clear()
}

async function bulkPutBackupData(data: BackupData): Promise<void> {
  if (data.persons.length > 0) await db.persons.bulkPut(data.persons)
  if (data.relationships.length > 0) await db.relationships.bulkPut(data.relationships)
  if (data.events.length > 0) await db.events.bulkPut(data.events)
  if (data.tags.length > 0) await db.tags.bulkPut(data.tags)
  if (data.settings.length > 0) await db.settings.bulkPut(data.settings)
}

export async function exportBackup(): Promise<BackupData> {
  const [persons, relationships, events, tags, settings] = await Promise.all([
    db.persons.toArray(),
    db.relationships.toArray(),
    db.events.toArray(),
    db.tags.toArray(),
    db.settings.toArray(),
  ])

  return {
    persons,
    relationships,
    events,
    tags,
    settings,
    exportDate: new Date().toISOString(),
    appVersion: APP_VERSION,
  }
}

export async function downloadBackupFile(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = getBackupFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function importBackup(data: BackupData): Promise<void> {
  if (!validateBackupData(data)) {
    throw new Error('备份文件格式不正确，无法导入。')
  }

  await db.transaction('rw', db.persons, db.relationships, db.events, db.tags, db.settings, async () => {
    await clearBusinessTables()
    await bulkPutBackupData(data)
  })

  await initApp()
}

export async function clearAllLocalData(): Promise<void> {
  await db.transaction('rw', db.persons, db.relationships, db.events, db.tags, db.settings, async () => {
    await clearBusinessTables()
  })

  await initApp()
}

export function validateBackupData(data: unknown): data is BackupData {
  return (
    isRecord(data) &&
    Array.isArray(data.persons) &&
    data.persons.every(isPerson) &&
    Array.isArray(data.relationships) &&
    data.relationships.every(isRelationship) &&
    Array.isArray(data.events) &&
    data.events.every(isInteractionEvent) &&
    Array.isArray(data.tags) &&
    data.tags.every(isTagItem) &&
    Array.isArray(data.settings) &&
    data.settings.every(isAppSettings) &&
    typeof data.exportDate === 'string' &&
    typeof data.appVersion === 'string'
  )
}
