import { db } from '../../db/database'
import type { Person, TagItem } from '../../types'
import { nowISO } from '../../utils/date'
import { generateId } from '../../utils/id'

export interface TagFormInput {
  name: string
  color?: string
}

const DEFAULT_TAG_COLOR = '#dce8e2'

function normalizeTagName(name: string): string {
  return name.trim()
}

async function assertUniqueTagName(name: string, ignoreTagId?: string) {
  const tags = await db.tags.toArray()
  const duplicated = tags.some((tag) => tag.id !== ignoreTagId && tag.name.trim().toLowerCase() === name.toLowerCase())

  if (duplicated) {
    throw new Error('标签名称已存在')
  }
}

export async function listTags(): Promise<TagItem[]> {
  return await db.tags.orderBy('name').toArray()
}

export async function getTagById(tagId: string): Promise<TagItem | undefined> {
  return await db.tags.get(tagId)
}

export async function addTag(input: TagFormInput): Promise<TagItem> {
  const name = normalizeTagName(input.name)

  if (!name) {
    throw new Error('请输入标签名称')
  }

  await assertUniqueTagName(name)

  const tag: TagItem = {
    id: generateId(),
    name,
    color: input.color?.trim() || DEFAULT_TAG_COLOR,
    createdAt: nowISO(),
  }

  await db.tags.add(tag)
  return tag
}

export async function updateTag(tagId: string, input: TagFormInput): Promise<TagItem> {
  const existing = await db.tags.get(tagId)

  if (!existing) {
    throw new Error('标签不存在')
  }

  const name = normalizeTagName(input.name)

  if (!name) {
    throw new Error('请输入标签名称')
  }

  await assertUniqueTagName(name, tagId)

  const updated: TagItem = {
    ...existing,
    name,
    color: input.color?.trim() || DEFAULT_TAG_COLOR,
  }

  await db.transaction('rw', db.tags, db.persons, async () => {
    await db.tags.put(updated)

    if (existing.name !== name) {
      const people = await db.persons.filter((person) => person.tags.includes(existing.name)).toArray()
      const syncedPeople: Person[] = people.map((person) => ({
        ...person,
        tags: Array.from(new Set(person.tags.map((tagName) => (tagName === existing.name ? name : tagName)))),
        updatedAt: nowISO(),
      }))

      if (syncedPeople.length > 0) {
        await db.persons.bulkPut(syncedPeople)
      }
    }
  })

  return updated
}

export async function deleteTag(tagId: string): Promise<void> {
  const existing = await db.tags.get(tagId)

  if (!existing) {
    return
  }

  await db.transaction('rw', db.tags, db.persons, async () => {
    await db.tags.delete(tagId)

    const people = await db.persons.filter((person) => person.tags.includes(existing.name)).toArray()
    const syncedPeople: Person[] = people.map((person) => ({
      ...person,
      tags: person.tags.filter((tagName) => tagName !== existing.name),
      updatedAt: nowISO(),
    }))

    if (syncedPeople.length > 0) {
      await db.persons.bulkPut(syncedPeople)
    }
  })
}
