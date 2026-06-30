import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Person } from '../../types'
import { displayCircle } from '../../utils/display'
import PersonAvatar from '../../components/common/PersonAvatar'

interface GraphPerspectiveSelectorProps {
  people: Person[]
  centerPersonId?: string
  onChange: (personId: string) => void
}

export default function GraphPerspectiveSelector({ people, centerPersonId, onChange }: GraphPerspectiveSelectorProps) {
  const [open, setOpen] = useState(false)
  const centerPerson = people.find((person) => person.id === centerPersonId) ?? people.find((person) => person.isSelf)
  const orderedPeople = [
    ...people.filter((person) => person.isSelf),
    ...people.filter((person) => !person.isSelf),
  ]

  const selectPerson = (personId: string) => {
    onChange(personId)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-black text-ink/68 shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 ring-rose/10 transition active:scale-[0.98]"
        onClick={() => setOpen(true)}
      >
        <span>视角：{centerPerson?.isSelf ? '我' : centerPerson?.name ?? '我'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-rose" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/28 p-4 sm:items-center">
          <div className="max-h-[82dvh] w-full max-w-md overflow-hidden rounded-[1.6rem] bg-[#fff9fa] shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
            <div className="flex items-start justify-between gap-3 border-b border-rose/10 px-4 py-3.5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Perspective</p>
                <h2 className="mt-1 text-lg font-black text-ink">切换图谱视角</h2>
              </div>
              <button
                type="button"
                className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink shadow-soft ring-1 ring-rose/10"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </div>

            <div className="max-h-[62dvh] overflow-y-auto p-3">
              <div className="space-y-2">
                {orderedPeople.map((person) => {
                  const selected = person.id === centerPerson?.id

                  return (
                    <button
                      key={person.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-2.5 text-left ring-1 transition ${selected ? 'bg-[#ffe8ee] ring-rose/18' : 'bg-white/78 ring-rose/8 active:bg-[#fff3f6]'}`}
                      onClick={() => selectPerson(person.id)}
                    >
                      <PersonAvatar name={person.isSelf ? '我' : person.name} avatar={person.avatar} seed={person.circle} className="h-11 w-11 text-base" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-ink">{person.isSelf ? '我' : person.name}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-ink/50">
                          {person.relationType} · {displayCircle(person.circle)}
                        </p>
                      </div>
                      {selected ? (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-rose shadow-[0_8px_18px_rgba(218,116,139,0.12)]">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
