// Kalıp kodu girişi — ekranda rakam tuş takımı (0-9, tire, sil, temizle, SORGULA) + biçim maskesi
// MMM-AAA-BBB-SS[-VV] + anlık biçim uyarısı (BULUT_API_V2.md §2.4 adım 1-2). İlk 3 haneden sonra tire
// kendiliğinden eklenir (üretici kodu hep 3 hane); diğer gruplar 3/4 ve 2/3 hane olabildiği için tireyi
// operatör basar. Fiziksel klavye de çalışır (rakam, -, Backspace, Enter).

import { useEffect } from 'react'
import { Icon, IconLabel } from '@/components/Icon'
import { useT } from '@/i18n'
import styles from './MoldCodeKeypad.module.css'

const MAX_LEN = 20 // 001-1200-1200-025-01

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** Biçim hatası (t() anahtarı) — null = geçerli */
  formatError: string | null
  busy?: boolean
  /** Modal açıkken fiziksel klavye dinlenmez */
  keyboardEnabled?: boolean
}

export function appendMoldKey(value: string, key: string): string {
  if (key === '-') {
    if (!value || value.endsWith('-') || value.split('-').length >= 5) return value
    return (value + '-').slice(0, MAX_LEN)
  }
  if (!/^\d$/.test(key) || value.length >= MAX_LEN) return value
  const next = value + key
  // Üretici kodu her zaman 3 hane → tireyi kendiliğinden ekle
  return /^\d{3}$/.test(next) ? next + '-' : next
}

export default function MoldCodeKeypad({ value, onChange, onSubmit, formatError, busy, keyboardEnabled = true }: Props) {
  const t = useT()
  const valid = !!value && !formatError

  useEffect(() => {
    if (!keyboardEnabled) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      // Ekran klavyesi / modal açıkken (lisans anahtarı girişi) tuşlar ona ait
      if (document.querySelector('[role="dialog"]')) return
      if (/^\d$/.test(e.key) || e.key === '-') {
        e.preventDefault()
        onChange(appendMoldKey(value, e.key))
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onChange(value.slice(0, -1))
      } else if (e.key === 'Enter' && valid && !busy) {
        e.preventDefault()
        onSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboardEnabled, value, valid, busy, onChange, onSubmit])

  const press = (k: string) => onChange(appendMoldKey(value, k))

  return (
    <div className={styles.wrap}>
      <div className={`${styles.display} ${value ? (valid ? styles.displayValid : styles.displayInvalid) : ''}`}>
        {value ? <span className={styles.value}>{value}</span> : <span className={styles.mask}>MMM-AAA-BBB-SS-VV</span>}
      </div>
      <div className={`${styles.feedback} ${value && !valid ? styles.feedbackError : valid ? styles.feedbackOk : ''}`}>
        {!value
          ? t('Biçim: MMM-AAA-BBB-SS (varyant varsa -VV)')
          : valid
            ? <IconLabel icon="check">{t('BİÇİM GEÇERLİ — SORGULA’ya basın')}</IconLabel>
            : t(formatError ?? '')}
      </div>

      <div className={styles.keys}>
        {['7', '8', '9'].map((k) => <Key key={k} label={k} onPress={() => press(k)} />)}
        <button type="button" className={`${styles.key} ${styles.keyFn}`} onClick={() => onChange(value.slice(0, -1))} aria-label={t('Sil')}>
          <Icon name="backspace" size="xl" />
        </button>
        {['4', '5', '6'].map((k) => <Key key={k} label={k} onPress={() => press(k)} />)}
        <button type="button" className={`${styles.key} ${styles.keyDash}`} onClick={() => press('-')}>–</button>
        {['1', '2', '3'].map((k) => <Key key={k} label={k} onPress={() => press(k)} />)}
        <button type="button" className={`${styles.key} ${styles.keyFn} ${styles.keyClear}`} onClick={() => onChange('')}>
          {t('TEMİZLE')}
        </button>
        <button type="button" className={`${styles.key} ${styles.keyZero}`} onClick={() => press('0')}>0</button>
        <button
          type="button"
          className={`${styles.key} ${styles.keySubmit}`}
          disabled={!valid || busy}
          onClick={onSubmit}
        >
          {busy ? t('SORGULANIYOR...') : <IconLabel icon="search">{t('SORGULA')}</IconLabel>}
        </button>
      </div>
    </div>
  )
}

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button type="button" className={styles.key} onClick={onPress}>
      {label}
    </button>
  )
}
