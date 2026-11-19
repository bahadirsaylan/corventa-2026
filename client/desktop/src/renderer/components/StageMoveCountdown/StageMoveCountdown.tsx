// 2026-11-20 (kullanıcı): toplar stage konumuna gitmeden önce 5 sn geri sayım + uyarı — operatör elini çeksin.
// Kullanım: tahliye sonrası (PARÇAYI ALDIM → bükümün stage'ine dönüş) ve parça yükleme sayfası (parça konmadan
// ÖNCE stage geçişi). Süre bitince onDone; VAZGEÇ → onCancel (hareket yapılmaz).

import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './StageMoveCountdown.module.css'

interface Props {
  stage: number
  seconds?: number
  onDone: () => void
  onCancel: () => void
  /** Verilirse "HEMEN BAŞLAT VE DEVAM ET" düğmesi (vals dizilimi ekranı — beklemeden geçilebilsin) */
  onSkip?: () => void
  /** true → tam ekran değil, sayfanın altında şerit (ekranın düğmeleri kullanılabilir kalır) */
  inline?: boolean
}

export default function StageMoveCountdown({ stage, seconds = 5, onDone, onCancel, onSkip, inline = false }: Props) {
  const t = useT()
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) {
      onDone()
      return
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(id)
  }, [left, onDone])

  return (
    <div className={inline ? styles.inlineWrap : styles.overlay} role="alertdialog" aria-modal={!inline}>
      <div className={inline ? `${styles.card} ${styles.inlineCard}` : styles.card}>
        <span className={styles.icon}>
          <Icon name="warning" size={56} />
        </span>
        <h2 className={styles.title}>{t('TOPLAR STAGE {n} KONUMUNA GİDECEK', { n: stage })}</h2>
        <p className={styles.text}>{t('ELİNİZİ MAKİNEDEN UZAK TUTUN')}</p>
        <div className={styles.count}>{Math.max(left, 0)}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            {t('VAZGEÇ — HAREKET ETME')}
          </button>
          {onSkip && (
            <button type="button" className={`${styles.cancelBtn} ${styles.skipBtn}`} onClick={onSkip}>
              {t('HEMEN BAŞLAT VE DEVAM ET')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
