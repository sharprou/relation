import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/common/ConfirmDialog'
import EventCard from '../components/common/EventCard'
import EventForm from '../components/common/EventForm'
import PageShell from '../components/common/PageShell'
import { addEvent, deleteEvent, listEvents, updateEvent, type EventFormInput } from '../features/events/eventService'
import { listPeople } from '../features/people/peopleService'
import type { InteractionEvent, Person } from '../types'

type ViewMode = 'list' | 'create' | 'edit'

export default function EventsPage() {
  const [events, setEvents] = useState<InteractionEvent[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [mode, setMode] = useState<ViewMode>('list')
  const [editingEvent, setEditingEvent] = useState<InteractionEvent | undefined>(undefined)
  const [deletingEvent, setDeletingEvent] = useState<InteractionEvent | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const regularPeople = people.filter((person) => !person.isSelf)
  const peopleById = new Map(people.map((person) => [person.id, person]))

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

  return (
    <PageShell
      eyebrow="Moments"
      title="事件"
      description="记录和回顾与人物发生过的关键互动。"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink/60">按事件日期倒序</p>
          <button type="button" className="rounded-2xl bg-clay px-4 py-2 text-sm font-medium text-white shadow-soft" onClick={() => { setEditingEvent(undefined); setMode('create') }}>
            记录一件事
          </button>
        </div>

        {error ? <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-rose-700 shadow-soft ring-1 ring-white">{error}</div> : null}

        {mode === 'create' ? (
          <EventForm people={regularPeople} submitLabel="保存事件" onCancel={() => setMode('list')} onSubmit={submitCreate} />
        ) : null}

        {mode === 'edit' && editingEvent ? (
          <EventForm event={editingEvent} people={regularPeople} submitLabel="保存修改" onCancel={() => { setEditingEvent(undefined); setMode('list') }} onSubmit={submitEdit} />
        ) : null}

        {mode === 'list' && !loading && events.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/78 p-6 text-center shadow-soft ring-1 ring-white">
            <p className="text-base font-medium text-ink">暂无事件记录。</p>
            <div className="mt-4">
              <button type="button" className="rounded-2xl bg-clay px-4 py-3 text-sm font-medium text-white" onClick={() => setMode('create')}>
                记录一件事
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'list' && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                person={peopleById.get(event.personId)}
                onEdit={(targetEvent) => { setEditingEvent(targetEvent); setMode('edit') }}
                onDelete={setDeletingEvent}
              />
            ))}
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
