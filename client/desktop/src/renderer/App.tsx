import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from '@/components/layout/AppLayout'
import ArcNextSegmentModal from '@/components/ArcNextSegmentModal/ArcNextSegmentModal'
import ConnectionBanner from '@/components/ConnectionBanner/ConnectionBanner'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import VirtualKeyboard from '@/components/KeyboardModal/VirtualKeyboard'
import { subscribeToBackend } from '@/bootstrap/subscribeToBackend'

import SplashPage from '@/pages/SplashPage/SplashPage'
import LoginPage from '@/pages/LoginPage/LoginPage'
import DashboardPage from '@/pages/DashboardPage/DashboardPage'
import SettingsPage from '@/pages/SettingsPage/SettingsPage'
import WelcomeMessagePage from '@/pages/WelcomeMessagePage/WelcomeMessagePage'
import WarrantyPage from '@/pages/WarrantyPage/WarrantyPage'
import MaintenancePage from '@/pages/MaintenancePage/MaintenancePage'
import ChecklistPage from '@/pages/ChecklistPage/ChecklistPage'
import BigDataConnectionPage from '@/pages/BigDataConnectionPage/BigDataConnectionPage'
import UserManagementPage from '@/pages/UserManagementPage/UserManagementPage'
import DefaultSpeedsPage from '@/pages/DefaultSpeedsPage/DefaultSpeedsPage'
import EncoderResetPage from '@/pages/EncoderResetPage/EncoderResetPage'
import ErrorReportsPage from '@/pages/ErrorReportsPage/ErrorReportsPage'
import MachineUsageHoursPage from '@/pages/MachineUsageHoursPage/MachineUsageHoursPage'
import BendingCountReportPage from '@/pages/BendingCountReportPage/BendingCountReportPage'
import LanguagePage from '@/pages/LanguagePage/LanguagePage'
import CertificateQueryPage from '@/pages/CertificateQueryPage/CertificateQueryPage'
import CustomerChangePage from '@/pages/CustomerChangePage/CustomerChangePage'
import MachineTransferPage from '@/pages/MachineTransferPage/MachineTransferPage'
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
import ServiceHomePage from '@/pages/ServicePage/ServiceHomePage'
import TicketListPage from '@/pages/ServicePage/TicketListPage'
import ServiceRequestsPage from '@/pages/ServicePage/ServiceRequestsPage'
import ServiceRequestFormPage from '@/pages/ServicePage/ServiceRequestFormPage'
import ServiceRequestDetailPage from '@/pages/ServicePage/ServiceRequestDetailPage'
import InstallationPage from '@/pages/ServicePage/InstallationPage'
import TrainingPage from '@/pages/ServicePage/TrainingPage'
import TrainingTopicPage from '@/pages/ServicePage/TrainingTopicPage'
import TrainingQuizPage from '@/pages/ServicePage/TrainingQuizPage'
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
      {/* Arc interactive flow — backend awaitingArcSegmentInput=true gönderince
          rotadan bağımsız global modal açılır, R/α/L sorar, DataApi'ye gönderir. */}
      <ArcNextSegmentModal />
      {/* Global sanal klavye — her text/textarea odaklanınca otomatik açılır.
          Bypass: input'a data-no-keyboard="true" koy. Number input'lar NumpadModal'a bırakılır. */}
      <VirtualKeyboard />
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
            <Route path="settings/welcome-message" element={<WelcomeMessagePage />} />
            <Route path="settings/warranty" element={<WarrantyPage />} />
            <Route path="settings/maintenance" element={<MaintenancePage />} />
            <Route path="settings/checklist" element={<ChecklistPage />} />
            <Route path="settings/big-data" element={<BigDataConnectionPage />} />
            <Route path="settings/users" element={<UserManagementPage />} />
            <Route path="settings/default-speeds" element={<DefaultSpeedsPage />} />
            <Route path="settings/encoder-reset" element={<EncoderResetPage />} />
            <Route path="settings/error-reports" element={<ErrorReportsPage />} />
            <Route path="settings/machine-hours" element={<MachineUsageHoursPage />} />
            <Route path="settings/bending-count" element={<BendingCountReportPage />} />
            <Route path="settings/language" element={<LanguagePage />} />
            <Route path="settings/certificate" element={<CertificateQueryPage />} />
            <Route path="settings/customer-change" element={<CustomerChangePage />} />
            <Route path="settings/machine-transfer" element={<MachineTransferPage />} />
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

            {/* Service modülü — SEKIL 31-53 */}
            <Route path="service" element={<ServiceHomePage />} />
            <Route
              path="service/questions"
              element={<TicketListPage type="question" />}
            />
            <Route
              path="service/suggestions"
              element={<TicketListPage type="suggestion" />}
            />
            <Route
              path="service/complaints"
              element={<TicketListPage type="complaint" />}
            />
            <Route path="service/requests" element={<ServiceRequestsPage />} />
            <Route path="service/requests/new" element={<ServiceRequestFormPage />} />
            <Route path="service/requests/:id" element={<ServiceRequestDetailPage />} />
            <Route path="service/installation" element={<InstallationPage />} />
            <Route path="service/training" element={<TrainingPage />} />
            <Route path="service/training/topic/:id" element={<TrainingTopicPage />} />
            <Route path="service/training/quiz/:id" element={<TrainingQuizPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
