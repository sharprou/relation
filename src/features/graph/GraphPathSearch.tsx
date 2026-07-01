import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import PersonAvatar from '../../components/common/PersonAvatar'
import type { Person, Relationship } from '../../types'
import { displayCircle } from '../../utils/display'
import { findShortestPath, type HighlightedPath } from './pathSearch'

interface GraphPathSearchProps {
  people: Person[]
  relationships: Relationship[]
  defaultStartPersonId?: string
  onPathFound: (path: HighlightedPath) => void
  onClearPath: () => void
}

function getPersonLabel(person?: Person): string {
  if (!person) return '未选择'
  return person.isSelf ? '我' : person.name
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function buildPathText(path: HighlightedPath, peopleById: Map<string, Person>): string {
  return path.personIds.map((personId) => getPersonLabel(peopleById.get(personId))).join(' → ')
}

export default function GraphPathSearch({
  people,
  relationships,
  defaultStartPersonId,
  onPathFound,
  onClearPath,
}: GraphPathSearchProps) {
  const [open, setOpen] = useState(false)
  const [startPersonId, setStartPersonId] = useState(defaultStartPersonId ?? '')
  const [endPersonId, setEndPersonId] = useState('')
  const [startKeyword, setStartKeyword] = useState('')
  const [endKeyword, setEndKeyword] = useState('')
  const [resultText, setResultText] = useState('')
  const [resultTone, setResultTone] = useState<'success' | 'hint' | 'empty'>('hint')
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const orderedPeople = useMemo(() => [
    ...people.filter((person) => person.isSelf),
    ...people.filter((person) => !person.isSelf),
  ], [people])

  useEffect(() => {
    if (!startPersonId && defaultStartPersonId) setStartPersonId(defaultStartPersonId)
  }, [defaultStartPersonId, startPersonId])

  const runSearch = () => {
    if (!startPersonId || !endPersonId) {
      setResultTone('hint')
      setResultText('先选择起点和终点，再看看这段关系怎么连起来。')
      return
    }

    if (startPersonId === endPersonId) {
      onClearPath()
      setResultTone('hint')
      setResultText('起点和终点是同一个人物。')
      return
    }

    const path = findShortestPath(people, relationships, startPersonId, endPersonId)

    if (!path) {
      onClearPath()
      setResultTone('empty')
      setResultText('他们暂时不在同一个关系圈里。可以先为他们添加共同认识的人，或者建立一条关系。')
      return
    }

    onPathFound(path)
    setResultTone('success')
    setResultText(`找到 ${path.relationshipIds.length} 段关系：${buildPathText(path, peopleById)}`)
  }

  const clearPath = () => {
    onClearPath()
    setResultTone('hint')
    setResultText('高亮已清除，可以继续查另一条关系路径。')
  }

  return (
    <>
      <button
        type="button"
        className="shrink-0 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-black text-ink/68 shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 ring-rose/10 transition active:scale-[0.98]"
        onClick={() => setOpen(true)}
      >
        查路径
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/28 p-4 sm:items-center">
          <div className="max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-[1.6rem] bg-[#fff9fa] shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
            <div className="flex items-start justify-between gap-3 border-b border-rose/10 px-4 py-3.5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Path</p>
                <h2 className="mt-1 text-lg font-black text-ink">关系路径搜索</h2>
                <p className="mt-1 text-xs leading-5 text-ink/52">看看两个人之间通过哪些关系连在一起。</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink shadow-soft ring-1 ring-rose/10"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </div>

            <div className="max-h-[70dvh] overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <PersonPathPicker
                  title="起点"
                  keyword={startKeyword}
                  selectedPersonId={startPersonId}
                  people={orderedPeople}
                  onKeywordChange={setStartKeyword}
                  onSelect={setStartPersonId}
                />
                <PersonPathPicker
                  title="终点"
                  keyword={endKeyword}
                  selectedPersonId={endPersonId}
                  people={orderedPeople}
                  onKeywordChange={setEndKeyword}
                  onSelect={setEndPersonId}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-2xl bg-rose px-4 py-3 text-sm font-black text-white shadow-soft" onClick={runSearch}>
                  搜索路径
                </button>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink/66 ring-1 ring-rose/10" onClick={clearPath}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  清除高亮
                </button>
              </div>

              {resultText ? (
                <div className={`mt-4 rounded-[1.2rem] px-4 py-3 text-sm font-semibold leading-6 ring-1 ${resultTone === 'success' ? 'bg-[#fff0f4] text-rose ring-rose/12' : resultTone === 'empty' ? 'bg-white text-ink/62 ring-rose/10' : 'bg-violetMist/70 text-violet ring-violet/10'}`}>
                  {resultText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function PersonPathPicker({
  title,
  keyword,
  selectedPersonId,
  people,
  onKeywordChange,
  onSelect,
}: {
  title: string
  keyword: string
  selectedPersonId: string
  people: Person[]
  onKeywordChange: (value: string) => void
  onSelect: (personId: string) => void
}) {
  const normalizedKeyword = normalizeSearch(keyword)
  const filteredPeople = people.filter((person) => {
    if (!normalizedKeyword) return true

    return [
      person.name,
      person.nickname ?? '',
      person.relationType,
      person.circle,
    ].join(' ').toLocaleLowerCase().includes(normalizedKeyword)
  })
  const selectedPerson = people.find((person) => person.id === selectedPersonId)

  return (
    <section className="rounded-[1.2rem] bg-white/74 p-3 ring-1 ring-rose/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-ink">{title}</p>
        <span className="max-w-[9rem] truncate rounded-full bg-[#ffe8ee] px-2.5 py-1 text-[11px] font-black text-rose">
          {getPersonLabel(selectedPerson)}
        </span>
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-2xl bg-paper/85 px-3 py-2 ring-1 ring-rose/8">
        <Search className="h-4 w-4 shrink-0 text-rose/70" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink/35"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="搜索人物"
        />
      </label>

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {filteredPeople.map((person) => {
          const selected = person.id === selectedPersonId

          return (
            <button
              key={person.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded-[1rem] px-2.5 py-2 text-left ring-1 transition ${selected ? 'bg-[#ffe8ee] ring-rose/18' : 'bg-white/70 ring-rose/8 active:bg-[#fff3f6]'}`}
              onClick={() => onSelect(person.id)}
            >
              <PersonAvatar name={person.isSelf ? '我' : person.name} avatar={person.avatar} seed={person.circle} className="h-9 w-9 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{person.isSelf ? '我' : person.name}</p>
                <p className="truncate text-xs font-semibold text-ink/50">{person.relationType} · {displayCircle(person.circle)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
