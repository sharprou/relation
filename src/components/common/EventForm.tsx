import { useEffect, useMemo, useRef, useState } from 'react'
import type { InteractionEvent, Person } from '../../types'
import { getDefaultEventInput, getEventImages, type EventFormInput } from '../../features/events/eventService'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_EVENT_TYPES } from '../../utils/constants'
import { compressEventImageToDataUrl } from '../../utils/image'

const MAX_RELATIONSHIP_CHANGE = 100

interface EventFormProps {
  event?: InteractionEvent
  people: Person[]
  onSubmit: (value: EventFormInput) => void | Promise<void>
  onCancel: () => void
  submitLabel: string
}

function toChangeInput(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.min(MAX_RELATIONSHIP_CHANGE, Math.max(-MAX_RELATIONSHIP_CHANGE, Math.trunc(value))))
}

function sanitizeChangeInput(value: string): string {
  const trimmed = value.trim()
  const sign = trimmed.startsWith('-') ? '-' : ''
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return sign

  return `${sign}${Math.min(MAX_RELATIONSHIP_CHANGE, Number(digits))}`
}

function parseChangeInput(value: string): number {
  if (!value || value === '-') return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(MAX_RELATIONSHIP_CHANGE, Math.max(-MAX_RELATIONSHIP_CHANGE, Math.trunc(parsed)))
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
      images: getEventImages(event),
      photo: '',
      note: event.note ?? '',
    }
  }, [event, people])

  const [form, setForm] = useState<EventFormInput>(initial)
  const [intimacyChangeInput, setIntimacyChangeInput] = useState(() => toChangeInput(initial.intimacyChange))
  const [trustChangeInput, setTrustChangeInput] = useState(() => toChangeInput(initial.trustChange))
  const [error, setError] = useState('')
  const [imagesBusy, setImagesBusy] = useState(false)
  const imagesInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(initial)
    setIntimacyChangeInput(toChangeInput(initial.intimacyChange))
    setTrustChangeInput(toChangeInput(initial.trustChange))
  }, [initial])

  useEffect(() => {
    if (!event && !form.personId && people[0]) {
      setForm((current) => ({ ...current, personId: people[0].id }))
    }
  }, [event, form.personId, people])

  const update = <K extends keyof EventFormInput>(key: K, value: EventFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleImagesChange = async (fileList?: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    try {
      setImagesBusy(true)
      setError('')
      const nextImages = await Promise.all(files.map((file) => compressEventImageToDataUrl(file)))
      update('images', [...(form.images ?? []), ...nextImages])
    } catch (err) {
      setError(err instanceof Error ? err.message : '照片处理失败')
    } finally {
      setImagesBusy(false)
      if (imagesInputRef.current) imagesInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    update('images', (form.images ?? []).filter((_, imageIndex) => imageIndex !== index))
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
    await onSubmit({
      ...form,
      intimacyChange: form.affectRelationship ? parseChangeInput(intimacyChangeInput) : 0,
      trustChange: form.affectRelationship ? parseChangeInput(trustChangeInput) : 0,
    })
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

        <div className="grid gap-2 rounded-[1.25rem] bg-paper/70 p-3 ring-1 ring-violet/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">事件照片</p>
              <p className="mt-1 text-xs leading-5 text-ink/55">照片会压缩后保存在本地记录里。</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet shadow-sm ring-1 ring-violet/10 disabled:text-ink/35"
              disabled={imagesBusy}
              onClick={() => imagesInputRef.current?.click()}
            >
              {imagesBusy ? '处理中' : (form.images?.length ?? 0) > 0 ? '追加照片' : '上传照片'}
            </button>
          </div>
          {(form.images?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {form.images?.map((image, index) => (
                <div key={`${image.slice(0, 28)}-${index}`} className="relative overflow-hidden rounded-[1.1rem] bg-white shadow-[0_12px_26px_rgba(218,116,139,0.10)] ring-1 ring-violet/10">
                  <img src={image} alt="" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[11px] font-black text-rose shadow-sm ring-1 ring-rose/10"
                    onClick={() => removeImage(index)}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <input ref={imagesInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => handleImagesChange(event.target.files)} />
        </div>

        <label className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
          <span className="text-sm font-medium text-ink">影响关系数值</span>
          <input type="checkbox" className="h-5 w-5 accent-violet" checked={form.affectRelationship} onChange={(event) => update('affectRelationship', event.target.checked)} />
        </label>

        {form.affectRelationship ? (
          <div className="rounded-[1.25rem] bg-violetMist/55 p-3 ring-1 ring-violet/10">
            <p className="text-xs leading-5 text-violet">保存后会同步更新人物和关系数值，可以填负数表示关系变弱。</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">❤️ 亲密度变化</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded-2xl border border-white bg-white/80 px-4 py-3 outline-none"
                  value={intimacyChangeInput}
                  placeholder="-10 或 10"
                  onChange={(event) => setIntimacyChangeInput(sanitizeChangeInput(event.target.value))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">🛡 信任度变化</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded-2xl border border-white bg-white/80 px-4 py-3 outline-none"
                  value={trustChangeInput}
                  placeholder="-10 或 10"
                  onChange={(event) => setTrustChangeInput(sanitizeChangeInput(event.target.value))}
                />
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
