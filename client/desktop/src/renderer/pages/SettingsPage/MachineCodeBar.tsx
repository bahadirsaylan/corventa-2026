import { useT } from '@/i18n'
import styles from './MachineCodeBar.module.css'
import { EDITION_LABEL, IS_STANDARD } from '@shared/edition'

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
      {/* STANDART SÜRÜM (2026-11-17): YZ modülü yok — yerine sürüm adı */}
      <div className={`${styles.side} ${styles.sideRight}`}>
        {IS_STANDARD ? (
          <>
            <span className={styles.label}>{t('SÜRÜM :')}</span>
            <span className={`${styles.value} ${styles.edition}`}>{t(EDITION_LABEL)}</span>
          </>
        ) : (
          <>
            <span className={styles.label}>{t('YZ MODÜL KODU :')}</span>
            <span className={styles.value}>{aiModuleCode}</span>
          </>
        )}
      </div>
    </div>
  )
}
