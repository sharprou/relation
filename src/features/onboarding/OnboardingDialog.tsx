interface OnboardingDialogProps {
  open: boolean
  onStartAddPerson: () => void
  onLoadSample: () => void
  onDismiss: () => void
}

const GUIDE_ITEMS = [
  '添加与你有关的人，会形成“我的关系圈”。',
  '关闭“与我建立关系”，可以记录你只是知道的人。',
  '在“全部关系岛”里，可以看到不同关系圈。',
  '路径搜索可以查看两个人之间通过谁连接。',
] as const

export default function OnboardingDialog({
  open,
  onStartAddPerson,
  onLoadSample,
  onDismiss,
}: OnboardingDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[1.7rem] bg-[#fff9fa] p-5 shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Welcome</p>
        <h2 className="mt-1 text-2xl font-black text-ink">欢迎来到关系图谱</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">
          这里可以记录你和他人的关系，也可以记录与你无直接关系的独立圈子。
        </p>

        <div className="mt-4 grid gap-2">
          {GUIDE_ITEMS.map((item) => (
            <p key={item} className="rounded-[1rem] bg-white/76 px-3 py-2.5 text-sm font-semibold leading-6 text-ink/65 ring-1 ring-rose/8">
              {item}
            </p>
          ))}
        </div>

        <div className="mt-5 grid gap-2">
          <button type="button" className="rounded-2xl bg-rose px-4 py-3 text-sm font-black text-white shadow-soft" onClick={onStartAddPerson}>
            开始添加人物
          </button>
          <button type="button" className="rounded-2xl bg-violetMist px-4 py-3 text-sm font-black text-violet ring-1 ring-violet/10" onClick={onLoadSample}>
            载入示例图谱
          </button>
          <button type="button" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink/64 ring-1 ring-rose/10" onClick={onDismiss}>
            稍后再说
          </button>
        </div>
      </div>
    </div>
  )
}
