import { useEffect, useMemo, useRef, useState } from 'react'
import type { Person, TagItem } from '../../types'
import { getDefaultPersonInput, sanitizePersonInput } from '../../features/people/peopleService'
import { listTags } from '../../features/tags/tagService'
import { DEFAULT_EMOTIONAL_TONES, DEFAULT_RELATION_STATUSES, DEFAULT_RELATION_TYPES } from '../../utils/constants'
import { cleanVisibleTags } from '../../utils/display'
import { compressImageToDataUrl } from '../../utils/image'
import PersonAvatar from './PersonAvatar'

export type PersonFormValue = ReturnType<typeof getDefaultPersonInput>

interface PersonFormProps {
  person?: Person
  isSelf?: boolean
  onSubmit: (value: PersonFormValue) => void | Promise<void>
  onCancel: () => void
  submitLabel: string
}

export default function PersonForm({ person, isSelf = false, onSubmit, onCancel, submitLabel }: PersonFormProps) {
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
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const visibleAvailableTags = availableTags.filter((tag) => cleanVisibleTags([tag.name]).length > 0)

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
    const cleaned = sanitizePersonInput(form)

    if (!cleaned.name) {
      setError('请输入人物姓名')
      return
    }

    setError('')
    await onSubmit(cleaned)
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">亲密度</span>
            <input type="number" min={0} max={100} className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.intimacy} onChange={(e) => update('intimacy', Number(e.target.value))} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">信任度</span>
            <input type="number" min={0} max={100} className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.trust} onChange={(e) => update('trust', Number(e.target.value))} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">重要程度</span>
            <input type="number" min={1} max={5} className="rounded-2xl border border-violet/10 bg-paper/85 px-4 py-3 outline-none focus:border-violet/35" value={form.importance} onChange={(e) => update('importance', Number(e.target.value))} />
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
            <p className="rounded-2xl bg-violetMist/70 px-4 py-3 text-sm text-ink/60">暂无标签，请先到设置页新增。</p>
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
