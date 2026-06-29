import { useEffect, useMemo, useState } from 'react'
import type { InteractionEvent, Person } from '../../types'
import { getDefaultEventInput, type EventFormInput } from '../../features/events/eventService'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_EVENT_TYPES } from '../../utils/constants'

interface EventFormProps {
  event?: InteractionEvent
  people: Person[]
  onSubmit: (value: EventFormInput) => void | Promise<void>
  onCancel: () => void
  submitLabel: string
}

export default function EventForm({ event, people, onSubmit, onCancel, submitLabel }: EventFormProps) {
  const initial = useMemo<EventFormInput>(() => {
    if (!event) return getDefaultEventInput(people[0]?.id ?? '')
    return {
      personId: event.personId,
      title: event.title,
      eventType: event.eventType,
      eventDate: event.eventDate,
      emotionalTone: event.emotionalTone,
      affectRelationship: event.affectRelationship,
      intimacyChange: event.intimacyChange,
      trustChange: event.trustChange,
      note: event.note ?? '',
    }
  }, [event, people])

  const [form, setForm] = useState<EventFormInput>(initial)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!event && !form.personId && people[0]) {
      setForm((current) => ({ ...current, personId: people[0].id }))
    }
  }, [event, form.personId, people])

  const update = <K extends keyof EventFormInput>(key: K, value: EventFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('请输入事件标题')
      return
    }

    if (!form.personId) {
      setError('请选择关联人物')
      return
    }

    setError('')
    await onSubmit(form)
  }

  return (
    <div className="rounded-[1.5rem] bg-white/86 p-4 shadow-soft ring-1 ring-violet/10">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">事件标题</span>
          <input className="rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.title} onChange={(event) => update('title', event.target.value)} />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">关联人物</span>
          <select className="rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.personId} onChange={(event) => update('personId', event.target.value)}>
            <option value="">请选择人物</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">事件类型</span>
            <select className="rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.eventType} onChange={(event) => update('eventType', event.target.value)}>
              {DEFAULT_EVENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">事件日期</span>
            <input type="date" className="rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.eventDate} onChange={(event) => update('eventDate', event.target.value)} />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">情绪倾向</span>
          <select className="rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.emotionalTone} onChange={(event) => update('emotionalTone', event.target.value as EventFormInput['emotionalTone'])}>
            {DEFAULT_EMOTIONAL_TONES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
          <span className="text-sm font-medium text-ink">影响关系数值</span>
          <input type="checkbox" className="h-5 w-5 accent-violet" checked={form.affectRelationship} onChange={(event) => update('affectRelationship', event.target.checked)} />
        </label>

        {form.affectRelationship ? (
          <div className="rounded-[1.25rem] bg-violetMist/55 p-3 ring-1 ring-violet/10">
            <p className="text-xs leading-5 text-violet">保存后会同步更新人物和关系数值。</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">❤️ 亲密度变化</span>
                <input type="number" className="rounded-2xl border border-white bg-white/80 px-4 py-3 outline-none" value={form.intimacyChange} onChange={(event) => update('intimacyChange', Number(event.target.value))} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">🛡 信任度变化</span>
                <input type="number" className="rounded-2xl border border-white bg-white/80 px-4 py-3 outline-none" value={form.trustChange} onChange={(event) => update('trustChange', Number(event.target.value))} />
              </label>
            </div>
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">备注</span>
          <textarea className="min-h-28 rounded-2xl border border-white bg-paper px-4 py-3 outline-none" value={form.note} onChange={(event) => update('note', event.target.value)} />
        </label>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-3">
          <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-ink ring-1 ring-violet/10" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="flex-1 rounded-2xl bg-violet px-4 py-3 text-sm font-medium text-white shadow-sm" onClick={handleSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
