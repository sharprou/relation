import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { initApp } from '../features/app/initApp'
import { router } from './router'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    initApp()
      .catch((error: unknown) => {
        console.error('Failed to initialize app', error)
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-paper px-6 text-center text-ink">
        <div>
          <p className="text-lg font-extrabold">关系图谱</p>
          <p className="mt-2 text-sm font-semibold text-ink/55">正在准备本地数据</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}
