import { useEffect, useState } from 'react'
import { listEventsByPersonId } from '../../features/events/eventService'
import type { InteractionEvent, Person, Relationship } from '../../types'

interface PersonDetailProps {
  person: Person
  relationship?: Relationship
  events?: InteractionEvent[]
  onEdit: () => void
  onDelete: () => void
}

export default function PersonDetail({ person, relationship, events = [], onEdit, onDelete }: PersonDetailProps) {
  const isSelf = person.isSelf
  const [timelineEvents, setTimelineEvents] = useState<InteractionEvent[]>(events)

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

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{person.name}</h2>
            <p className="mt-1 text-sm text-ink/65">{person.nickname || '暂无昵称'}</p>
          </div>
          {isSelf ? <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70">我的资料</span> : null}
        </div>
      </section>

      {isSelf ? (
        <section className="rounded-[1.5rem] bg-mist/75 p-4 text-sm leading-6 text-ink/70 shadow-soft ring-1 ring-white">
          这是你的中心节点。
        </section>
      ) : null}

      {!isSelf ? (
        <section className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
          <p className="text-xs text-ink/55">关系数据</p>
          {relationship ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ['关系类型', relationship.type],
                ['关系状态', relationship.status],
                ['亲密度', String(relationship.intimacy)],
                ['信任度', String(relationship.trust)],
                ['情绪倾向', relationship.emotionalTone],
                ['关系备注', relationship.note || '无'],
                ['关系更新时间', relationship.updatedAt],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-paper px-4 py-3">
                  <p className="text-xs text-ink/55">{label}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{value || '无'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink/60">暂无关系数据</p>
          )}
        </section>
      ) : null}

      <section className="grid gap-3 rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white sm:grid-cols-2">
        {[
          ['关系类型', person.relationType],
          ['圈层', person.circle],
          ['亲密度', String(person.intimacy)],
          ['信任度', String(person.trust)],
          ['重要程度', String(person.importance)],
          ['关系状态', person.status],
          ['情绪倾向', person.emotionalTone],
          ['联系方式', person.contactInfo || ''],
          ['生日', person.birthday || ''],
          ['认识日期', person.metDate || ''],
          ['最近互动时间', person.lastInteractionAt || ''],
          ['是否为我', person.isSelf ? '是' : '否'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-paper px-4 py-3">
            <p className="text-xs text-ink/55">{label}</p>
            <p className="mt-1 text-sm font-medium text-ink">{value || '无'}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
        <p className="text-xs text-ink/55">标签</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {person.tags.length > 0 ? person.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-mist px-3 py-1 text-xs text-ink/70">
              {tag}
            </span>
          )) : <span className="text-sm text-ink/55">暂无标签</span>}
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
        <p className="text-xs text-ink/55">备注</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{person.note || '暂无备注'}</p>
      </section>

      <section className="rounded-[1.5rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
        <p className="text-xs text-ink/55">事件时间线</p>
        {isSelf ? (
          <p className="mt-3 text-sm text-ink/60">中心节点暂无事件。</p>
        ) : timelineEvents.length > 0 ? (
          <div className="mt-3 space-y-3">
            {timelineEvents.map((event) => (
              <article key={event.id} className="rounded-2xl bg-paper px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{event.title}</p>
                    <p className="mt-1 text-xs text-ink/60">{event.eventDate} · {event.eventType} · {event.emotionalTone}</p>
                  </div>
                  {event.affectRelationship ? (
                    <span className="rounded-full bg-mist px-2 py-1 text-[11px] text-ink/70">
                      亲密 {event.intimacyChange >= 0 ? '+' : ''}{event.intimacyChange} / 信任 {event.trustChange >= 0 ? '+' : ''}{event.trustChange}
                    </span>
                  ) : null}
                </div>
                {event.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/60">{event.note}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">暂无事件记录。</p>
        )}
      </section>

      <div className="flex gap-3">
        <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink ring-1 ring-white" onClick={onEdit}>
          编辑
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          onClick={onDelete}
          disabled={person.isSelf}
          style={{ backgroundColor: person.isSelf ? undefined : '#d8a48f' }}
        >
          删除
        </button>
      </div>
    </div>
  )
}
