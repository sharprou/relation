import Dexie, { type Table } from 'dexie'
import type { AppSettings, InteractionEvent, Person, Relationship, TagItem } from '../types'

export class RelationshipGraphDB extends Dexie {
  persons!: Table<Person, string>
  relationships!: Table<Relationship, string>
  events!: Table<InteractionEvent, string>
  tags!: Table<TagItem, string>
  settings!: Table<AppSettings, string>

  constructor() {
    super('relationship_graph_db')

    this.version(1).stores({
      persons: 'id, name, relationType, circle, isSelf, updatedAt',
      relationships: 'id, sourcePersonId, targetPersonId, type, status',
      events: 'id, personId, eventDate, eventType',
      tags: 'id, name',
      settings: 'id',
    })
  }
}

export const db = new RelationshipGraphDB()
