import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../components/common/ConfirmDialog'
import PageShell from '../components/common/PageShell'
import PersonCard from '../components/common/PersonCard'
import PersonDetail from '../components/common/PersonDetail'
import PersonForm, { type PersonFormValue } from '../components/common/PersonForm'
import { listEventsByPersonId } from '../features/events/eventService'
import { addPerson, deletePerson, getPersonById, listPeople, updatePerson } from '../features/people/peopleService'
import { getRelationshipByPersonId } from '../features/relationships/relationshipService'
import { listTags } from '../features/tags/tagService'
import type { InteractionEvent, Person, Relationship, TagItem } from '../types'
import PersonAvatar from '../components/common/PersonAvatar'
import { cleanFilterOptions, cleanVisibleTags, displayCircle, displayOptionLabel } from '../utils/display'
import {
  EMPTY_PEOPLE_FILTERS,
  filterPeopleByFilters,
  filterPeopleByKeyword,
  getUniqueOptions,
  hasActivePeopleFilters,
  type PeopleFilters,
} from '../utils/filter'

type ViewMode = 'list' | 'create' | 'edit'

export default function PeoplePage() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | undefined>(undefined)
  const [selectedEvents, setSelectedEvents] = useState<InteractionEvent[]>([])
  const [mode, setMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_PEOPLE_FILTERS)

  const refresh = async () => {
    const [personRows, tagRows] = await Promise.all([listPeople(), listTags()])
    setPeople(personRows)
    setTags(tagRows)
  }

  const loadPersonDetail = async (personId: string) => {
    const person = await getPersonById(personId)
    setSelectedPerson(person ?? null)

    if (person && !person.isSelf) {
      setSelectedRelationship(await getRelationshipByPersonId(person.id))
      setSelectedEvents(await listEventsByPersonId(person.id))
    } else {
      setSelectedRelationship(undefined)
      setSelectedEvents([])
    }
  }

  useEffect(() => {
    let active = true
    const personId = params.personId ?? searchParams.get('personId')

    const run = async () => {
      try {
        setLoading(true)
        await refresh()
        if (active) {
          if (personId) {
            await loadPersonDetail(personId)
          } else {
            setSelectedPerson(null)
            setSelectedRelationship(undefined)
            setSelectedEvents([])
          }
          setMode('list')
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : '本地数据读取失败，请稍后重试')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    run()

    return () => {
      active = false
    }
  }, [params.personId, searchParams])

  const regularPeople = useMemo(() => people.filter((person) => !person.isSelf), [people])
  const selfPerson = useMemo(() => people.find((person) => person.isSelf) ?? null, [people])
  const visiblePeople = useMemo(
    () => filterPeopleByFilters(filterPeopleByKeyword(regularPeople, keyword), filters),
    [regularPeople, keyword, filters],
  )

  const filterOptions = useMemo(() => ({
    relationTypes: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.relationType))),
    circles: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => displayCircle(person.circle)))),
    statuses: getUniqueOptions(cleanFilterOptions(regularPeople.map((person) => person.status))),
    tags: getUniqueOptions(cleanFilterOptions([...tags.map((tag) => tag.name), ...regularPeople.flatMap((person) => cleanVisibleTags(person.tags))])),
  }), [regularPeople, tags])

  const hasSearchOrFilters = Boolean(keyword.trim()) || hasActivePeopleFilters(filters)

  const setFilter = (key: keyof PeopleFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setKeyword('')
    setFilters(EMPTY_PEOPLE_FILTERS)
  }

  const openCreate = () => {
    setMode('create')
    setSelectedPerson(null)
    setSelectedRelationship(undefined)
    setSelectedEvents([])
  }

  const openDetail = async (personId: string) => {
    await loadPersonDetail(personId)
    setMode('list')
  }

  const openEdit = () => {
    setMode('edit')
  }

  const submitCreate = async (value: PersonFormValue) => {
    try {
      await addPerson(value)
      await refresh()
      setMode('list')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const submitEdit = async (value: PersonFormValue) => {
    if (!selectedPerson) return

    try {
      await updatePerson(selectedPerson.id, value)
      await refresh()
      await loadPersonDetail(selectedPerson.id)
      setMode('list')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    }
  }

  const askDelete = () => {
    if (!selectedPerson) return

    if (selectedPerson.isSelf) {
      alert('“我”节点不可删除。')
      return
    }

    setConfirmDelete(true)
  }

  const confirmDeletePerson = async () => {
    if (!selectedPerson) return

    try {
      await deletePerson(selectedPerson.id)
      setConfirmDelete(false)
      setSelectedPerson(null)
      setSelectedRelationship(undefined)
      setSelectedEvents([])
      await refresh()
      setMode('list')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const cancelCreateOrEdit = () => {
    setMode('list')
  }

  return (
    <PageShell
      eyebrow="People"
      title="人物"
      description="管理人物资料，也可以通过搜索和筛选快速找到某段关系。"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink/55">共 {regularPeople.length} 位普通人物</p>
          <button type="button" className="rounded-2xl bg-violet px-4 py-2 text-sm font-bold text-white shadow-soft" onClick={openCreate}>
            + 添加
          </button>
        </div>

        {error ? <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-rose-700 shadow-soft ring-1 ring-violet/10">{error}</div> : null}

        {mode === 'create' ? (
          <PersonForm submitLabel="保存人物" onCancel={cancelCreateOrEdit} onSubmit={submitCreate} />
        ) : null}

        {mode === 'edit' && selectedPerson ? (
          <PersonForm
            person={selectedPerson}
            isSelf={selectedPerson.isSelf}
            submitLabel="保存修改"
            onCancel={cancelCreateOrEdit}
            onSubmit={submitEdit}
          />
        ) : null}

        {mode === 'list' && !selectedPerson ? (
          <div className="space-y-3">
            <input
              className="w-full rounded-[1.1rem] border border-violet/10 bg-white/76 px-4 py-3 text-sm font-semibold outline-none shadow-soft placeholder:text-ink/35 focus:border-violet/35"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索姓名、昵称、关系、状态、标签或备注"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="rounded-2xl border border-violet/10 bg-white/76 px-3 py-2.5 text-sm font-semibold text-ink/70 outline-none" value={filters.relationType} onChange={(event) => setFilter('relationType', event.target.value)}>
                <option value="">全部关系类型</option>
                {filterOptions.relationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="rounded-2xl border border-violet/10 bg-white/76 px-3 py-2.5 text-sm font-semibold text-ink/70 outline-none" value={filters.circle} onChange={(event) => setFilter('circle', event.target.value)}>
                <option value="">全部圈层</option>
                {filterOptions.circles.map((item) => <option key={item} value={item}>{displayOptionLabel(item)}</option>)}
              </select>
              <select className="rounded-2xl border border-violet/10 bg-white/76 px-3 py-2.5 text-sm font-semibold text-ink/70 outline-none" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                <option value="">全部状态</option>
                {filterOptions.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="rounded-2xl border border-violet/10 bg-white/76 px-3 py-2.5 text-sm font-semibold text-ink/70 outline-none" value={filters.tag} onChange={(event) => setFilter('tag', event.target.value)}>
                <option value="">全部标签</option>
                {filterOptions.tags.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {hasSearchOrFilters ? (
              <button type="button" className="rounded-2xl bg-violetMist px-4 py-2 text-sm font-bold text-violet ring-1 ring-violet/10" onClick={clearFilters}>
                清空筛选
              </button>
            ) : null}
          </div>
        ) : null}

        {!selectedPerson && selfPerson ? (
          <div className="rounded-[1.35rem] bg-violetMist/75 p-4 shadow-soft ring-1 ring-violet/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar name={selfPerson.name} avatar={selfPerson.avatar} seed={selfPerson.circle} className="h-12 w-12 text-lg" />
                <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet">我的资料</p>
                <p className="mt-1 text-lg font-semibold text-ink">{selfPerson.name}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {selfPerson.relationType} · {displayCircle(selfPerson.circle)}
                </p>
                </div>
              </div>
              <button type="button" className="shrink-0 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-ink shadow-soft ring-1 ring-violet/10" onClick={() => loadPersonDetail(selfPerson.id)}>
                查看
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'list' && selectedPerson ? (
          <PersonDetail person={selectedPerson} relationship={selectedRelationship} events={selectedEvents} onEdit={openEdit} onDelete={askDelete} />
        ) : null}

        {mode === 'list' && !selectedPerson && visiblePeople.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink/55">普通人物</p>
            <div className="grid gap-3">
              {visiblePeople.map((person) => (
                <PersonCard key={person.id} person={person} onOpen={openDetail} />
              ))}
            </div>
          </div>
        ) : null}

        {mode === 'list' && !loading && regularPeople.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/88 p-6 text-center shadow-soft ring-1 ring-violet/10">
            <p className="text-base font-medium text-ink">你的人物关系图谱还是空的。</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">先添加第一个人物吧。</p>
            <div className="mt-4">
              <button type="button" className="rounded-2xl bg-violet px-4 py-3 text-sm font-medium text-white" onClick={openCreate}>
                添加人物
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'list' && !loading && regularPeople.length > 0 && visiblePeople.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white/88 p-6 text-center shadow-soft ring-1 ring-violet/10">
            <p className="text-base font-medium text-ink">没有找到相关人物。</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">试试换个关键词，或清空筛选条件。</p>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmDelete}
          title="删除人物"
          message="删除后将移除该人物资料，并同步删除相关关系。是否继续？"
          confirmLabel="删除"
          cancelLabel="取消"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={confirmDeletePerson}
        />
      </div>
    </PageShell>
  )
}
