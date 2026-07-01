import { Link } from 'react-router-dom'
import PersonAvatar from '../../components/common/PersonAvatar'
import type { DuplicatePersonMatch } from './personDuplicateUtils'
import { displayCircle } from '../../utils/display'

interface DuplicatePersonNoticeProps {
  matches: DuplicatePersonMatch[]
  confirmed: boolean
  onContinue: () => void
}

function formatUpdatedAt(value: string): string {
  if (!value) return '最近更新：未知'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return `最近更新：${value.slice(0, 10)}`

  return `最近更新：${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`
}

export default function DuplicatePersonNotice({ matches, confirmed, onContinue }: DuplicatePersonNoticeProps) {
  if (matches.length === 0) return null

  const hasExactMatch = matches.some((match) => match.risk === 'exact')

  return (
    <div className="rounded-[1.25rem] bg-[#fff4f7] p-3 shadow-[0_12px_26px_rgba(218,116,139,0.08)] ring-1 ring-rose/12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-ink">可能已存在相似人物</p>
          <p className="mt-1 text-xs leading-5 text-ink/58">
            {hasExactMatch ? '发现完全同名候选，继续保存前需要再确认一次。' : '先看一眼，也许这个人已经在关系圈里了。'}
          </p>
        </div>
        {confirmed ? (
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-rose ring-1 ring-rose/10">
            已确认继续
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {matches.slice(0, 4).map((match) => (
          <div key={match.person.id} className="flex items-center gap-3 rounded-[1rem] bg-white/78 px-3 py-2 ring-1 ring-rose/8">
            <PersonAvatar name={match.person.name} avatar={match.person.avatar} seed={match.person.circle} className="h-10 w-10 text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-black text-ink">{match.person.name}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${match.risk === 'exact' ? 'bg-rose/12 text-rose' : 'bg-violetMist text-violet'}`}>
                  {match.risk === 'exact' ? '同名' : '相似'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-ink/50">
                {match.person.relationType} · {displayCircle(match.person.circle)} · {formatUpdatedAt(match.person.updatedAt)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink/42">{match.reason}</p>
            </div>
            <Link
              className="shrink-0 rounded-full bg-[#ffe5ec] px-3 py-1.5 text-xs font-black text-rose ring-1 ring-rose/10"
              to={`/people/${match.person.id}`}
            >
              查看
            </Link>
          </div>
        ))}
      </div>

      {!confirmed ? (
        <button
          type="button"
          className="mt-3 rounded-full bg-white px-3.5 py-2 text-xs font-black text-ink/68 shadow-[0_10px_20px_rgba(218,116,139,0.08)] ring-1 ring-rose/10"
          onClick={onContinue}
        >
          我确认继续创建/保存
        </button>
      ) : null}
    </div>
  )
}
