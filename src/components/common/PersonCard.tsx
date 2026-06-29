import type { Person } from '../../types'

interface PersonCardProps {
  person: Person
  onOpen: (personId: string) => void
}

export default function PersonCard({ person, onOpen }: PersonCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person.id)}
      className="w-full rounded-[1.35rem] bg-white/78 p-4 text-left shadow-soft ring-1 ring-white transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{person.name}</h3>
            {person.isSelf ? (
              <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-ink/70">我的资料</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink/64">{person.relationType} · {person.circle}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-ink/55">
          <p>亲密 {person.intimacy}</p>
          <p className="mt-1">信任 {person.trust}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink/70">重要 {person.importance}</span>
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink/70">{person.status}</span>
        {person.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink/70">
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}
