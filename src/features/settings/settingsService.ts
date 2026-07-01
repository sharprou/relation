import { db } from '../../db/database'
import type { AppSettings } from '../../types'
import { nowISO } from '../../utils/date'
import { APP_VERSION, DEFAULT_SETTINGS_ID, initApp } from '../app/initApp'

function createFallbackSettings(timestamp: string): AppSettings {
  return {
    id: DEFAULT_SETTINGS_ID,
    appVersion: APP_VERSION,
    initialized: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  await initApp()

  const settings = await db.settings.get(DEFAULT_SETTINGS_ID)
  if (settings) return settings

  const fallback = createFallbackSettings(nowISO())
  await db.settings.put(fallback)
  return fallback
}

export async function updateAppSettings(patch: Partial<Omit<AppSettings, 'id' | 'createdAt'>>): Promise<AppSettings> {
  const current = await getAppSettings()
  const updated: AppSettings = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowISO(),
  }

  await db.settings.put(updated)
  return updated
}

export async function markOnboardingSeen(seen = true): Promise<AppSettings> {
  return await updateAppSettings({ hasSeenOnboarding: seen })
}

export async function recordBackupNow(): Promise<AppSettings> {
  return await updateAppSettings({ lastBackupAt: nowISO() })
}
