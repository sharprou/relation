export type EmotionalTone = '正向' | '中性' | '负向' | '复杂'

export interface Person {
  id: string
  name: string
  nickname?: string
  avatar?: string
  relationType: string
  circle: string
  intimacy: number
  trust: number
  importance: number
  status: string
  emotionalTone: EmotionalTone
  tags: string[]
  contactInfo?: string
  birthday?: string
  metDate?: string
  lastInteractionAt?: string
  note?: string
  isSelf: boolean
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  sourcePersonId: string
  targetPersonId: string
  type: string
  status: string
  intimacy: number
  trust: number
  emotionalTone: EmotionalTone
  note?: string
  createdAt: string
  updatedAt: string
}

export interface InteractionEvent {
  id: string
  personId: string
  title: string
  eventType: string
  eventDate: string
  emotionalTone: EmotionalTone
  affectRelationship: boolean
  intimacyChange: number
  trustChange: number
  images?: string[]
  photo?: string
  image?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface TagItem {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface AppSettings {
  id: string
  appVersion: string
  initialized: boolean
  hasSeenOnboarding?: boolean
  lastBackupAt?: string
  createdAt: string
  updatedAt: string
}

export interface BackupData {
  persons: Person[]
  relationships: Relationship[]
  events: InteractionEvent[]
  tags: TagItem[]
  settings: AppSettings[]
  exportDate: string
  appVersion: string
}
