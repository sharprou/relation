import PersonAvatar from '../../components/common/PersonAvatar'
import type { Person, Relationship } from '../../types'
import { displayCircle } from '../../utils/display'

interface RelationshipDetailSheetProps {
  relationship: Relationship
  people: Person[]
  onClose: () => void
  onEdit: (relationship: Relationship) => void
  onDelete: (relationship: Relationship) => void
}

function findPerson(people: Person[], personId: string): Person | undefined {
  return people.find((person) => person.id === personId)
}

export default function RelationshipDetailSheet({
  relationship,
  people,
  onClose,
  onEdit,
  onDelete,
}: RelationshipDetailSheetProps) {
  const sourcePerson = findPerson(people, relationship.sourcePersonId)
  const targetPerson = findPerson(people, relationship.targetPersonId)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/28 p-4 sm:items-center">
      <div className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-[1.6rem] bg-[#fff9fa] p-4 shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Relationship</p>
            <h2 className="mt-1 text-lg font-black text-ink">关系详情</h2>
          </div>
          <button type="button" className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink shadow-soft ring-1 ring-rose/10" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 rounded-[1.25rem] bg-white/78 px-3 py-4 ring-1 ring-rose/8">
          <PersonBadge person={sourcePerson} fallback="人物 A" />
          <span className="rounded-full bg-[#ffe5ec] px-3 py-1 text-xs font-black text-rose">连接</span>
          <PersonBadge person={targetPerson} fallback="人物 B" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ['关系类型', relationship.type],
            ['圈层', sourcePerson?.circle === targetPerson?.circle ? displayCircle(sourcePerson?.circle ?? '') : `${displayCircle(sourcePerson?.circle ?? '')} / ${displayCircle(targetPerson?.circle ?? '')}`],
            ['亲密度', String(relationship.intimacy)],
            ['信任度', String(relationship.trust)],
            ['状态', relationship.status],
            ['情绪倾向', relationship.emotionalTone],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-paper/85 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-ink/45">{label}</p>
              <p className="mt-1 truncate text-sm font-black text-ink">{value || '未填写'}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl bg-white/78 px-3 py-3 ring-1 ring-rose/8">
          <p className="text-[11px] font-semibold text-ink/45">备注</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/66">{relationship.note || '还没有备注。'}</p>
        </div>

        <div className="mt-4 flex gap-3">
          <button type="button" className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink shadow-soft ring-1 ring-rose/10" onClick={() => onEdit(relationship)}>
            编辑关系
          </button>
          <button type="button" className="flex-1 rounded-2xl bg-rose px-4 py-3 text-sm font-black text-white shadow-soft" onClick={() => onDelete(relationship)}>
            删除关系
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonBadge({ person, fallback }: { person?: Person; fallback: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <PersonAvatar name={person?.isSelf ? '我' : person?.name ?? fallback} avatar={person?.avatar} seed={person?.circle ?? fallback} className="mx-auto h-14 w-14 text-lg" />
      <p className="mt-2 truncate text-sm font-black text-ink">{person?.isSelf ? '我' : person?.name ?? fallback}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-ink/48">{person?.relationType ?? '未知关系'}</p>
    </div>
  )
}
