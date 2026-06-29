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
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-rose/10 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(218,116,139,0.08)] backdrop-blur-xl sm:bottom-4 sm:rounded-b-[2rem]">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex min-h-[58px] flex-col items-center justify-center rounded-[1.2rem] px-2 py-2 text-xs font-semibold transition active:scale-[0.97]',
                isActive
                  ? 'bg-[#ffe8ee] text-rose shadow-[0_10px_20px_rgba(239,113,147,0.14)] ring-1 ring-rose/10'
                  : 'text-ink/50 hover:bg-[#fff0f3] hover:text-rose',
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
