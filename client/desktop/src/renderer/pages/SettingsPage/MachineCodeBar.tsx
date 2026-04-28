import styles from './MachineCodeBar.module.css'

interface Props {
  machineCode?: string
  aiModuleCode?: string
}

export default function MachineCodeBar({
  machineCode = '2AN-400-001',
  aiModuleCode = 'K-400-001',
}: Props) {
  return (
    <div className={styles.bar}>
      {/* Left — machine code */}
      <div className={styles.side}>
        <span className={styles.label}>MACHINE CODE :</span>
        <span className={styles.value}>{machineCode}</span>
      </div>

      {/* Center — gear icon placeholder (icon lives in SettingsHeader below) */}
      <div className={styles.centerGap} />

      {/* Right — AI module code */}
      <div className={`${styles.side} ${styles.sideRight}`}>
        <span className={styles.label}>AI MODULE CODE :</span>
        <span className={styles.value}>{aiModuleCode}</span>
      </div>
    </div>
  )
}
