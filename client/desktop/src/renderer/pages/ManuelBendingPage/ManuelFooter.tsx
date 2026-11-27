// SEKIL-22 alt: Uyarı + sinyal + Geometrik çap + Touch icon

import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import styles from './ManuelFooter.module.css'
import alertIcon from '@/assets/images/alert.png'
import touchIcon from '@/assets/images/touch.png'

interface Props {
  selectedDiameter: number | null
  /** Diameter kutusu üzerindeki başlık */
  diameterLabel?: string
  onTouchConfirm?: () => void
}

export default function ManuelFooter({
  selectedDiameter,
  diameterLabel = 'SEÇİLİ PROGRAMIN\nGEOMETRİSEL ÇAPI',
  onTouchConfirm,
}: Props) {
  const t = useT()
  return (
    <div className={styles.footer}>
      <div className={styles.left}>
        <img src={alertIcon} alt={t('Uyarı')} className={styles.alertIcon} />
        <Icon name="signal" size="xxl" />
      </div>

      <div className={styles.diameterBox}>
        <span className={styles.diameterLabel}>
          {t(diameterLabel).split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
        <span className={styles.diameterValue}>
          {selectedDiameter && selectedDiameter > 0 ? `Ø ${selectedDiameter}` : '—'}
        </span>
      </div>

      <button className={styles.touchBtn} onClick={onTouchConfirm} disabled={!onTouchConfirm}>
        <img src={touchIcon} alt="Touch" className={styles.touchIcon} />
      </button>
    </div>
  )
}
