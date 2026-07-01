import { ReactFlowProvider } from '@xyflow/react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import GraphCanvas from '../features/graph/GraphCanvas'
import GraphHelpDialog from '../features/graph/GraphHelpDialog'
import { loadGraphData, type GraphData } from '../features/graph/graphService'
import GraphMetricToggle from '../features/graph/GraphMetricToggle'
import GraphPathSearch from '../features/graph/GraphPathSearch'
import GraphPerspectiveSelector from '../features/graph/GraphPerspectiveSelector'
import type { GraphLineMetric } from '../features/graph/graphStyle'
import RelationshipDetailSheet from '../features/graph/RelationshipDetailSheet'
import type { HighlightedPath } from '../features/graph/pathSearch'
import OnboardingDialog from '../features/onboarding/OnboardingDialog'
import { loadSampleGraphData } from '../features/onboarding/sampleData'
import { listPeople } from '../features/people/peopleService'
import {
  deleteRelationship,
  listRelationships,
  updateRelationship,
  type RelationshipFormInput,
} from '../features/relationships/relationshipService'
import { listTags } from '../features/tags/tagService'
import { getAppSettings, markOnboardingSeen } from '../features/settings/settingsService'
import type { Person, Relationship, TagItem } from '../types'
import { cleanFilterOptions, cleanVisibleTags, displayCircle, displayOptionLabel } from '../utils/display'
import { EMPTY_PEOPLE_FILTERS, getUniqueOptions, hasActivePeopleFilters, type PeopleFilters } from '../utils/filter'
import ConfirmDialog from '../components/common/ConfirmDialog'
import RelationshipForm from '../components/common/RelationshipForm'

const CORE_CIRCLE = '核心圈'
const MIN_INTIMACY = '60'
type GraphNetworkDepth = 'direct' | 'all'
type GraphViewMode = 'mine' | 'person' | 'islands'

export default function GraphPage() {
  const navigate = useNavigate()
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_PEOPLE_FILTERS)
  const [centerPersonId, setCenterPersonId] = useState('')
  const [lineMetric, setLineMetric] = useState<GraphLineMetric>('intimacy')
  const [networkDepth, setNetworkDepth] = useState<GraphNetworkDepth>('direct')
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>('mine')
  const [highlightedPath, setHighlightedPath] = useState<HighlightedPath | null>(null)
  const [pathViewHint, setPathViewHint] = useState('')
  const [showGraphHelp, setShowGraphHelp] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null)
  const [editingRelationship, setEditingRelationship] = useState<Relationship | undefined>(undefined)
  const [deletingRelationship, setDeletingRelationship] = useState<Relationship | undefined>(undefined)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dataRevision, setDataRevision] = useState(0)
  const selfPersonId = graphData?.selfPerson?.id ?? allPeople.find((person) => person.isSelf)?.id ?? ''

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        setLoading(true)
        const [nextGraphData, peopleRows, relationshipRows, tagRows, settings] = await Promise.all([
          loadGraphData({
            filters,
            centerPersonId: graphViewMode === 'mine' ? undefined : centerPersonId,
            lineMetric,
            networkDepth,
            viewMode: graphViewMode,
            highlightedPath,
          }),
          listPeople(),
          listRelationships(),
          listTags(),
          getAppSettings(),
        ])

        if (active) {
          setGraphData(nextGraphData)
          setAllPeople(peopleRows)
          setAllRelationships(relationshipRows)
          setTags(tagRows)
          setShowOnboarding(!settings.hasSeenOnboarding && peopleRows.filter((person) => !person.isSelf).length === 0)
          if (graphViewMode !== 'islands' && nextGraphData.centerPerson && nextGraphData.centerPerson.id !== centerPersonId) {
            setCenterPersonId(nextGraphData.centerPerson.id)
          }
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
  }, [filters, centerPersonId, lineMetric, networkDepth, graphViewMode, highlightedPath, dataRevision])

  const regularPeople = useMemo(() => allPeople.filter((person) => !person.isSelf), [allPeople])
  const filterOptions = useMemo(() => ({
    relationTypes: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.relationType))),
    circles: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => displayCircle(person.circle)))),
    statuses: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.status))),
    tags: getUniqueOptions(cleanFilterOptions([...tags.map((tag) => tag.name), ...regularPeople.flatMap((person) => cleanVisibleTags(person.tags))])),
  }), [regularPeople, tags])

  const hasGraphPeople = Boolean(graphData && graphData.people.length > 0)
  const hasDataFilters = hasActivePeopleFilters(filters) || networkDepth === 'all'
  const hasFilters = hasDataFilters || graphViewMode === 'islands'
  const currentCenterLabel = graphData?.centerPerson?.isSelf
    ? '我'
    : graphData?.centerPerson?.name ?? '中心人物'

  const setFilter = (key: keyof PeopleFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters(EMPTY_PEOPLE_FILTERS)
    setNetworkDepth('direct')
    setGraphViewMode('mine')
  }

  const clearHighlightedPath = () => {
    setHighlightedPath(null)
    setPathViewHint('')
  }

  const handleFilterBarWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

    event.currentTarget.scrollLeft += event.deltaY
    event.preventDefault()
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

  const showMineView = () => {
    setGraphViewMode('mine')
    setNetworkDepth('direct')
    if (selfPersonId) setCenterPersonId(selfPersonId)
  }

  const toggleAllNetwork = () => {
    setGraphViewMode(graphViewMode === 'mine' ? 'mine' : 'person')
    setNetworkDepth((current) => current === 'all' ? 'direct' : 'all')
  }

  const showAllIslands = () => {
    setGraphViewMode('islands')
    setNetworkDepth('direct')
  }

  const handlePerspectiveChange = (personId: string) => {
    setCenterPersonId(personId)
    setGraphViewMode(personId === selfPersonId ? 'mine' : 'person')
    setNetworkDepth('direct')
  }

  const handleGraphPersonClick = (personId: string) => {
    if (graphViewMode === 'islands') {
      handlePerspectiveChange(personId)
      return
    }

    navigate(`/people/${personId}`)
  }

  const handlePathFound = (path: HighlightedPath) => {
    const visibleNodeIds = new Set(graphData?.nodes.map((node) => node.id) ?? [])
    const visibleEdgeIds = new Set(graphData?.edges.map((edge) => edge.id) ?? [])
    const isFullyVisible = path.personIds.every((personId) => visibleNodeIds.has(personId)) &&
      path.relationshipIds.every((relationshipId) => visibleEdgeIds.has(relationshipId))

    setHighlightedPath(path)

    if (!isFullyVisible) {
      setFilters(EMPTY_PEOPLE_FILTERS)
      setGraphViewMode('islands')
      setNetworkDepth('direct')
      setPathViewHint('路径不完全在当前视图中，已切换到全部关系岛查看。')
      return
    }

    setPathViewHint('')
  }

  const submitEditRelationship = async (value: RelationshipFormInput) => {
    if (!editingRelationship) return

    try {
      await updateRelationship(editingRelationship.id, value)
      setEditingRelationship(undefined)
      setSelectedRelationship(null)
      setDataRevision((current) => current + 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存关系失败')
    }
  }

  const confirmDeleteRelationship = async () => {
    if (!deletingRelationship) return

    try {
      await deleteRelationship(deletingRelationship.id)
      setDeletingRelationship(undefined)
      setSelectedRelationship(null)
      if (highlightedPath?.relationshipIds.includes(deletingRelationship.id)) {
        clearHighlightedPath()
      }
      setDataRevision((current) => current + 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除关系失败')
    }
  }

  const dismissOnboarding = async () => {
    await markOnboardingSeen(true)
    setShowOnboarding(false)
  }

  const startAddPersonFromOnboarding = async () => {
    await dismissOnboarding()
    navigate('/people')
  }

  const loadSampleFromOnboarding = async () => {
    try {
      await loadSampleGraphData(false)
      await markOnboardingSeen(true)
      setShowOnboarding(false)
      setGraphViewMode('islands')
      setNetworkDepth('direct')
      setDataRevision((current) => current + 1)
    } catch (err) {
      alert(err instanceof Error ? err.message : '载入示例图谱失败')
    }
  }

  const emptyHint = !loading && graphData && !hasGraphPeople
    ? regularPeople.length === 0
      ? { text: '添加人物后，关系会从这里长出来', actionLabel: '添加人物', onAction: () => navigate('/people') }
      : hasFilters
        ? { text: '当前筛选下暂时只有中心人物', actionLabel: '清空筛选', onAction: clearFilters }
        : { text: `${currentCenterLabel} 暂时没有直接关联人物` }
    : undefined

  return (
    <div className="-mt-1 flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-[26px] font-black tracking-[-0.03em] text-ink">关系图谱</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-[0_12px_24px_rgba(218,116,139,0.10)] ring-1 ring-rose/10"
            onClick={() => navigate('/people')}
            aria-label="搜索人物"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <GraphHelpDialog open={showGraphHelp} onOpen={() => setShowGraphHelp(true)} onClose={() => setShowGraphHelp(false)} />
          <button
            type="button"
            className={`grid h-9 w-9 place-items-center rounded-full shadow-[0_12px_24px_rgba(218,116,139,0.10)] ring-1 transition ${showAdvancedFilters ? 'bg-[#ffe5ec] text-rose ring-rose/20' : 'bg-white/90 text-ink ring-rose/10'}`}
            onClick={() => setShowAdvancedFilters((current) => !current)}
            aria-label="筛选图谱"
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        data-testid="graph-filter-bar"
        className="-mx-4 min-w-0 max-w-[calc(100%+2rem)] shrink-0 touch-pan-x overflow-x-auto overscroll-x-contain px-4 pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        onWheel={handleFilterBarWheel}
      >
        <div className="flex w-max max-w-none items-center gap-2">
          {allPeople.length > 0 ? (
            <GraphPerspectiveSelector
              people={allPeople}
              centerPersonId={graphData?.centerPerson?.id ?? centerPersonId}
              islandLabels={graphData?.personIslandLabels}
              onChange={handlePerspectiveChange}
            />
          ) : null}
          <GraphPathSearch
            people={allPeople}
            relationships={allRelationships}
            defaultStartPersonId={graphData?.centerPerson?.id || centerPersonId || selfPersonId}
            onPathFound={handlePathFound}
            onClearPath={clearHighlightedPath}
          />
          <GraphMetricToggle value={lineMetric} onChange={setLineMetric} />
          <FilterChip active={graphViewMode === 'mine'} label="我的关系" onClick={showMineView} />
          <FilterChip active={graphViewMode === 'islands'} label="全部关系岛" onClick={showAllIslands} />
          <FilterChip active={networkDepth === 'all' && graphViewMode !== 'islands'} label="多级人脉" onClick={toggleAllNetwork} />
          <FilterChip active={filters.circle === CORE_CIRCLE} label="核心圈" onClick={toggleCoreCircle} />
          <FilterChip active={filters.minIntimacy === MIN_INTIMACY} label="亲密度 60+" onClick={toggleMinIntimacy} />
          {hasFilters ? <FilterChip active={false} label="清空" onClick={clearFilters} /> : null}
        </div>
      </div>

      {showAdvancedFilters ? (
        <div className="shrink-0 rounded-[1.2rem] bg-white/72 p-2.5 shadow-[0_14px_30px_rgba(218,116,139,0.10)] ring-1 ring-rose/10 backdrop-blur">
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

      {error ? <div className="shrink-0 rounded-2xl bg-white/90 px-4 py-2.5 text-sm text-rose-700 shadow-soft ring-1 ring-rose/10">{error}</div> : null}

      {pathViewHint ? (
        <div className="shrink-0 rounded-2xl bg-[#fff0f4] px-4 py-2.5 text-sm font-bold text-rose shadow-soft ring-1 ring-rose/10">
          {pathViewHint}
        </div>
      ) : null}

      {graphData ? (
        <div className="min-h-0 flex-1">
          <ReactFlowProvider>
            <GraphCanvas
              className="h-full"
              nodes={graphData.nodes}
              edges={graphData.edges}
              lineMetric={lineMetric}
              isIslandView={graphViewMode === 'islands'}
              highlightedPath={highlightedPath}
              layoutResetKey={[
                graphData.centerPerson?.id ?? centerPersonId,
                filters.relationType,
                filters.circle,
                filters.status,
                filters.tag,
                filters.minIntimacy,
                networkDepth,
                graphViewMode,
              ].join('|')}
              emptyHint={emptyHint}
              onPersonClick={handleGraphPersonClick}
              onRelationshipClick={setSelectedRelationship}
            />
          </ReactFlowProvider>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center rounded-[1.65rem] bg-white/80 text-sm font-bold text-ink/50 shadow-soft ring-1 ring-rose/10">
          正在准备关系图谱
        </div>
      )}

      {selectedRelationship && !editingRelationship ? (
        <RelationshipDetailSheet
          relationship={selectedRelationship}
          people={allPeople}
          onClose={() => setSelectedRelationship(null)}
          onEdit={(relationship) => {
            setEditingRelationship(relationship)
            setSelectedRelationship(null)
          }}
          onDelete={(relationship) => setDeletingRelationship(relationship)}
        />
      ) : null}

      {editingRelationship ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-[1.6rem] bg-[#fff9fa] p-4 shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Edit</p>
                <h2 className="mt-1 text-xl font-black text-ink">编辑关系</h2>
              </div>
              <button type="button" className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink shadow-soft ring-1 ring-rose/10" onClick={() => setEditingRelationship(undefined)}>
                关闭
              </button>
            </div>
            <RelationshipForm
              people={allPeople}
              currentPersonId={editingRelationship.sourcePersonId}
              relationship={editingRelationship}
              submitLabel="保存修改"
              onCancel={() => setEditingRelationship(undefined)}
              onSubmit={submitEditRelationship}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingRelationship)}
        title="删除关系"
        message="删除后只会移除这两个人之间的关系，不会删除人物资料。建议重要操作前先导出备份。是否继续？"
        confirmLabel="删除关系"
        cancelLabel="取消"
        onCancel={() => setDeletingRelationship(undefined)}
        onConfirm={confirmDeleteRelationship}
      />

      <OnboardingDialog
        open={showOnboarding}
        onStartAddPerson={startAddPersonFromOnboarding}
        onLoadSample={loadSampleFromOnboarding}
        onDismiss={dismissOnboarding}
      />
    </div>
  )
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-black shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 transition active:scale-[0.98] ${active ? 'bg-[#ffe3ec] text-rose ring-rose/20' : 'bg-white/90 text-ink/68 ring-rose/10'}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
