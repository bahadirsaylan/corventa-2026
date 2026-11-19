// GLOBAL UYARI KUYRUĞU — tek bağlama noktası (AppLayout). Kuyruğa katılan pencereler burada çizilir;
// hangisinin görüneceğine alertQueueStore karar verir (aynı anda TEK pencere, öncelik sırası):
//   güvenlik (ileride) > YAĞ KİRLİLİK > BAKIM UYARISI / KİLİDİ > BAKIM MODU HATIRLATMASI > BAKIM MODU OTOMATİK
//   KAPATILDI > KARŞILAMA MESAJI > bilgi
// Önleme yok: görünen pencere kapanınca sıradaki (en yüksek öncelikli) açılır.
// DURAKLATMA: otomatik büküm sürerken, büküme ait global modal (çok açılı segment girişi / ölçüm hatası) açıkken
// ve büküm akışının alarm / tahliye / parça yükleme / sonuç ekranlarında kuyruk penceresi gösterilmez — büküm
// modalları kuyruğa girmez, hiç gecikmez. Büküm bitince bekleyen uyarılar sırayla açılır.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import WelcomeOverlay from '@/components/WelcomeOverlay/WelcomeOverlay'
import MaintenanceAlertOverlay from '@/components/MaintenanceAlertOverlay/MaintenanceAlertOverlay'
import MaintenanceReminderOverlay from '@/components/MaintenanceReminderOverlay/MaintenanceReminderOverlay'
import ContaminationAlertOverlay from '@/components/ContaminationAlertOverlay/ContaminationAlertOverlay'
import { setAlertQueuePaused } from '@/stores/alertQueueStore'
import { useContaminationWatcher } from '@/stores/contaminationStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useSessionStore } from '@/stores/sessionStore'

/** Büküm akışı ekranları — uyarı penceresi açılmaz (operatör parçayla / alarmla meşgul) */
const PAUSE_PATH_PREFIXES = ['/bending/alarm', '/bending/unload', '/bending/part-loading', '/bending/result']

export default function AlertQueueHost() {
  const { pathname } = useLocation()
  const bendingActive = useBendingActive()
  const bendingModal = useMachineStateStore((s) => {
    const p = s.bendingProgress
    return !!(p?.awaitingArcSegmentInput || p?.awaitingMeasurementRetry || p?.awaitingMeasurementFinalDecision)
  })
  const loggedIn = useSessionStore((s) => s.username != null)
  const onBendingScreen = PAUSE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const paused = bendingActive || bendingModal || onBendingScreen

  useEffect(() => setAlertQueuePaused(paused), [paused])
  useContaminationWatcher(loggedIn)

  return (
    <>
      <ContaminationAlertOverlay />
      <MaintenanceAlertOverlay />
      <MaintenanceReminderOverlay />
      <WelcomeOverlay />
    </>
  )
}
