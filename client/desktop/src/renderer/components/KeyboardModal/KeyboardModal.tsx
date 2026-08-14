// Endüstriyel dokunmatik TR/EN klavye — program adı, kod, servis metni vb. için.
// 1080px portrait HMI panele optimize: 12 tuş/satır, 80px tuş yüksekliği, 28px font.
// Standart TR-Q layout + EN QWERTY toggle + Semboller sayfası + Shift/CapsLock.

import { useEffect, useMemo, useState } from 'react'
import styles from './KeyboardModal.module.css'

interface Props {
  initialValue: string
  label?: string
  /** Karakter limiti (opsiyonel). Belirlenirse sağ üstte sayaç görünür. */
  maxLength?: number
  onConfirm: (value: string) => void
  onClose: () => void
}

type Mode = 'tr' | 'en' | 'sym'
type ShiftState = 'off' | 'shift' | 'caps'

// ── TR-Q (Türkçe Q) — Windows standart ─────────────────────────
const TR_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '-'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı', 'o', 'p', 'ğ', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş', 'i', ','],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç', '.', ':', '/'],
]

// ── EN QWERTY ──────────────────────────────────────────────────
const EN_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '@', '_'],
]

// ── Sembol / rakam sayfası ────────────────────────────────────
const SYM_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '=', '+'],
  ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '/'],
  ['?', ':', ';', "'", '"', '\\', '|', '[', ']', '{', '}', '~'],
  ['<', '>', '`', '^', '€', '£', '¥', '§', '°', '±', '×', '÷'],
]

// TR-Q'da shift+i = İ, shift+ı = I (Türkçe locale kuralı)
function shiftChar(ch: string, mode: Mode): string {
  if (mode === 'tr') {
    if (ch === 'i') return 'İ'
    if (ch === 'ı') return 'I'
    return ch.toLocaleUpperCase('tr-TR')
  }
  return ch.toLocaleUpperCase('en-US')
}

export default function KeyboardModal({
  initialValue,
  label = 'METİN',
  maxLength,
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const [mode, setMode] = useState<Mode>('tr')
  const [shift, setShift] = useState<ShiftState>('off')

  const rows = useMemo(() => {
    if (mode === 'en') return EN_ROWS
    if (mode === 'sym') return SYM_ROWS
    return TR_ROWS
  }, [mode])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'Enter') { e.preventDefault(); onConfirm(value) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function append(str: string) {
    setValue((v) => {
      const next = v + str
      return maxLength && next.length > maxLength ? next.slice(0, maxLength) : next
    })
    if (shift === 'shift') setShift('off') // one-shot
  }

  function press(baseKey: string) {
    // Semboller sayfasında shift'in anlamı yok — direkt bas.
    if (mode === 'sym') {
      append(baseKey)
      return
    }
    const upper = shift !== 'off'
    append(upper ? shiftChar(baseKey, mode) : baseKey)
  }

  function backspace() {
    setValue((v) => v.slice(0, -1))
  }

  function space() {
    append(' ')
  }

  function toggleShift() {
    // off → shift → caps → off
    setShift((s) => (s === 'off' ? 'shift' : s === 'shift' ? 'caps' : 'off'))
  }

  function toggleMode() {
    // ABC modunda TR ↔ EN. Sembol modunda ise TR'ye dön.
    if (mode === 'sym') { setMode('tr'); return }
    setMode((m) => (m === 'tr' ? 'en' : 'tr'))
  }

  function toggleSymbols() {
    setMode((m) => (m === 'sym' ? 'tr' : 'sym'))
  }

  function clearAll() {
    setValue('')
  }

  const showUpper = mode !== 'sym' && shift !== 'off'
  const shiftLabel = shift === 'caps' ? '⇪' : '⇧'
  const modeToggleLabel = mode === 'en' ? 'EN' : mode === 'sym' ? 'TR' : 'TR'
  const symToggleLabel = mode === 'sym' ? 'ABC' : '?123'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sanal klavye"
      >
        {/* ── Başlık + Değer ekranı ─────────────────────────── */}
        <div className={styles.headerRow}>
          <span className={styles.label}>{label}</span>
          <div className={styles.display}>
            <span className={styles.displayValue}>
              {value || <span className={styles.placeholder}>Yazmak için tuşlara basın…</span>}
            </span>
            <span className={styles.caret} />
          </div>
          {maxLength && (
            <span className={styles.counter}>
              {value.length}/{maxLength}
            </span>
          )}
          <button
            className={styles.clearBtn}
            onClick={clearAll}
            aria-label="Tümünü sil"
            type="button"
          >
            TEMİZLE
          </button>
        </div>

        {/* ── Harf / sembol satırları ───────────────────────── */}
        <div className={styles.keyboardArea}>
          {rows.map((row, rIdx) => (
            <div key={rIdx} className={styles.row}>
              {rIdx === 3 && mode !== 'sym' && (
                <button
                  className={`${styles.key} ${styles.special} ${styles.shiftKey} ${
                    shift === 'caps' ? styles.capsActive : shift === 'shift' ? styles.shiftActive : ''
                  }`}
                  onClick={toggleShift}
                  type="button"
                  aria-label={
                    shift === 'caps' ? 'Caps Lock aktif' : shift === 'shift' ? 'Shift aktif' : 'Shift'
                  }
                >
                  {shiftLabel}
                </button>
              )}
              {row.map((k) => (
                <button
                  key={k + rIdx}
                  className={styles.key}
                  onClick={() => press(k)}
                  type="button"
                >
                  {showUpper ? shiftChar(k, mode) : k}
                </button>
              ))}
              {rIdx === 3 && (
                <button
                  className={`${styles.key} ${styles.special} ${styles.backspaceKey}`}
                  onClick={backspace}
                  type="button"
                  aria-label="Sil"
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Aksiyon satırı ────────────────────────────────── */}
        <div className={styles.actionRow}>
          <button
            className={`${styles.key} ${styles.special} ${styles.modeKey} ${
              mode === 'sym' ? styles.modeActive : ''
            }`}
            onClick={toggleSymbols}
            type="button"
          >
            {symToggleLabel}
          </button>
          <button
            className={`${styles.key} ${styles.special} ${styles.langKey}`}
            onClick={toggleMode}
            type="button"
            aria-label="Dil değiştir"
          >
            🌐 {modeToggleLabel}
          </button>
          <button
            className={`${styles.key} ${styles.spaceKey}`}
            onClick={space}
            type="button"
            aria-label="Boşluk"
          >
            {mode === 'tr' ? 'BOŞLUK' : mode === 'en' ? 'SPACE' : ' '}
          </button>
          <button
            className={`${styles.key} ${styles.cancelKey}`}
            onClick={onClose}
            type="button"
          >
            VAZGEÇ
          </button>
          <button
            className={`${styles.key} ${styles.confirmKey}`}
            onClick={() => onConfirm(value)}
            type="button"
          >
            ✓ ONAYLA
          </button>
        </div>
      </div>
    </div>
  )
}
