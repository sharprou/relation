import { Eye, Network, Pencil, X } from 'lucide-react'
import type { ReactNode } from 'react'
import PersonAvatar from '../../components/common/PersonAvatar'
import type { Person } from '../../types'
import { displayCircle } from '../../utils/display'

interface GraphPersonActionSheetProps {
  person: Person
  onClose: () => void
  onViewGraph: (personId: string) => void
  onOpenDetail: (personId: string) => void
  onEdit: (personId: string) => void
}

export default function GraphPersonActionSheet({
  person,
  onClose,
  onViewGraph,
  onOpenDetail,
  onEdit,
}: GraphPersonActionSheetProps) {
  const name = person.isSelf ? '我' : person.name

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/24 p-4 sm:items-center" onClick={onClose}>
      <section
        className="w-full max-w-md rounded-[1.6rem] bg-[#fff9fa] p-4 shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={name} avatar={person.avatar} seed={person.circle} className="h-12 w-12 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-black text-ink">{name}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-ink/50">
                {person.relationType} · {displayCircle(person.circle)}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink/60 shadow-soft ring-1 ring-rose/10"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 rounded-[1rem] bg-[#fff0f4] px-3 py-2 text-xs font-bold leading-5 text-rose/80 ring-1 ring-rose/10">
          单击节点会进入关系视角；长按节点可以查看资料或编辑。
        </p>

        <div className="mt-3 grid gap-2">
          <ActionButton label="查看 TA 的关系" onClick={() => onViewGraph(person.id)}>
            <Network className="h-4 w-4" aria-hidden="true" />
          </ActionButton>
          <ActionButton label="查看人物详情" onClick={() => onOpenDetail(person.id)}>
            <Eye className="h-4 w-4" aria-hidden="true" />
          </ActionButton>
          <ActionButton label="编辑人物资料" onClick={() => onEdit(person.id)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </ActionButton>
        </div>
      </section>
    </div>
  )
}

function ActionButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 ring-rose/10 active:scale-[0.99]"
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
