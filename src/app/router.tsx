import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import EventsPage from '../pages/EventsPage'
import GraphPage from '../pages/GraphPage'
import PeoplePage from '../pages/PeoplePage'
import SettingsPage from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/graph" replace /> },
      { path: 'graph', element: <GraphPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'people/:personId', element: <PeoplePage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
