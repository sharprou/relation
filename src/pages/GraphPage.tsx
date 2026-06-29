import { ReactFlowProvider } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/common/PageShell'
import GraphCanvas from '../features/graph/GraphCanvas'
import { loadGraphData, type GraphData } from '../features/graph/graphService'
import { listPeople } from '../features/people/peopleService'
import { listTags } from '../features/tags/tagService'
import type { Person, TagItem } from '../types'
import { EMPTY_PEOPLE_FILTERS, getUniqueOptions, hasActivePeopleFilters, type PeopleFilters } from '../utils/filter'

export default function GraphPage() {
  const navigate = useNavigate()
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_PEOPLE_FILTERS)
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
    relationTypes: getUniqueOptions(regularPeople.map((person) => person.relationType)),
    circles: getUniqueOptions(regularPeople.map((person) => person.circle)),
    statuses: getUniqueOptions(regularPeople.map((person) => person.status)),
    tags: getUniqueOptions([...tags.map((tag) => tag.name), ...regularPeople.flatMap((person) => person.tags)]),
  }), [regularPeople, tags])

  const hasPeople = Boolean(graphData && graphData.people.length > 0)
  const hasBasePeople = regularPeople.length > 0
  const hasFilters = hasActivePeopleFilters(filters)

  const setFilter = (key: keyof PeopleFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(EMPTY_PEOPLE_FILTERS)
  }

  return (
    <PageShell
      eyebrow="Relationship Map"
      title="关系图谱"
      description="查看你和人物之间的关系网络，也可以按关系、圈层、状态和标签筛选。"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink/60">
            {graphData?.selfPerson ? `中心节点：${graphData.selfPerson.name}` : '正在准备中心节点'}
          </p>
          <button type="button" className="rounded-2xl bg-clay px-4 py-2 text-sm font-medium text-white shadow-soft" onClick={() => navigate('/people')}>
            去添加人物
          </button>
        </div>

        <div className="space-y-3 rounded-[1.35rem] bg-white/70 p-4 shadow-soft ring-1 ring-white">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-2xl border border-white bg-paper px-3 py-2 text-sm outline-none" value={filters.relationType} onChange={(event) => setFilter('relationType', event.target.value)}>
              <option value="">全部关系类型</option>
              {filterOptions.relationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-2xl border border-white bg-paper px-3 py-2 text-sm outline-none" value={filters.circle} onChange={(event) => setFilter('circle', event.target.value)}>
              <option value="">全部圈层</option>
              {filterOptions.circles.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-2xl border border-white bg-paper px-3 py-2 text-sm outline-none" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">全部状态</option>
              {filterOptions.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="rounded-2xl border border-white bg-paper px-3 py-2 text-sm outline-none" value={filters.tag} onChange={(event) => setFilter('tag', event.target.value)}>
              <option value="">全部标签</option>
              {filterOptions.tags.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          {hasFilters ? (
            <button type="button" className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-ink ring-1 ring-white" onClick={clearFilters}>
              清空筛选
            </button>
          ) : null}
        </div>

        {error ? <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-rose-700 shadow-soft ring-1 ring-white">{error}</div> : null}

        {!loading && !hasBasePeople ? (
          <div className="rounded-[1.5rem] bg-white/78 p-6 text-center shadow-soft ring-1 ring-white">
            <p className="text-base font-medium text-ink">还没有添加人物，先记录第一个人吧。</p>
            <div className="mt-4">
              <button type="button" className="rounded-2xl bg-clay px-4 py-3 text-sm font-medium text-white" onClick={() => navigate('/people')}>
                去添加人物
              </button>
            </div>
          </div>
        ) : null}

        {!loading && hasBasePeople && hasFilters && !hasPeople ? (
          <div className="rounded-[1.5rem] bg-white/78 p-6 text-center shadow-soft ring-1 ring-white">
            <p className="text-base font-medium text-ink">当前筛选条件下暂无人物。</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">清空筛选后可以恢复全部人物节点。</p>
          </div>
        ) : null}

        {graphData && hasBasePeople && (hasPeople || (hasFilters && graphData.selfPerson)) ? (
          <ReactFlowProvider>
            <GraphCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              onPersonClick={(personId) => navigate(`/people/${personId}`)}
            />
          </ReactFlowProvider>
        ) : null}
      </div>
    </PageShell>
  )
}
