export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const createId = generateId
