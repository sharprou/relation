import type { Person } from '../../types'

export type DuplicatePersonRisk = 'exact' | 'similar'

export interface DuplicatePersonMatch {
  person: Person
  risk: DuplicatePersonRisk
  reason: string
}

interface DuplicateInput {
  name: string
  nickname?: string
  note?: string
}

function normalizeLoose(value: string): string {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

function normalizeCompact(value: string): string {
  return normalizeLoose(value).replace(/\s/g, '')
}

function getPersonSearchParts(person: Person): string[] {
  return [
    person.name,
    person.nickname ?? '',
    person.note ?? '',
  ].filter(Boolean)
}

export function normalizePersonNameForDuplicate(value: string): string {
  return normalizeCompact(value)
}

export function findDuplicatePersons(
  input: DuplicateInput,
  people: Person[],
  currentPersonId?: string,
): DuplicatePersonMatch[] {
  const nextName = normalizePersonNameForDuplicate(input.name)
  const nextNickname = normalizePersonNameForDuplicate(input.nickname ?? '')
  const nextNote = normalizeLoose(input.note ?? '')

  if (!nextName) return []

  return people
    .filter((person) => person.id !== currentPersonId)
    .map((person): DuplicatePersonMatch | null => {
      const candidateName = normalizePersonNameForDuplicate(person.name)
      const candidateNickname = normalizePersonNameForDuplicate(person.nickname ?? '')
      const candidateNote = normalizeLoose(person.note ?? '')
      const candidateParts = getPersonSearchParts(person).map(normalizePersonNameForDuplicate).filter(Boolean)
      const exactHit = candidateParts.some((part) => part === nextName || (nextNickname && part === nextNickname))

      if (exactHit) {
        return {
          person,
          risk: 'exact',
          reason: '姓名或昵称完全一致',
        }
      }

      const containsName = candidateName.includes(nextName) || nextName.includes(candidateName)
      const containsNickname = Boolean(nextNickname && candidateName.includes(nextNickname))
      const noteHint = Boolean(
        nextName.length >= 2 &&
        ((nextNote && nextNote.includes(candidateName)) || (candidateNote && candidateNote.includes(nextName))),
      )

      if (candidateName && (containsName || containsNickname || noteHint)) {
        return {
          person,
          risk: 'similar',
          reason: containsName ? '名字互相包含' : containsNickname ? '昵称与姓名相似' : '备注中出现相似线索',
        }
      }

      return null
    })
    .filter((match): match is DuplicatePersonMatch => Boolean(match))
    .sort((matchA, matchB) => {
      if (matchA.risk !== matchB.risk) return matchA.risk === 'exact' ? -1 : 1

      return matchB.person.updatedAt.localeCompare(matchA.person.updatedAt)
    })
}
