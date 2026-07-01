import { ChevronLeft, Home, Network } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Person } from '../../types'

type GraphViewMode = 'mine' | 'person' | 'islands'

interface GraphViewToolbarProps {
  viewMode: GraphViewMode
  centerPerson?: Person
  canGoBack: boolean
  onBack: () => void
  onShowMine: () => void
  onShowIslands: () => void
}

function getPersonLabel(person?: Person): string {
  if (!person) return '未选择'
  return person.isSelf ? '我' : person.name
}

export default function GraphViewToolbar({
  viewMode,
  centerPerson,
  canGoBack,
  onBack,
  onShowMine,
  onShowIslands,
}: GraphViewToolbarProps) {
  const viewLabel = viewMode === 'islands' ? '全部关系岛' : getPersonLabel(centerPerson)

  return (
    <section className="shrink-0 rounded-[1.25rem] bg-white/72 px-3 py-2 shadow-[0_14px_30px_rgba(218,116,139,0.10)] ring-1 ring-rose/10 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose/65">当前视角</p>
          <p className="truncate text-sm font-black text-ink">
            {viewMode === 'islands' ? viewLabel : `视角：${viewLabel}`}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-ink/42">长按人物节点可查看详情或编辑</p>
        </div>

        <ToolbarButton disabled={!canGoBack} onClick={onBack} label="返回">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton active={viewMode === 'mine'} onClick={onShowMine} label="回到我">
          <Home className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton active={viewMode === 'islands'} onClick={onShowIslands} label="关系岛">
          <Network className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
      </div>
    </section>
  )
}

function ToolbarButton({
  active = false,
  disabled = false,
  label,
  children,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-black shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-[#ffe3ec] text-rose ring-rose/20'
          : 'bg-white/90 text-ink/68 ring-rose/10'
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
