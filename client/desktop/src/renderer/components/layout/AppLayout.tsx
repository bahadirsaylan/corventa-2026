import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
import KioskExitCorner from '@/components/KioskExitCorner/KioskExitCorner'
import { startBendingActivityPoller, useBendingActive } from '@/stores/bendingActivityStore'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  // "Otomatik büküm aktif mi?" izleyicisi — uygulama boyunca tek örnek.
  useEffect(() => startBendingActivityPoller(), [])
  const bendingActive = useBendingActive()

  return (
    <div className={styles.root}>
      {/* Üst alan — normalde sayfalar; otomatik büküm sırasında top pozisyon/ilerleme monitörü.
          Büküm modalları (segment, ölçüm hatası) App.tsx'te global — bu değişimden etkilenmez. */}
      <div className={styles.top}>
        {bendingActive ? <BendingBallsPanel variant="monitor" /> : <Outlet />}
      </div>

      {/* Orta alan — başlık + manuel tuş takımı (her zaman sabit) */}
      <main className={styles.middle}>
        <BendingBallsPanel variant="control" />
      </main>

      {/* Alt alan — uyarı şeridi + sensör kartları */}
      <div className={styles.bottom}>
        <BottomStatsPanel />
      </div>

      {/* Kiosk moddan cikis: sag ust kose gizli hot-spot (5-tap veya 5sn basili tut).
          Klavye Ctrl+Alt+Shift+X global shortcut main process'te — bu component'ten bagimsiz. */}
      <KioskExitCorner />
    </div>
  )
}
