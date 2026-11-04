import { useT } from '@/i18n'
import styles from './MachineCodeBar.module.css'

interface Props {
  machineCode?: string
  aiModuleCode?: string
}

export default function MachineCodeBar({
  machineCode = '2AN-400-001',
  aiModuleCode = 'K-400-001',
}: Props) {
  const t = useT()
  return (
    <div className={styles.bar}>
      {/* Left — machine code */}
      <div className={styles.side}>
        <span className={styles.label}>{t('MAKİNE KODU :')}</span>
        <span className={styles.value}>{machineCode}</span>
      </div>

      {/* Center — gear icon placeholder (icon lives in SettingsHeader below) */}
      <div className={styles.centerGap} />

      {/* Right — AI module code */}
      <div className={`${styles.side} ${styles.sideRight}`}>
        <span className={styles.label}>{t('YZ MODÜL KODU :')}</span>
        <span className={styles.value}>{aiModuleCode}</span>
      </div>
    </div>
  )
}
