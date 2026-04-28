import { Outlet } from 'react-router-dom'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
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
    </div>
  )
}
