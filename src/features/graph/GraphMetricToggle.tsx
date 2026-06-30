import type { GraphLineMetric } from './graphStyle'

interface GraphMetricToggleProps {
  value: GraphLineMetric
  onChange: (value: GraphLineMetric) => void
}

const options: Array<{ value: GraphLineMetric; label: string }> = [
  { value: 'intimacy', label: '按亲密度' },
  { value: 'trust', label: '按信任度' },
]

export default function GraphMetricToggle({ value, onChange }: GraphMetricToggleProps) {
  return (
    <div className="flex shrink-0 rounded-full bg-white/78 p-1 shadow-[0_10px_22px_rgba(218,116,139,0.08)] ring-1 ring-rose/10">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-black transition active:scale-[0.98] ${value === option.value ? 'bg-[#ffe3ec] text-rose shadow-[0_8px_18px_rgba(218,116,139,0.12)]' : 'text-ink/55'}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
