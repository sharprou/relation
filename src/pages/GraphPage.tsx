import { ReactFlowProvider } from '@xyflow/react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GraphCanvas from '../features/graph/GraphCanvas'
import { loadGraphData, type GraphData } from '../features/graph/graphService'
import { listPeople } from '../features/people/peopleService'
import { listTags } from '../features/tags/tagService'
import type { Person, TagItem } from '../types'
import { cleanFilterOptions, cleanVisibleTags, displayCircle, displayOptionLabel } from '../utils/display'
import { EMPTY_PEOPLE_FILTERS, getUniqueOptions, hasActivePeopleFilters, type PeopleFilters } from '../utils/filter'

const CORE_CIRCLE = '核心圈'
const MIN_INTIMACY = '60'

export default function GraphPage() {
  const navigate = useNavigate()
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_PEOPLE_FILTERS)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        setLoading(true)
        const [nextGraphData, peopleRows, tagRows] = await Promise.all([
          loadGraphData(filters),
          listPeople(),
          listTags(),
        ])

        if (active) {
          setGraphData(nextGraphData)
          setAllPeople(peopleRows)
          setTags(tagRows)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : '图谱数据读取失败，请稍后重试')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    run()

    return () => {
      active = false
    }
  }, [filters])

  const regularPeople = useMemo(() => allPeople.filter((person) => !person.isSelf), [allPeople])
  const filterOptions = useMemo(() => ({
    relationTypes: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.relationType))),
    circles: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => displayCircle(person.circle)))),
    statuses: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.status))),
    tags: getUniqueOptions(cleanFilterOptions([...tags.map((tag) => tag.name), ...regularPeople.flatMap((person) => cleanVisibleTags(person.tags))])),
  }), [regularPeople, tags])

  const hasPeople = Boolean(graphData && graphData.people.length > 0)
  const hasFilters = hasActivePeopleFilters(filters)

  const setFilter = (key: keyof PeopleFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(EMPTY_PEOPLE_FILTERS)
  }

  const toggleCoreCircle = () => {
    setFilters((current) => ({
      ...current,
      circle: current.circle === CORE_CIRCLE ? '' : CORE_CIRCLE,
    }))
  }

  const toggleMinIntimacy = () => {
    setFilters((current) => ({
      ...current,
      minIntimacy: current.minIntimacy === MIN_INTIMACY ? '' : MIN_INTIMACY,
    }))
  }

  const emptyHint = !loading && graphData && !hasPeople
    ? regularPeople.length === 0
      ? { text: '添加人物后，关系会从这里长出来', actionLabel: '添加人物', onAction: () => navigate('/people') }
      : hasFilters
        ? { text: '当前筛选下暂时只有我', actionLabel: '清空筛选', onAction: clearFilters }
        : undefined
    : undefined

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 pt-1">
        <h1 className="text-[28px] font-black tracking-[-0.03em] text-ink">关系图谱</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-[0_12px_24px_rgba(218,116,139,0.10)] ring-1 ring-rose/10"
            onClick={() => navigate('/people')}
            aria-label="搜索人物"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`grid h-10 w-10 place-items-center rounded-full shadow-[0_12px_24px_rgba(218,116,139,0.10)] ring-1 transition ${showAdvancedFilters ? 'bg-[#ffe5ec] text-rose ring-rose/20' : 'bg-white/90 text-ink ring-rose/10'}`}
            onClick={() => setShowAdvancedFilters((current) => !current)}
            aria-label="筛选图谱"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5">
          <FilterChip active={!hasFilters} label="全部关系" onClick={clearFilters} />
          <FilterChip active={filters.circle === CORE_CIRCLE} label="核心圈" onClick={toggleCoreCircle} />
          <FilterChip active={filters.minIntimacy === MIN_INTIMACY} label="亲密度 60+" onClick={toggleMinIntimacy} />
          {hasFilters ? <FilterChip active={false} label="清空" onClick={clearFilters} /> : null}
        </div>
      </div>

      {showAdvancedFilters ? (
        <div className="rounded-[1.35rem] bg-white/72 p-3 shadow-[0_14px_30px_rgba(218,116,139,0.10)] ring-1 ring-rose/10 backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <select className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2 text-xs font-bold text-ink/68 outline-none focus:border-rose/30" value={filters.relationType} onChange={(event) => setFilter('relationType', event.target.value)}>
              <option value="">全部关系</option>
              {filterOptions.relationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2 text-xs font-bold text-ink/68 outline-none focus:border-rose/30" value={filters.circle} onChange={(event) => setFilter('circle', event.target.value)}>
              <option value="">全部圈层</option>
              {filterOptions.circles.map((item) => <option key={item} value={item}>{displayOptionLabel(item)}</option>)}
            </select>
            <select className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2 text-xs font-bold text-ink/68 outline-none focus:border-rose/30" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">全部状态</option>
              {filterOptions.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2 text-xs font-bold text-ink/68 outline-none focus:border-rose/30" value={filters.tag} onChange={(event) => setFilter('tag', event.target.value)}>
              <option value="">全部标签</option>
              {filterOptions.tags.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-rose-700 shadow-soft ring-1 ring-rose/10">{error}</div> : null}

      {graphData ? (
        <ReactFlowProvider>
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            emptyHint={emptyHint}
            onPersonClick={(personId) => navigate(`/people/${personId}`)}
          />
        </ReactFlowProvider>
      ) : (
        <div className="grid h-[560px] place-items-center rounded-[1.9rem] bg-white/80 text-sm font-bold text-ink/50 shadow-soft ring-1 ring-rose/10">
          正在准备关系图谱
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-full px-4 py-2.5 text-sm font-black shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 transition active:scale-[0.98] ${active ? 'bg-[#ffe3ec] text-rose ring-rose/20' : 'bg-white/90 text-ink/68 ring-rose/10'}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
