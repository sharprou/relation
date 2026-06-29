import { Outlet } from 'react-router-dom'
import BottomTabBar from './BottomTabBar'

export default function AppLayout() {
  return (
    <div className="min-h-[100dvh] text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-x-hidden bg-[linear-gradient(90deg,rgba(239,113,147,0.026)_1px,transparent_1px),linear-gradient(rgba(239,113,147,0.026)_1px,transparent_1px),linear-gradient(180deg,#fffdfd_0%,#fff8fa_70%,#fff2f5_100%)] bg-[length:24px_24px,24px_24px,auto] shadow-none sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:shadow-lift">
        <main className="flex-1 px-4 pb-28 pt-4">
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  )
}
