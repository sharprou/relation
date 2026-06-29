import { CalendarDays, Network, Settings, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const tabs = [
  { to: '/graph', label: '图谱', icon: Network },
  { to: '/people', label: '人物', icon: UsersRound },
  { to: '/events', label: '事件', icon: CalendarDays },
  { to: '/settings', label: '设置', icon: Settings },
]

export default function BottomTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-paper/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-soft backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-medium transition',
                isActive
                  ? 'bg-white text-ink shadow-sm ring-1 ring-clay/30'
                  : 'text-ink/55 hover:bg-white/55 hover:text-ink',
              )
            }
          >
            <Icon aria-hidden="true" className="mb-1 h-5 w-5" strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
