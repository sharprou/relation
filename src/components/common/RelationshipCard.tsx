import type { Person, Relationship } from '../../types'
import PersonAvatar from './PersonAvatar'

interface RelationshipCardProps {
  relationship: Relationship
  otherPerson: Person
  onEdit: (relationship: Relationship) => void
  onDelete: (relationship: Relationship) => void
}

export default function RelationshipCard({ relationship, otherPerson, onEdit, onDelete }: RelationshipCardProps) {
  return (
    <article className="rounded-[1.25rem] bg-white/86 p-3.5 shadow-[0_14px_30px_rgba(218,116,139,0.10)] ring-1 ring-rose/10">
      <div className="flex items-start gap-3">
        <PersonAvatar name={otherPerson.name} avatar={otherPerson.avatar} seed={otherPerson.circle} className="h-11 w-11 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-extrabold text-ink">{otherPerson.name}</h4>
              <p className="mt-0.5 text-xs font-semibold text-ink/52">{relationship.type} · {relationship.status}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" className="rounded-full bg-[#fff0f4] px-2.5 py-1 text-[11px] font-bold text-rose ring-1 ring-rose/10" onClick={() => onEdit(relationship)}>
                编辑
              </button>
              <button type="button" className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink/55 ring-1 ring-ink/5" onClick={() => onDelete(relationship)}>
                删除
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-rose/10 px-2.5 py-1 text-rose">❤ 亲密度 {relationship.intimacy}</span>
            <span className="rounded-full bg-lake/10 px-2.5 py-1 text-lake">🛡 信任度 {relationship.trust}</span>
            <span className="rounded-full bg-[#fff2e7] px-2.5 py-1 text-[#c47746]">{relationship.emotionalTone}</span>
          </div>
          {relationship.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/58">{relationship.note}</p> : null}
        </div>
      </div>
    </article>
  )
}
