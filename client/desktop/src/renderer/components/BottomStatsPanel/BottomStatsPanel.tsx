import OilStatsList from '@/pages/DashboardPage/OilStatsList'
import styles from './BottomStatsPanel.module.css'

export default function BottomStatsPanel() {
  return (
    <div className={styles.panel}>
      <OilStatsList />
    </div>
  )
}
