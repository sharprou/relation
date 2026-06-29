import type { Person } from '../types'
import { cleanVisibleTags, displayCircle } from './display'

export interface PeopleFilters {
  relationType: string
  circle: string
  status: string
  tag: string
  minIntimacy: string
}

export const EMPTY_PEOPLE_FILTERS: PeopleFilters = {
  relationType: '',
  circle: '',
  status: '',
  tag: '',
  minIntimacy: '',
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function hasActivePeopleFilters(filters: PeopleFilters): boolean {
  return Boolean(filters.relationType || filters.circle || filters.status || filters.tag || filters.minIntimacy)
}

export function filterPeopleByKeyword(people: Person[], keyword: string): Person[] {
  const normalizedKeyword = normalize(keyword)

  if (!normalizedKeyword) {
    return people
  }

  return people.filter((person) => {
    const searchable = [
      person.name,
      person.nickname ?? '',
      person.relationType,
      displayCircle(person.circle),
      person.status,
      person.note ?? '',
      ...cleanVisibleTags(person.tags),
    ]

    return searchable.some((value) => normalize(value).includes(normalizedKeyword))
  })
}

export function filterPeopleByFilters(people: Person[], filters: PeopleFilters): Person[] {
  return people.filter((person) => {
    if (filters.relationType && person.relationType !== filters.relationType) return false
    if (filters.circle && displayCircle(person.circle) !== filters.circle) return false
    if (filters.status && person.status !== filters.status) return false
    if (filters.tag && !cleanVisibleTags(person.tags).includes(filters.tag)) return false
    if (filters.minIntimacy && person.intimacy < Number(filters.minIntimacy)) return false
    return true
  })
}

export function getUniqueOptions(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}
