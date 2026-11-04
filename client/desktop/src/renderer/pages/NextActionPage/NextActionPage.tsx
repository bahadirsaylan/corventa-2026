// SEKIL-20 — parça çıkarıldıktan sonra "NE YAPMAK İSTİYORSUNUZ?"
//   NEW BEND → iş ayarları sıfırlanır, profil seçiminden başlanır
//   REPEAT   → aynı profil / ölçülerle doğrudan parça yükleme ekranına

import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useT } from '@/i18n'
import styles from './NextActionPage.module.css'

export default function NextActionPage() {
  const navigate = useNavigate()
  const t = useT()
  const params = useBendingJobStore((s) => s.params)
  const setParams = useBendingJobStore((s) => s.setParams)
  const resetJob = useBendingJobStore((s) => s.resetJob)

  const canRepeat = !!params.profileId && !!params.bendingMethod

  function newBend() {
    const mode = params.bendingMode
    resetJob()
    if (mode) setParams({ bendingMode: mode })
    navigate('/bending/ai')
  }

  function repeat() {
    setParams({ rollArrangementConfirmed: true })
    navigate('/bending/ai/part-loading')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        {t('NE YAPMAK İSTİYORSUNUZ')}<span className={styles.q}>?</span>
      </h1>
      <div className={styles.grid}>
        <button type="button" className={styles.card} onClick={newBend}>
          <ArcLabel text={t('YENİ KIVRIM')} />
          <span className={styles.letter}>N</span>
        </button>
        <button type="button" className={styles.card} onClick={repeat} disabled={!canRepeat}>
          <ArcLabel text={t('TEKRARLA')} />
          <span className={styles.letter}>R</span>
        </button>
      </div>
    </div>
  )
}

// Kart içindeki yay + uçlarda kırmızı noktalar + yay üstünde yazı (SEKIL-20)
function ArcLabel({ text }: { text: string }) {
  const id = `arc-${text.replace(/\s/g, '')}`
  return (
    <svg viewBox="0 0 300 300" className={styles.arc} aria-hidden>
      <defs>
        <path id={id} d="M 40 160 A 112 112 0 0 1 200 52" />
      </defs>
      <path d="M 52 172 A 118 118 0 1 0 210 58" fill="none" stroke="#3a3a3a" strokeWidth="2" />
      <circle cx="52" cy="172" r="9" fill="#e3121b" stroke="#3a3a3a" strokeWidth="2" />
      <circle cx="210" cy="58" r="9" fill="#e3121b" stroke="#3a3a3a" strokeWidth="2" />
      <text className={styles.arcText}>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  )
}
