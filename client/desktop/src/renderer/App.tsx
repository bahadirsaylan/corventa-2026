import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from '@/components/layout/AppLayout'
import ConnectionBanner from '@/components/ConnectionBanner/ConnectionBanner'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { subscribeToBackend } from '@/bootstrap/subscribeToBackend'

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
import ManuelBendingPage from '@/pages/ManuelBendingPage/ManuelBendingPage'
import ManuelProgramEditorPage from '@/pages/ManuelProgramEditorPage/ManuelProgramEditorPage'
import ManuelBendingRunPage from '@/pages/ManuelBendingRunPage/ManuelBendingRunPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  // Backend IPC subscription'larını bir kez kur — preload bridge ready
  useEffect(() => {
    const unsubscribe = subscribeToBackend()
    return unsubscribe
  }, [])

  return (
    <ErrorBoundary>
      <ConnectionBanner />
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

            {/* Manuel Bending */}
            <Route path="bending/manual" element={<ManuelBendingPage />} />
            <Route
              path="bending/manual/edit/:programNo"
              element={<ManuelProgramEditorPage />}
            />
            <Route
              path="bending/manual/run/:programNo"
              element={<ManuelBendingRunPage />}
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
