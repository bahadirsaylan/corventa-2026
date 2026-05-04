import { useEffect, useState } from 'react'
import styles from './NumpadModal.module.css'

interface NumpadModalProps {
  /** Label shown above the value display, e.g. "A" */
  fieldLabel: string
  /** Current committed value for the field */
  initialValue: string
  onConfirm: (value: string) => void
  onClose: () => void
}

const KEYS = [
  '7', '8', '9',
  '4', '5', '6',
  '1', '2', '3',
  '.', '0', '⌫',
]

export default function NumpadModal({ fieldLabel, initialValue, onConfirm, onClose }: NumpadModalProps) {
  const [display, setDisplay] = useState(initialValue || '')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') handleConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function press(key: string) {
    if (key === '⌫') {
      setDisplay((d) => d.slice(0, -1))
      return
    }
    if (key === '.') {
      if (display.includes('.')) return
      setDisplay((d) => (d === '' ? '0.' : d + '.'))
      return
    }
    // prevent multiple leading zeros
    if (display === '0' && key !== '.') {
      setDisplay(key)
      return
    }
    setDisplay((d) => d + key)
  }

  function handleClear() {
    setDisplay('')
  }

  function handleConfirm() {
    const cleaned = display.endsWith('.') ? display.slice(0, -1) : display
    onConfirm(cleaned)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Field label + display ── */}
        <div className={styles.displayRow}>
          <span className={styles.fieldLabel}>{fieldLabel}:</span>
          <div className={styles.display}>
            <span className={styles.displayValue}>{display || '0'}</span>
          </div>
        </div>

        {/* ── Numpad grid ── */}
        <div className={styles.grid}>
          {KEYS.map((key) => (
            <button
              key={key}
              className={`${styles.key} ${key === '⌫' ? styles.keyBackspace : ''}`}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>

        {/* ── Action row ── */}
        <div className={styles.actions}>
          <button className={styles.clearBtn} onClick={handleClear}>
            C
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            ✓
          </button>
        </div>

      </div>
    </div>
  )
}
