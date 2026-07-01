import type { NodeProps } from '@xyflow/react'

export interface IslandFrameNodeData {
  title: string
  stats: string
  kind: 'self' | 'network' | 'isolated'
  width: number
  height: number
}

const labelToneClass: Record<IslandFrameNodeData['kind'], string> = {
  self: 'text-rose ring-rose/16',
  network: 'text-ink/70 ring-rose/12',
  isolated: 'text-[#438b73] ring-[#a8dfcc]/30',
}

export default function IslandFrameNode({ data }: NodeProps) {
  const island = data as unknown as IslandFrameNodeData
  const width = Number.isFinite(island.width) ? island.width : 380
  const height = Number.isFinite(island.height) ? island.height : 300
  const kind = island.kind ?? 'network'

  return (
    <div
      className="pointer-events-none relative"
      style={{ width, height }}
    >
      <button
        type="button"
        className={`pointer-events-auto absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-full bg-white/76 px-3 py-2 text-left shadow-[0_8px_20px_rgba(218,116,139,0.07)] ring-1 backdrop-blur transition active:scale-[0.98] ${labelToneClass[kind]}`}
      >
        <span className="block truncate text-[12px] font-black leading-4">{island.title}</span>
        <span className="mt-0.5 block truncate text-[10px] font-bold leading-3 text-ink/46">{island.stats}</span>
      </button>
    </div>
  )
}
