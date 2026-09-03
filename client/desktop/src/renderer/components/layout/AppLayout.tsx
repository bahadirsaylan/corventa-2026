import { Outlet } from 'react-router-dom'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
import KioskExitCorner from '@/components/KioskExitCorner/KioskExitCorner'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  return (
    <div className={styles.root}>
      {/* Top zone — always visible bending positions (750px) */}
      <div className={styles.top}>
        <Outlet />
      </div>

      {/* Middle zone — navigable screens (750px) */}
      <main className={styles.middle}>
        <BendingBallsPanel />
      </main>

      {/* Bottom zone — always visible machine stats (480px) */}
      <div className={styles.bottom}>
        <BottomStatsPanel />
      </div>

      {/* Kiosk moddan cikis: sag ust kose gizli hot-spot (5-tap veya 5sn basili tut).
          Klavye Ctrl+Alt+Shift+X global shortcut main process'te — bu component'ten bagimsiz. */}
      <KioskExitCorner />
    </div>
  )
}
