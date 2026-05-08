// SEKIL-25 — On-screen Türkçe klavye (program adı/kod girmek için).
// Touchscreen optimize edilmiş büyük tuşlar + shift + space + backspace + enter.

import { useEffect, useState } from 'react'
import styles from './KeyboardModal.module.css'

interface Props {
  initialValue: string
  label?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

const ROW_NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '+']
const ROW_TOP = ['Q', 'J', 'Ü', 'O', 'F', 'C', 'T', 'M', 'K', 'B', 'S', 'P']
const ROW_MID = ['E', 'A', 'İ', 'I', 'G', 'Ğ', 'L', 'N', 'R', 'D', 'V', '.']
const ROW_BOT = ['X', 'W', 'Ö', 'U', 'H', 'Z', 'Ç', 'Y', 'Ş', ',', '/', '?']

export default function KeyboardModal({
  initialValue,
  label = 'METİN',
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState(initialValue)
  const [shift, setShift] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') onConfirm(value)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function press(key: string) {
    setValue((v) => v + (shift ? key : key.toLocaleLowerCase('tr-TR')))
  }

  function backspace() {
    setValue((v) => v.slice(0, -1))
  }

  function space() {
    setValue((v) => v + ' ')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.headerRow}>
          <span className={styles.label}>{label}</span>
          <div className={styles.display}>{value || <span className={styles.placeholder}>—</span>}</div>
        </div>

        {/* Number row */}
        <div className={styles.row}>
          {ROW_NUM.map((k) => (
            <button key={k} className={styles.key} onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button className={`${styles.key} ${styles.special}`} onClick={backspace}>
            ←
          </button>
        </div>

        {/* Top letter row */}
        <div className={styles.row}>
          <button className={`${styles.key} ${styles.special}`} onClick={() => setShift((s) => !s)}>
            ⇄
          </button>
          {ROW_TOP.map((k) => (
            <button key={k} className={styles.key} onClick={() => press(k)}>
              {shift ? k : k.toLocaleLowerCase('tr-TR')}
            </button>
          ))}
        </div>

        {/* Middle letter row */}
        <div className={styles.row}>
          <button
            className={`${styles.key} ${styles.special} ${shift ? styles.activeShift : ''}`}
            onClick={() => setShift((s) => !s)}
          >
            ⇧
          </button>
          {ROW_MID.map((k) => (
            <button key={k} className={styles.key} onClick={() => press(k)}>
              {shift ? k : k.toLocaleLowerCase('tr-TR')}
            </button>
          ))}
        </div>

        {/* Bottom row */}
        <div className={styles.row}>
          <button className={`${styles.key} ${styles.special}`} onClick={() => setShift((s) => !s)}>
            ⇧
          </button>
          {ROW_BOT.map((k) => (
            <button key={k} className={styles.key} onClick={() => press(k)}>
              {shift ? k : k.toLocaleLowerCase('tr-TR')}
            </button>
          ))}
        </div>

        {/* Action row */}
        <div className={styles.actionRow}>
          <button className={`${styles.key} ${styles.special} ${styles.ctrlKey}`}>CTRL</button>
          <button className={`${styles.key} ${styles.spaceKey}`} onClick={space}>
            BOŞLUK
          </button>
          <button
            className={`${styles.key} ${styles.confirmKey}`}
            onClick={() => onConfirm(value)}
          >
            ENTER ↵
          </button>
          <button className={`${styles.key} ${styles.cancelKey}`} onClick={onClose}>
            VAZGEÇ
          </button>
        </div>
      </div>
    </div>
  )
}
