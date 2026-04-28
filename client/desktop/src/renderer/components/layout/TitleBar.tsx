import styles from './TitleBar.module.css'

export default function TitleBar() {
  return (
    <div className={styles.titlebar}>
      {/* macOS traffic lights occupy the left ~80px when titleBarStyle="hiddenInset" */}
      <div className={styles.drag} />
      <span className={styles.title}>Corventa Desktop</span>
      <div className={styles.drag} />
    </div>
  )
}
