import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { initApp } from '../features/app/initApp'
import { router } from './router'

export default function App() {
  useEffect(() => {
    initApp().catch((error: unknown) => {
      console.error('Failed to initialize app', error)
    })
  }, [])

  return <RouterProvider router={router} />
}
