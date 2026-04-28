import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SplashPage from '@/pages/SplashPage/SplashPage'
import LoginPage from '@/pages/LoginPage/LoginPage'
import DashboardPage from '@/pages/DashboardPage/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Auth / pre-login screens — full screen, no chrome */}
        <Route index element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated 3-zone shell */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          {/* Future middle-zone screens (bending/ai, bending/manual, settings…) go here */}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}
