import { useEffect, useMemo, useRef, useState } from 'react'
import type { Person, TagItem } from '../../types'
import { getDefaultPersonInput, sanitizePersonInput } from '../../features/people/peopleService'
import DuplicatePersonNotice from '../../features/people/DuplicatePersonNotice'
import { findDuplicatePersons } from '../../features/people/personDuplicateUtils'
import { listTags } from '../../features/tags/tagService'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_RELATION_STATUSES, DEFAULT_RELATION_TYPES } from '../../utils/constants'
import { cleanVisibleTags } from '../../utils/display'
import { compressImageToDataUrl } from '../../utils/image'
import PersonAvatar from './PersonAvatar'

export type PersonFormValue = ReturnType<typeof getDefaultPersonInput>

export interface PersonConnectionValue {
  connectToPersonId?: string
  createInitialRelationship?: boolean
}

interface PersonFormProps {
  person?: Person
  connectionPeople?: Person[]
  defaultConnectToPersonId?: string
  isSelf?: boolean
  onSubmit: (value: PersonFormValue, connection?: PersonConnectionValue) => void | Promise<void>
  onCancel: () => void
  submitLabel: string
}

function toNumberInput(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(Math.trunc(value))
}

function sanitizeUnsignedNumberInput(value: string, max: number): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  return String(Math.min(max, Number(digits)))
}

function parseUnsignedNumberInput(value: string, fallback: number): number {
  if (!value) return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback

  return Math.trunc(parsed)
}

export default function PersonForm({
  person,
  connectionPeople = [],
  defaultConnectToPersonId,
  isSelf = false,
  onSubmit,
  onCancel,
  submitLabel,
}: PersonFormProps) {
  const initial = useMemo<PersonFormValue>(() => {
    if (!person) return getDefaultPersonInput()
    return {
      name: person.name,
      nickname: person.nickname ?? '',
      avatar: person.avatar ?? '',
      relationType: person.relationType,
      circle: person.circle,
      intimacy: person.intimacy,
      trust: person.trust,
      importance: person.importance,
      status: person.status,
      emotionalTone: person.emotionalTone,
      tags: [...person.tags],
      contactInfo: person.contactInfo ?? '',
      birthday: person.birthday ?? '',
      metDate: person.metDate ?? '',
      lastInteractionAt: person.lastInteractionAt ?? '',
      note: person.note ?? '',
    }
  }, [person])

  const [form, setForm] = useState<PersonFormValue>(initial)
  const [availableTags, setAvailableTags] = useState<TagItem[]>([])
  const [error, setError] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [intimacyInput, setIntimacyInput] = useState(() => toNumberInput(initial.intimacy))
  const [trustInput, setTrustInput] = useState(() => toNumberInput(initial.trust))
  const [importanceInput, setImportanceInput] = useState(() => toNumberInput(initial.importance))
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)
  const connectionOptions = [
    ...connectionPeople.filter((item) => item.isSelf),
    ...connectionPeople.filter((item) => !item.isSelf),
  ].filter((item) => !item.isSelf || !person)
  const fallbackConnectionPersonId = defaultConnectToPersonId ?? connectionOptions.find((item) => item.isSelf)?.id ?? connectionOptions[0]?.id ?? ''
  const [connectToPersonId, setConnectToPersonId] = useState(fallbackConnectionPersonId)
  const [createInitialRelationship, setCreateInitialRelationship] = useState(true)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const visibleAvailableTags = availableTags.filter((tag) => cleanVisibleTags([tag.name]).length > 0)
  const showConnectionPicker = !person && connectionOptions.length > 0
  const duplicateMatches = useMemo(
    () => findDuplicatePersons(form, connectionPeople, person?.id),
    [connectionPeople, form, person?.id],
  )

  useEffect(() => {
    setForm(initial)
    setIntimacyInput(toNumberInput(initial.intimacy))
    setTrustInput(toNumberInput(initial.trust))
    setImportanceInput(toNumberInput(initial.importance))
  }, [initial])

  useEffect(() => {
    setDuplicateConfirmed(false)
  }, [form.name, form.nickname, person?.id])

  useEffect(() => {
    setConnectToPersonId(fallbackConnectionPersonId)
  }, [fallbackConnectionPersonId])

  useEffect(() => {
    let active = true

    const run = async () => {
      const tags = await listTags()
      if (active) setAvailableTags(tags)
    }

    run().catch((err) => {
      setError(err instanceof Error ? err.message : '标签读取失败')
    })

    return () => {
      active = false
    }
  }, [])

  const update = <K extends keyof PersonFormValue>(key: K, value: PersonFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const toggleTag = (tagName: string) => {
    setForm((current) => {
      const selected = current.tags.includes(tagName)
      return {
        ...current,
        tags: selected ? current.tags.filter((item) => item !== tagName) : [...current.tags, tagName],
      }
    })
  }

  const handleSubmit = async () => {
    const cleaned = sanitizePersonInput({
      ...form,
      intimacy: parseUnsignedNumberInput(intimacyInput, 0),
      trust: parseUnsignedNumberInput(trustInput, 0),
      importance: parseUnsignedNumberInput(importanceInput, 3),
    })

    if (!cleaned.name) {
      setError('请输入人物姓名')
      return
    }

    const submitDuplicateMatches = findDuplicatePersons(cleaned, connectionPeople, person?.id)
    const hasExactDuplicate = submitDuplicateMatches.some((match) => match.risk === 'exact')

    if (hasExactDuplicate && !duplicateConfirmed) {
      setError('发现完全同名人物，请先在提示卡中确认继续保存。')
      return
    }

    setError('')
    await onSubmit(cleaned, !person ? {
      connectToPersonId: createInitialRelationship ? connectToPersonId : undefined,
      createInitialRelationship,
    } : undefined)
  }

  const handleAvatarChange = async (file?: File) => {
    if (!file) return

    try {
      setAvatarBusy(true)
      setError('')
      update('avatar', await compressImageToDataUrl(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像处理失败')
    } finally {
      setAvatarBusy(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-[1.5rem] bg-white/82 p-4 shadow-soft ring-1 ring-violet/10">
      <div className="grid gap-4">
        <div className="flex items-center gap-4 rounded-[1.25rem] bg-paper/75 p-3 ring-1 ring-violet/10">
          <PersonAvatar name={form.name || '人物'} avatar={form.avatar} seed={form.circle} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">头像</p>
            <p className="mt-1 text-xs leading-5 text-ink/55">本地压缩后保存到设备数据库，不会上传到云端。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-full bg-violet px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:bg-ink/25" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()}>
                {avatarBusy ? '处理中' : '上传头像'}
              </button>
              {form.avatar ? (
                <button type="button" className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink/70 ring-1 ring-violet/10" onClick={() => update('avatar', '')}>
                  移除
                </button>
              ) : null}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleAvatarChange(event.target.files?.[0])} />
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">姓名</span>
          <input className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">昵称</span>
          <input className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.nickname} onChange={(e) => update('nickname', e.target.value)} />
        </label>

        {form.name.trim() ? (
          <DuplicatePersonNotice
            matches={duplicateMatches}
            confirmed={duplicateConfirmed}
            onContinue={() => {
              setDuplicateConfirmed(true)
              setError('')
            }}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">关系类型</span>
            <select className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.relationType} onChange={(e) => update('relationType', e.target.value)}>
              {DEFAULT_RELATION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">圈层</span>
            <input className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.circle} onChange={(e) => update('circle', e.target.value)} />
          </label>
        </div>

        {!person ? (
          <div className="rounded-[1.25rem] bg-[#fff4f7] p-3 ring-1 ring-rose/10">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-rose"
                checked={createInitialRelationship}
                onChange={(event) => setCreateInitialRelationship(event.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-black text-ink">与我建立关系</span>
                <span className="mt-1 block text-xs leading-5 text-ink/55">
                  关闭后，该人物会作为独立人物记录，可之后再和其他人物建立关系。
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {showConnectionPicker ? (
          <div className={`rounded-[1.25rem] bg-[#fff4f7] p-3 ring-1 ring-rose/10 ${createInitialRelationship ? '' : 'opacity-55'}`}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">这个人是谁认识的</span>
              <select
                className="rounded-2xl border border-rose/10 bg-white/86 px-4 py-3 text-sm font-semibold text-ink/72 outline-none focus:border-rose/30"
                value={connectToPersonId}
                disabled={!createInitialRelationship}
                onChange={(event) => setConnectToPersonId(event.target.value)}
              >
                {connectionOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.isSelf ? '我认识的人' : `通过 ${item.name} 认识`}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              开启上方选项后，会生成“所选人物 - 新人物”的关系；默认选择我，选择别人时不会额外连一条到我。
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">亲密度</span>
            <input
              type="text"
              inputMode="numeric"
              className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35"
              value={intimacyInput}
              onChange={(e) => setIntimacyInput(sanitizeUnsignedNumberInput(e.target.value, 100))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">信任度</span>
            <input
              type="text"
              inputMode="numeric"
              className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35"
              value={trustInput}
              onChange={(e) => setTrustInput(sanitizeUnsignedNumberInput(e.target.value, 100))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">重要程度</span>
            <input
              type="text"
              inputMode="numeric"
              className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35"
              value={importanceInput}
              onChange={(e) => setImportanceInput(sanitizeUnsignedNumberInput(e.target.value, 5))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">关系状态</span>
            <select className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.status} onChange={(e) => update('status', e.target.value)}>
              {DEFAULT_RELATION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">情绪倾向</span>
          <select className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.emotionalTone} onChange={(e) => update('emotionalTone', e.target.value as PersonFormValue['emotionalTone'])}>
            {DEFAULT_EMOTIONAL_TONES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-ink">标签</span>
          {visibleAvailableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleAvailableTags.map((tag) => {
                const selected = form.tags.includes(tag.name)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rounded-full px-3 py-2 text-xs font-bold ring-1 transition active:scale-[0.97] ${selected ? 'text-ink ring-ink/10 shadow-soft' : 'bg-paper text-ink/65 ring-violet/10'}`}
                    style={selected ? { backgroundColor: tag.color } : undefined}
                    onClick={() => toggleTag(tag.name)}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-violetMist/70 px-4 py-3 text-sm text-ink/60">还没有可选标签，可以先到设置页添几个小线索。</p>
          )}
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">联系方式</span>
          <input className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.contactInfo} onChange={(e) => update('contactInfo', e.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">生日</span>
            <input type="date" className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.birthday} onChange={(e) => update('birthday', e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">认识日期</span>
            <input type="date" className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.metDate} onChange={(e) => update('metDate', e.target.value)} />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">备注</span>
          <textarea className="min-h-28 rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.note} onChange={(e) => update('note', e.target.value)} />
        </label>

        {isSelf ? (
          <p className="rounded-2xl bg-mist/70 px-4 py-3 text-xs leading-6 text-ink/65">
            这里是“我”的资料，系统会保持它不可删除。
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-3">
          <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink ring-1 ring-violet/10" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="flex-1 rounded-2xl bg-violet px-4 py-3 text-sm font-bold text-white shadow-sm" onClick={handleSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
