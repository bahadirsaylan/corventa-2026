import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.subtitle}>
        Welcome to Corventa Desktop. Screens will be implemented here.
      </p>
    </div>
  )
}
