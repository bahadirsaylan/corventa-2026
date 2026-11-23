import { useEffect, useState } from 'react'
import styles from './NumpadModal.module.css'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'

interface NumpadModalProps {
  /** Label shown above the value display, e.g. "A" */
  fieldLabel: string
  /** Current committed value for the field */
  initialValue: string
  onConfirm: (value: string) => void
  onClose: () => void
  /** true → işaret değiştirme (±) tuşu gösterilir (negatif değerler, ör. XA1) */
  allowNegative?: boolean
  /**
   * true → kod girişi (ör. 6 haneli OTP): sadece rakam, baştaki sıfırlar KORUNUR,
   * '.' tuşu kapalı. Sayısal alanlardaki "baştaki sıfırı yut" kuralı uygulanmaz.
   */
  digitsOnly?: boolean
  /** En fazla karakter (digitsOnly ile, ör. 6) */
  maxLength?: number
}

const KEYS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', '⌫',
]

export default function NumpadModal({ fieldLabel, initialValue, onConfirm, onClose, allowNegative, digitsOnly, maxLength }: NumpadModalProps) {
  const t = useT()
  // 2026-11-23 (kullanıcı): numpad her zaman BOŞ açılır (eski değerin sonuna yazılmasın). Eski değer silik ipucu olarak
  // görünür; hiçbir tuşa basmadan onaylanırsa eski değer KORUNUR. C'ye basıp boş onaylamak alanı bilerek temizler.
  const [display, setDisplay] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') handleConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function press(key: string) {
    setTouched(true)
    if (key === '⌫') {
      setDisplay((d) => d.slice(0, -1))
      return
    }
    if (digitsOnly) {
      // Kod girişi: '.' yok, baştaki 0 korunur (012345 geçerli kod)
      if (key === '.') return
      setDisplay((d) => (maxLength != null && d.length >= maxLength ? d : d + key))
      return
    }
    if (key === '.') {
      if (display.includes('.')) return
      setDisplay((d) => (d === '' || d === '-' ? d + '0.' : d + '.'))
      return
    }
    // prevent multiple leading zeros
    if ((display === '0' || display === '-0') && key !== '.') {
      setDisplay(display.startsWith('-') ? '-' + key : key)
      return
    }
    setDisplay((d) => d + key)
  }

  function toggleSign() {
    setTouched(true)
    setDisplay((d) => (d.startsWith('-') ? d.slice(1) : '-' + d))
  }

  function handleClear() {
    setTouched(true)
    setDisplay('')
  }

  function handleConfirm() {
    if (!touched) {
      onConfirm(initialValue || '')
      onClose()
      return
    }
    let cleaned = display.endsWith('.') ? display.slice(0, -1) : display
    if (cleaned === '-') cleaned = ''
    onConfirm(cleaned)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Field label + display ── */}
        <div className={styles.displayRow}>
          <span className={styles.fieldLabel}>{fieldLabel}</span>
          <div className={styles.display}>
            {display === '' && !touched && initialValue ? (
              <span className={styles.displayValue} style={{ opacity: 0.35 }}>{initialValue}</span>
            ) : (
              <span className={styles.displayValue}>{display || '0'}</span>
            )}
          </div>
        </div>

        {/* ── Numpad grid ── */}
        <div className={styles.grid}>
          {KEYS.map((key) => (
            <button
              key={key}
              className={`${styles.key} ${key === '⌫' ? styles.keyBackspace : ''}`}
              onClick={() => press(key)}
              aria-label={key === '⌫' ? t('Sil') : undefined}
              disabled={digitsOnly && key === '.'}
              style={digitsOnly && key === '.' ? { visibility: 'hidden' } : undefined}
            >
              {key === '⌫' ? <Icon name="backspace" size="lg" /> : key}
            </button>
          ))}
        </div>

        {/* ── Action row ── */}
        <div className={styles.actions} style={allowNegative ? { gridTemplateColumns: '1fr 1fr 2fr' } : undefined}>
          <button className={styles.clearBtn} onClick={handleClear}>
            C
          </button>
          {allowNegative && (
            <button className={styles.clearBtn} style={{ background: '#4b5563' }} onClick={toggleSign}>
              ±
            </button>
          )}
          <button className={styles.confirmBtn} onClick={handleConfirm} aria-label={t('ONAYLA')}>
            <Icon name="confirm" size="xl" />
          </button>
        </div>

      </div>
    </div>
  )
}
