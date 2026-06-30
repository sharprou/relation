import { useEffect, useMemo, useState } from 'react'
import type { Person, Relationship } from '../../types'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_RELATION_STATUSES, DEFAULT_RELATION_TYPES } from '../../utils/constants'
import type { RelationshipFormInput } from '../../features/relationships/relationshipService'

interface RelationshipFormProps {
  people: Person[]
  currentPersonId: string
  relationship?: Relationship
  onSubmit: (value: RelationshipFormInput) => void | Promise<void>
  onCancel: () => void
  submitLabel: string
}

const RELATIONSHIP_TYPES = Array.from(new Set(['朋友', '家人', '同事', '同学', '合作', '普通认识', '其他', ...DEFAULT_RELATION_TYPES]))
const RELATIONSHIP_STATUSES = Array.from(new Set(['正常', '需要维护', '疏远', '重要', '暂停', ...DEFAULT_RELATION_STATUSES]))

function toScoreInput(value: number): string {
  if (!Number.isFinite(value)) return '50'
  return String(Math.min(100, Math.max(0, Math.trunc(value))))
}

function sanitizeScoreInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return String(Math.min(100, Number(digits)))
}

function parseScoreInput(value: string): number {
  if (!value) return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, Math.trunc(parsed)))
}

export default function RelationshipForm({
  people,
  currentPersonId,
  relationship,
  onSubmit,
  onCancel,
  submitLabel,
}: RelationshipFormProps) {
  const initial = useMemo<RelationshipFormInput>(() => {
    if (relationship) {
      return {
        sourcePersonId: relationship.sourcePersonId,
        targetPersonId: relationship.targetPersonId,
        type: relationship.type,
        status: relationship.status,
        intimacy: relationship.intimacy,
        trust: relationship.trust,
        emotionalTone: relationship.emotionalTone,
        note: relationship.note ?? '',
      }
    }

    const targetPerson = people.find((person) => person.id !== currentPersonId)

    return {
      sourcePersonId: currentPersonId,
      targetPersonId: targetPerson?.id ?? '',
      type: RELATIONSHIP_TYPES[0] ?? '朋友',
      status: '正常',
      intimacy: 50,
      trust: 50,
      emotionalTone: '中性',
      note: '',
    }
  }, [currentPersonId, people, relationship])

  const [form, setForm] = useState<RelationshipFormInput>(initial)
  const [intimacyInput, setIntimacyInput] = useState(() => toScoreInput(initial.intimacy))
  const [trustInput, setTrustInput] = useState(() => toScoreInput(initial.trust))
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(initial)
    setIntimacyInput(toScoreInput(initial.intimacy))
    setTrustInput(toScoreInput(initial.trust))
  }, [initial])

  const update = <K extends keyof RelationshipFormInput>(key: K, value: RelationshipFormInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.sourcePersonId) {
      setError('请选择人物 A。')
      return
    }

    if (!form.targetPersonId) {
      setError('请选择人物 B。')
      return
    }

    if (form.sourcePersonId === form.targetPersonId) {
      setError('人物 A 不能关联自己。')
      return
    }

    if (form.sourcePersonId !== currentPersonId && form.targetPersonId !== currentPersonId) {
      setError('请至少选择当前人物作为关系一方。')
      return
    }

    setError('')
    await onSubmit({
      ...form,
      intimacy: parseScoreInput(intimacyInput),
      trust: parseScoreInput(trustInput),
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <div className="rounded-2xl bg-rose/10 px-4 py-3 text-sm font-semibold text-rose">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">人物 A</span>
          <select
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={form.sourcePersonId}
            onChange={(event) => update('sourcePersonId', event.target.value)}
          >
            <option value="">请选择人物</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">人物 B</span>
          <select
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={form.targetPersonId}
            onChange={(event) => update('targetPersonId', event.target.value)}
          >
            <option value="">请选择人物</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">关系类型</span>
          <select
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={form.type}
            onChange={(event) => update('type', event.target.value)}
          >
            {RELATIONSHIP_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">关系状态</span>
          <select
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={form.status}
            onChange={(event) => update('status', event.target.value)}
          >
            {RELATIONSHIP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">❤ 亲密度</span>
          <input
            type="text"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={intimacyInput}
            onChange={(event) => setIntimacyInput(sanitizeScoreInput(event.target.value))}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink">🛡 信任度</span>
          <input
            type="text"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
            value={trustInput}
            onChange={(event) => setTrustInput(sanitizeScoreInput(event.target.value))}
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-ink">情绪倾向</span>
        <select
          className="rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none"
          value={form.emotionalTone}
          onChange={(event) => update('emotionalTone', event.target.value as RelationshipFormInput['emotionalTone'])}
        >
          {DEFAULT_EMOTIONAL_TONES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-ink">备注</span>
        <textarea
          className="min-h-24 resize-none rounded-2xl border border-rose/10 bg-white/85 px-4 py-3 text-sm leading-6 text-ink outline-none"
          value={form.note ?? ''}
          onChange={(event) => update('note', event.target.value)}
          placeholder="可以记录这段关系的背景、相处方式或需要留意的点"
        />
      </label>

      <div className="flex gap-3 pt-1">
        <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink shadow-soft ring-1 ring-rose/10" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="flex-1 rounded-2xl bg-rose px-4 py-3 text-sm font-bold text-white shadow-soft">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
