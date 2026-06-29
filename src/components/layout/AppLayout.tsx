import { Outlet } from 'react-router-dom'
import BottomTabBar from './BottomTabBar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6">
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  )
}
