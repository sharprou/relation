import type { InteractionEvent, Person } from '../../types'

interface EventCardProps {
  event: InteractionEvent
  person?: Person
  onEdit: (event: InteractionEvent) => void
  onDelete: (event: InteractionEvent) => void
}

export default function EventCard({ event, person, onEdit, onDelete }: EventCardProps) {
  const note = event.note ?? ''

  return (
    <article className="rounded-[1.35rem] bg-white/78 p-4 shadow-soft ring-1 ring-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-ink/60">{person?.name ?? '未知人物'} · {event.eventType} · {event.eventDate}</p>
        </div>
        <span className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink/70">{event.emotionalTone}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
        <span className="rounded-full bg-paper px-2.5 py-1">{event.affectRelationship ? '影响关系' : '仅记录'}</span>
        {event.affectRelationship ? <span className="rounded-full bg-paper px-2.5 py-1">亲密 {event.intimacyChange >= 0 ? '+' : ''}{event.intimacyChange}</span> : null}
        {event.affectRelationship ? <span className="rounded-full bg-paper px-2.5 py-1">信任 {event.trustChange >= 0 ? '+' : ''}{event.trustChange}</span> : null}
      </div>

      {note ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">{note}</p> : null}

      <div className="mt-4 flex gap-3">
        <button type="button" className="flex-1 rounded-2xl bg-paper px-4 py-2 text-sm font-medium text-ink" onClick={() => onEdit(event)}>
          编辑
        </button>
        <button type="button" className="flex-1 rounded-2xl bg-clay px-4 py-2 text-sm font-medium text-white" onClick={() => onDelete(event)}>
          删除
        </button>
      </div>
    </article>
  )
}
