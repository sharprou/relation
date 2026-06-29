import type { InteractionEvent, Person } from '../../types'
import PersonAvatar from './PersonAvatar'

interface EventCardProps {
  event: InteractionEvent
  person?: Person
  onEdit: (event: InteractionEvent) => void
  onDelete: (event: InteractionEvent) => void
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`
}

export default function EventCard({ event, person, onEdit, onDelete }: EventCardProps) {
  const note = event.note ?? ''

  return (
    <article className="rounded-[1.35rem] bg-white/76 p-4 shadow-soft ring-1 ring-violet/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {person ? <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-11 w-11 text-base" /> : null}
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-ink">{event.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
              {person?.name ?? '未知人物'} · {event.eventType} · {event.eventDate}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-sage/15 px-2.5 py-1 text-[11px] font-bold text-sage">{event.emotionalTone}</span>
      </div>

      {note ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">{note}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
        {event.affectRelationship ? (
          <>
            <span className="rounded-full bg-rose/10 px-2.5 py-1 text-rose">❤️ 亲密度 {formatSigned(event.intimacyChange)}</span>
            <span className="rounded-full bg-lake/10 px-2.5 py-1 text-lake">🛡 信任度 {formatSigned(event.trustChange)}</span>
          </>
        ) : (
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/55">不影响关系数值</span>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button type="button" className="flex-1 rounded-2xl bg-paper/90 px-4 py-2 text-sm font-bold text-ink/70" onClick={() => onEdit(event)}>
          编辑
        </button>
        <button type="button" className="flex-1 rounded-2xl bg-violetMist px-4 py-2 text-sm font-bold text-violet" onClick={() => onDelete(event)}>
          删除
        </button>
      </div>
    </article>
  )
}
