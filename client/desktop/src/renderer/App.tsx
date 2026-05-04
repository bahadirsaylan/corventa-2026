import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SplashPage from '@/pages/SplashPage/SplashPage'
import LoginPage from '@/pages/LoginPage/LoginPage'
import DashboardPage from '@/pages/DashboardPage/DashboardPage'
import SettingsPage from '@/pages/SettingsPage/SettingsPage'
import AiBendingPage from '@/pages/AiBendingPage/AiBendingPage'
import BendingDirectionPage from '@/pages/BendingDirectionPage/BendingDirectionPage'
import BendingMethodPage from '@/pages/BendingMethodPage/BendingMethodPage'
import RingBendingMeasurementsPage from '@/pages/RingBendingMeasurementsPage/RingBendingMeasurementsPage'
import ArcBendingMeasurementsPage from '@/pages/ArcBendingMeasurementsPage/ArcBendingMeasurementsPage'
import SpiralBendingMeasurementsPage from '@/pages/SpiralBendingMeasurementsPage/SpiralBendingMeasurementsPage'
import SivamaBendingMeasurementsPage from '@/pages/SivamaBendingMeasurementsPage/SivamaBendingMeasurementsPage'
import PartLoadingPage from '@/pages/PartLoadingPage/PartLoadingPage'
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
          <Route path="settings" element={<SettingsPage />} />
          <Route path="bending/ai" element={<AiBendingPage />} />
          <Route path="bending/ai/direction" element={<BendingDirectionPage />} />
          <Route path="bending/ai/method" element={<BendingMethodPage />} />
          <Route path="bending/ai/measurements/ring" element={<RingBendingMeasurementsPage />} />
          <Route path="bending/ai/measurements/arc" element={<ArcBendingMeasurementsPage />} />
          <Route path="bending/ai/measurements/spiral" element={<SpiralBendingMeasurementsPage />} />
          <Route path="bending/ai/measurements/sivama" element={<SivamaBendingMeasurementsPage />} />
          <Route path="bending/ai/part-loading" element={<PartLoadingPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}
