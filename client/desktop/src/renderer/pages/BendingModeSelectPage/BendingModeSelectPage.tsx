// 2026-09-05 — Otomatik büküm mode seçimi:
//   AI Büküm    → tam otomatik, geri esneme + AI recipe hızlandırma
//   Yarı Oto    → büküm otomatik, geri esneme USTAYA (skipAutoCorrect=true)
// Dashboard AI butonundan buraya gelir.

import { useNavigate } from 'react-router-dom'
import { useBendingJobStore, type BendingModeId } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './BendingModeSelectPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function BendingModeSelectPage() {
  const navigate = useNavigate()
  const setParams = useBendingJobStore((s) => s.setParams)

  function select(mode: BendingModeId) {
    setParams({ bendingMode: mode })
    navigate('/bending/ai')
  }

  return (
    <div className={styles.page}>
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label="ARTIFICIAL INTELLIGENCE MODE"
      />

      <h2 className={styles.title}>OTOMATİK BÜKÜM TÜRÜ SEÇİNİZ</h2>

      <div className={styles.cardGrid}>
        <button
          type="button"
          className={`${styles.card} ${styles.cardAi}`}
          onClick={() => select('ai')}
        >
          <span className={styles.cardTitle}>AI BÜKÜM</span>
        </button>

        <button
          type="button"
          className={`${styles.card} ${styles.cardSemi}`}
          onClick={() => select('semi')}
        >
          <span className={styles.cardTitle}>YARI OTO BÜKÜM</span>
        </button>
      </div>

      <StatusBar backTo="/dashboard" confirmDisabled />
    </div>
  )
}
