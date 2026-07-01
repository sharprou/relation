import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../components/common/ConfirmDialog'
import EventCard from '../components/common/EventCard'
import EventForm from '../components/common/EventForm'
import PageShell from '../components/common/PageShell'
import {
  filterEvents,
  sortEvents,
  type EventRelationshipFilter,
  type EventSortType,
} from '../features/events/eventFilters'
import { addEvent, deleteEvent, listEvents, updateEvent, type EventFormInput } from '../features/events/eventService'
import { listPeople } from '../features/people/peopleService'
import type { InteractionEvent, Person } from '../types'

type ViewMode = 'list' | 'create' | 'edit'

function formatTimelineDate(dateValue: string): { day: string; week: string } {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return { day: dateValue.slice(5).replace('-', '/'), week: '' }

  return {
    day: dateValue.slice(5).replace('-', '/'),
    week: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<InteractionEvent[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [mode, setMode] = useState<ViewMode>('list')
  const [editingEvent, setEditingEvent] = useState<InteractionEvent | undefined>(undefined)
  const [deletingEvent, setDeletingEvent] = useState<InteractionEvent | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState<EventRelationshipFilter>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [sortType, setSortType] = useState<EventSortType>('newest')

  const regularPeople = people.filter((person) => !person.isSelf)
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const eventTypeOptions = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.eventType).filter(Boolean))).sort((typeA, typeB) => typeA.localeCompare(typeB, 'zh-Hans-CN'))
  }, [events])
  const filteredEvents = useMemo(() => {
    const nextEvents = filterEvents(events, {
      keyword,
      personId: selectedPersonId,
      relationshipFilter,
      eventType: eventTypeFilter,
      peopleById,
    })

    return sortEvents(nextEvents, sortType)
  }, [eventTypeFilter, events, keyword, peopleById, relationshipFilter, selectedPersonId, sortType])
  const hasActiveQuery = Boolean(keyword.trim()) || Boolean(selectedPersonId) || relationshipFilter !== 'all' || Boolean(eventTypeFilter) || sortType !== 'newest'

  const refresh = async () => {
    const [nextEvents, nextPeople] = await Promise.all([listEvents(), listPeople()])
    setEvents(nextEvents)
    setPeople(nextPeople)
  }

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        setLoading(true)
        await refresh()
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : '事件数据读取失败，请稍后重试')
      } finally {
        if (active) setLoading(false)
      }
    }

    run()

    return () => {
      active = false
    }
  }, [])

  const submitCreate = async (value: EventFormInput) => {
    try {
      await addEvent(value)
      await refresh()
      setMode('list')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const submitEdit = async (value: EventFormInput) => {
    if (!editingEvent) return

    try {
      await updateEvent(editingEvent.id, value)
      await refresh()
      setEditingEvent(undefined)
      setMode('list')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const confirmDelete = async () => {
    if (!deletingEvent) return

    try {
      await deleteEvent(deletingEvent.id)
      await refresh()
      setDeletingEvent(undefined)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const clearEventFilters = () => {
    setKeyword('')
    setSelectedPersonId('')
    setRelationshipFilter('all')
    setEventTypeFilter('')
    setSortType('newest')
  }

  return (
    <PageShell
      eyebrow="Moments"
      title="事件"
      description="记录和回顾与人物发生过的关键互动。"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink/55">
            {events.length > 0 ? `共 ${filteredEvents.length} / ${events.length} 条事件` : '事件会从一次聊天或见面开始长出来'}
          </p>
          <button type="button" className="rounded-2xl bg-violet px-4 py-2 text-sm font-bold text-white shadow-soft" onClick={() => { setEditingEvent(undefined); setMode('create') }}>
            + 记录事件
          </button>
        </div>

        {error ? <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-rose-700 shadow-soft ring-1 ring-violet/10">{error}</div> : null}

        {mode === 'create' ? (
          <EventForm people={regularPeople} submitLabel="保存事件" onCancel={() => setMode('list')} onSubmit={submitCreate} />
        ) : null}

        {mode === 'edit' && editingEvent ? (
          <EventForm event={editingEvent} people={regularPeople} submitLabel="保存修改" onCancel={() => { setEditingEvent(undefined); setMode('list') }} onSubmit={submitEdit} />
        ) : null}

        {mode === 'list' && events.length > 0 ? (
          <section className="rounded-[1.45rem] bg-white/78 p-3 shadow-soft ring-1 ring-violet/10">
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-rose/70">Search</span>
                <input
                  className="w-full rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/34 focus:border-violet/35"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索人物、事件标题或内容"
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2.5 text-xs font-bold text-ink/68 outline-none focus:border-rose/30"
                  value={selectedPersonId}
                  onChange={(event) => setSelectedPersonId(event.target.value)}
                >
                  <option value="">全部人物</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.isSelf ? '我' : person.name}</option>
                  ))}
                </select>
                <select
                  className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2.5 text-xs font-bold text-ink/68 outline-none focus:border-rose/30"
                  value={relationshipFilter}
                  onChange={(event) => setRelationshipFilter(event.target.value as EventRelationshipFilter)}
                >
                  <option value="all">全部事件</option>
                  <option value="affected">影响关系</option>
                  <option value="unaffected">不影响关系</option>
                </select>
                <select
                  className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2.5 text-xs font-bold text-ink/68 outline-none focus:border-rose/30"
                  value={eventTypeFilter}
                  onChange={(event) => setEventTypeFilter(event.target.value)}
                >
                  <option value="">全部类型</option>
                  {eventTypeOptions.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
                </select>
                <select
                  className="min-w-0 rounded-full border border-rose/10 bg-white/86 px-3 py-2.5 text-xs font-bold text-ink/68 outline-none focus:border-rose/30"
                  value={sortType}
                  onChange={(event) => setSortType(event.target.value as EventSortType)}
                >
                  <option value="newest">最新优先</option>
                  <option value="oldest">最早优先</option>
                  <option value="intimacyImpact">亲密度影响最大</option>
                  <option value="trustImpact">信任度影响最大</option>
                  <option value="recentlyUpdated">最近更新</option>
                </select>
              </div>

              {hasActiveQuery ? (
                <button type="button" className="w-fit rounded-full bg-violetMist px-3.5 py-2 text-xs font-black text-violet ring-1 ring-violet/10" onClick={clearEventFilters}>
                  清空搜索和筛选
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {mode === 'list' && !loading && events.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/88 p-6 text-center shadow-soft ring-1 ring-violet/10">
            <p className="text-base font-bold text-ink">这里还没有事件，记录一次聊天或见面也可以。</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">以后想回看某个人、某个关键词，都能从这里找到线索。</p>
            <div className="mt-4">
              <button type="button" className="rounded-2xl bg-violet px-4 py-3 text-sm font-medium text-white" onClick={() => setMode('create')}>
                记录一件事
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'list' && events.length > 0 && filteredEvents.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/88 p-6 text-center shadow-soft ring-1 ring-violet/10">
            <p className="text-base font-bold text-ink">没有找到匹配的事件。</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">可以换个关键词，或者先清空人物和关系影响筛选。</p>
            <button type="button" className="mt-4 rounded-2xl bg-violetMist px-4 py-3 text-sm font-bold text-violet ring-1 ring-violet/10" onClick={clearEventFilters}>
              清空筛选
            </button>
          </div>
        ) : null}

        {mode === 'list' && filteredEvents.length > 0 ? (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const date = formatTimelineDate(event.eventDate)
              return (
                <div key={event.id} className="grid grid-cols-[70px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-x-4">
                  <div className="relative min-h-full pr-4 text-right">
                    <div className="pt-2">
                      <p className="whitespace-nowrap text-sm font-extrabold text-ink">{date.day}</p>
                      <p className="whitespace-nowrap text-xs font-semibold text-ink/45">{date.week}</p>
                    </div>
                    <span className="absolute bottom-[-1rem] right-0 top-2 w-px bg-violet/18" />
                    <span className="absolute right-[-5px] top-4 h-2.5 w-2.5 rounded-full bg-violet ring-4 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <EventCard
                      event={event}
                      person={peopleById.get(event.personId)}
                      onEdit={(targetEvent) => { setEditingEvent(targetEvent); setMode('edit') }}
                      onDelete={setDeletingEvent}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <ConfirmDialog
          open={Boolean(deletingEvent)}
          title="删除事件"
          message="删除后将移除该事件记录。当前阶段不会自动回滚已影响的亲密度和信任度。是否继续？"
          confirmLabel="删除"
          cancelLabel="取消"
          onCancel={() => setDeletingEvent(undefined)}
          onConfirm={confirmDelete}
        />
      </div>
    </PageShell>
  )
}
