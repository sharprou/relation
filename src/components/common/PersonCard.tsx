import type { Person } from '../../types'
import { cleanVisibleTags, displayCircle } from '../../utils/display'
import PersonAvatar from './PersonAvatar'

interface PersonCardProps {
  person: Person
  onOpen: (personId: string) => void
}

export default function PersonCard({ person, onOpen }: PersonCardProps) {
  const visibleTags = cleanVisibleTags(person.tags).slice(0, 3)

  return (
    <button
      type="button"
      onClick={() => onOpen(person.id)}
      className="w-full overflow-hidden rounded-[1.35rem] bg-white/78 p-0 text-left shadow-soft ring-1 ring-violet/10 transition active:scale-[0.99]"
    >
      <div className="grid min-h-[88px] grid-cols-[52px_1fr_auto] items-center gap-3 px-4 py-3.5">
        <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-[52px] w-[52px] text-xl" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-extrabold text-ink">{person.name}</h3>
            {person.isSelf ? (
              <span className="shrink-0 rounded-full bg-violetMist px-2 py-0.5 text-[11px] font-semibold text-violet">我的资料</span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-ink/55">{person.relationType} · {displayCircle(person.circle)}</p>
          {visibleTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span key={tag} className="rounded-full bg-violetMist/75 px-2 py-0.5 text-[11px] font-semibold text-violet">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-ink/50">
          <div className="space-y-1.5 text-right">
            <p className="rounded-full bg-rose/10 px-2 py-0.5 text-rose">❤ {person.intimacy}</p>
            <p className="rounded-full bg-lake/10 px-2 py-0.5 text-lake">🛡 {person.trust}</p>
          </div>
          <span className="text-lg text-ink/25">›</span>
        </div>
      </div>
    </button>
  )
}
