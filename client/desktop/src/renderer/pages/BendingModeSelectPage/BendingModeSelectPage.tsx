// 2026-09-05 — Otomatik büküm mode seçimi:
//   AI Büküm    → tam otomatik, geri esneme + AI recipe hızlandırma
//   Yarı Oto    → büküm otomatik, geri esneme USTAYA (skipAutoCorrect=true)
// Dashboard AI butonundan buraya gelir. Kart seçildiğinde mode store'a yazılır ve
// akış /bending/ai/direction'a devam eder (profil-yön-method-parametre zinciri).

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
    // Mode secildikten sonra normal AI zincirine gir: profil → direction → method → ...
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
        {/* AI Büküm — tam otomatik */}
        <button
          type="button"
          className={`${styles.card} ${styles.cardAi}`}
          onClick={() => select('ai')}
        >
          <div className={styles.cardIcon}>🤖</div>
          <div className={styles.cardTitle}>AI BÜKÜM</div>
          <div className={styles.cardSubtitle}>TAM OTOMATİK</div>
          <ul className={styles.cardFeatures}>
            <li>Büküm otomatik</li>
            <li>Geri esneme ölçümü otomatik</li>
            <li>AI hızlandırma (geçmiş bükümlerden öğrenir)</li>
            <li>Sonuç kaydedilir</li>
          </ul>
        </button>

        {/* Yarı Oto — geri esneme USTAYA */}
        <button
          type="button"
          className={`${styles.card} ${styles.cardSemi}`}
          onClick={() => select('semi')}
        >
          <div className={styles.cardIcon}>🧑‍🔧</div>
          <div className={styles.cardTitle}>YARI OTO BÜKÜM</div>
          <div className={styles.cardSubtitle}>USTA KONTROLÜNDE</div>
          <ul className={styles.cardFeatures}>
            <li>Büküm otomatik</li>
            <li>Büküm bitince <b>USTAYA BIRAKILIR</b></li>
            <li>Geri esneme ölçümü/düzeltmesi manuel</li>
            <li>AI hızlandırma YOK (recipe uygulanmaz)</li>
          </ul>
        </button>
      </div>

      <StatusBar
        backTo="/dashboard"
        confirmDisabled
      />
    </div>
  )
}
