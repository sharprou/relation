import { useEffect, useState } from 'react'
import { listEventsByPersonId } from '../../features/events/eventService'
import type { InteractionEvent, Person, Relationship } from '../../types'
import { cleanVisibleTags, displayCircle } from '../../utils/display'
import PersonAvatar from './PersonAvatar'
import RelationshipCard from './RelationshipCard'

interface PersonDetailProps {
  person: Person
  relationship?: Relationship
  people?: Person[]
  relatedRelationships?: Relationship[]
  events?: InteractionEvent[]
  onEdit: () => void
  onDelete: () => void
  onAddRelationship?: () => void
  onEditRelationship?: (relationship: Relationship) => void
  onDeleteRelationship?: (relationship: Relationship) => void
}

function formatPositiveChange(value: number): string {
  if (!Number.isFinite(value)) return '+0'
  return `+${Math.max(0, Math.trunc(value))}`
}

function ImpactPills({ event }: { event: InteractionEvent }) {
  if (!event.affectRelationship) {
    return <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink/55">不影响关系数值</span>
  }

  return (
    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
      <span className="rounded-full bg-rose/10 px-2.5 py-1 text-rose">❤️ 亲密度 {formatPositiveChange(event.intimacyChange)}</span>
      <span className="rounded-full bg-lake/10 px-2.5 py-1 text-lake">🛡 信任度 {formatPositiveChange(event.trustChange)}</span>
    </div>
  )
}

export default function PersonDetail({
  person,
  relationship,
  people = [],
  relatedRelationships = [],
  events = [],
  onEdit,
  onDelete,
  onAddRelationship,
  onEditRelationship,
  onDeleteRelationship,
}: PersonDetailProps) {
  const isSelf = person.isSelf
  const [timelineEvents, setTimelineEvents] = useState<InteractionEvent[]>(events)
  const visibleTags = cleanVisibleTags(person.tags).slice(0, 8)
  const peopleById = new Map(people.map((item) => [item.id, item]))
  const personToPersonRelationships = relatedRelationships
    .map((item) => {
      const otherPersonId = item.sourcePersonId === person.id ? item.targetPersonId : item.sourcePersonId
      const otherPerson = peopleById.get(otherPersonId)
      return otherPerson && !otherPerson.isSelf && otherPerson.id !== person.id ? { relationship: item, otherPerson } : null
    })
    .filter((item): item is { relationship: Relationship; otherPerson: Person } => Boolean(item))

  useEffect(() => {
    let active = true

    const run = async () => {
      if (person.isSelf) {
        setTimelineEvents([])
        return
      }

      if (events.length > 0) {
        setTimelineEvents(events)
        return
      }

      const nextEvents = await listEventsByPersonId(person.id)
      if (active) setTimelineEvents(nextEvents)
    }

    run().catch((error: unknown) => {
      console.error('Failed to load person timeline events', error)
    })

    return () => {
      active = false
    }
  }, [events, person.id, person.isSelf])

  const intimacy = relationship?.intimacy ?? person.intimacy
  const trust = relationship?.trust ?? person.trust

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-violet/10">
        <div className="flex items-center gap-4">
          <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-16 w-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-extrabold text-ink">{person.name}</h2>
              {isSelf ? <span className="rounded-full bg-violetMist px-3 py-1 text-xs font-semibold text-violet">我的资料</span> : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-ink/55">{person.nickname || `${person.relationType} · ${displayCircle(person.circle)}`}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-rose/10 px-3 py-1 text-rose">❤ 亲密度 {intimacy}</span>
              <span className="rounded-full bg-lake/10 px-3 py-1 text-lake">🛡 信任度 {trust}</span>
            </div>
          </div>
        </div>
      </section>

      {isSelf ? (
        <section className="rounded-[1.5rem] bg-violetMist/75 p-4 text-sm leading-6 text-ink/70 shadow-soft ring-1 ring-violet/10">
          这是你的中心节点，会作为所有 MVP 关系的起点。
        </section>
      ) : null}

      <section className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-violet/10">
        <h3 className="text-sm font-extrabold text-ink">关系资料</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ['关系类型', relationship?.type ?? person.relationType],
            ['圈层', displayCircle(person.circle)],
            ['关系状态', relationship?.status ?? person.status],
            ['情绪倾向', relationship?.emotionalTone ?? person.emotionalTone],
            ['重要程度', String(person.importance)],
            ['最近互动', person.lastInteractionAt || '暂无'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-paper/85 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-ink/45">{label}</p>
              <p className="mt-1 truncate text-sm font-bold text-ink">{value || '暂无'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-violet/10">
        <h3 className="text-sm font-extrabold text-ink">标签与备注</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTags.length > 0 ? (
            visibleTags.map((tag) => (
              <span key={tag} className="rounded-full bg-violetMist px-3 py-1 text-xs font-semibold text-violet">
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/45">暂无标签</span>
          )}
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-paper/75 px-3 py-3 text-sm leading-6 text-ink/68">
          {person.note || relationship?.note || '暂无备注'}
        </p>
      </section>

      {!isSelf ? (
        <section className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-rose/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-ink">关联人物</h3>
              <p className="mt-1 text-xs font-semibold text-ink/45">记录这个人与其他人的关系</p>
            </div>
            {onAddRelationship ? (
              <button type="button" className="shrink-0 rounded-full bg-[#ffe4eb] px-3 py-2 text-xs font-black text-rose shadow-[0_10px_22px_rgba(218,116,139,0.10)] ring-1 ring-rose/10" onClick={onAddRelationship}>
                添加关联人物
              </button>
            ) : null}
          </div>

          {personToPersonRelationships.length > 0 ? (
            <div className="mt-3 space-y-3">
              {personToPersonRelationships.map(({ relationship: item, otherPerson }) => (
                <RelationshipCard
                  key={item.id}
                  relationship={item}
                  otherPerson={otherPerson}
                  onEdit={(target) => onEditRelationship?.(target)}
                  onDelete={(target) => onDeleteRelationship?.(target)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-[#fff6f8] px-4 py-3 text-sm font-semibold text-ink/55 ring-1 ring-rose/10">
              还没有添加与其他人物的关系
            </p>
          )}
        </section>
      ) : null}

      <section className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-violet/10">
        <h3 className="text-sm font-extrabold text-ink">事件时间线</h3>
        {isSelf ? (
          <p className="mt-3 text-sm text-ink/55">中心节点暂无事件。</p>
        ) : timelineEvents.length > 0 ? (
          <div className="relative mt-4 space-y-3 pl-5 before:absolute before:left-1.5 before:top-2 before:h-[calc(100%-0.5rem)] before:w-px before:bg-violet/18">
            {timelineEvents.map((event) => (
              <article key={event.id} className="relative rounded-2xl bg-paper/85 px-4 py-3">
                <span className="absolute -left-[1.05rem] top-4 h-2.5 w-2.5 rounded-full bg-violet ring-4 ring-white" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink">{event.title}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/50">{event.eventDate} · {event.eventType} · {event.emotionalTone}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-violetMist px-2.5 py-1 text-[11px] font-bold text-violet">{event.emotionalTone}</span>
                </div>
                {event.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/60">{event.note}</p> : null}
                <div className="mt-2">
                  <ImpactPills event={event} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/55">暂无事件记录。</p>
        )}
      </section>

      <div className="flex gap-3">
        <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink shadow-soft ring-1 ring-violet/10" onClick={onEdit}>
          编辑
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl bg-rose px-4 py-3 text-sm font-bold text-white shadow-soft disabled:cursor-not-allowed disabled:bg-ink/20"
          onClick={onDelete}
          disabled={person.isSelf}
        >
          删除
        </button>
      </div>
    </div>
  )
}
