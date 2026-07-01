import { HelpCircle } from 'lucide-react'

interface GraphHelpDialogProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
}

const HELP_ITEMS = [
  ['我的关系', '只看与你直接相关的人。'],
  ['人物视角', '以某个人为中心查看 TA 的关系圈。'],
  ['全部关系岛', '查看所有独立关系圈，包括与你无直接关系的人。'],
  ['亲密度模式', '线条颜色代表亲密度。'],
  ['信任度模式', '线条颜色代表信任度。'],
  ['路径搜索', '查找两个人之间通过哪些关系连接。'],
] as const

export default function GraphHelpDialog({ open, onOpen, onClose }: GraphHelpDialogProps) {
  return (
    <>
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-[0_12px_24px_rgba(218,116,139,0.10)] ring-1 ring-rose/10"
        onClick={onOpen}
        aria-label="图谱说明"
      >
        <HelpCircle className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/28 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[1.6rem] bg-[#fff9fa] p-4 shadow-[0_24px_60px_rgba(80,40,55,0.24)] ring-1 ring-rose/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose/70">Guide</p>
                <h2 className="mt-1 text-lg font-black text-ink">怎么看这张图</h2>
              </div>
              <button type="button" className="rounded-full bg-white px-3 py-2 text-xs font-bold text-ink shadow-soft ring-1 ring-rose/10" onClick={onClose}>
                关闭
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {HELP_ITEMS.map(([title, text]) => (
                <div key={title} className="rounded-[1rem] bg-white/78 px-3 py-2.5 ring-1 ring-rose/8">
                  <p className="text-sm font-black text-ink">{title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/56">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
