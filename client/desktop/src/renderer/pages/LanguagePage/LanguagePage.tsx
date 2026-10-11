// Ayarlar > Dil Seçimi — sade liste: bayrak + dilin kendi adı + Türkçe adı.
// Tüm diller seçilebilir. Gerçek çeviri sistemi henüz yok — seçim görsel olarak işaretlenir ve
// bu cihazda hatırlanır (localStorage). i18n gelince aynı seçim oradan okunur.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Flag, { type FlagCode } from './Flag'
import styles from './LanguagePage.module.css'

interface LangOption {
  code: string
  flag: FlagCode
  name: string
  nativeName: string
}

const LANGS: LangOption[] = [
  { code: 'tr', flag: 'tr', name: 'TÜRKÇE', nativeName: 'Türkçe' },
  { code: 'en', flag: 'gb', name: 'İNGİLİZCE', nativeName: 'English' },
  { code: 'de', flag: 'de', name: 'ALMANCA', nativeName: 'Deutsch' },
  { code: 'ru', flag: 'ru', name: 'RUSÇA', nativeName: 'Русский' },
  { code: 'ar', flag: 'sa', name: 'ARAPÇA', nativeName: 'العربية' },
  { code: 'fr', flag: 'fr', name: 'FRANSIZCA', nativeName: 'Français' },
]

const STORAGE_KEY = 'corventa.language'

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && LANGS.some((l) => l.code === v) ? v : 'tr'
  } catch {
    return 'tr'
  }
}

export default function LanguagePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>(readStored)

  function choose(code: string) {
    setSelected(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* depolama kapalıysa sadece ekranda işaretli kalır */
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>DİL SEÇİMİ</h1>
      </div>

      <div className={styles.grid}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            className={styles.langCard}
            data-selected={selected === l.code || undefined}
            onClick={() => choose(l.code)}
          >
            <Flag code={l.flag} className={styles.flag} />
            <span className={styles.native}>{l.nativeName}</span>
            <span className={styles.name}>{l.name}</span>
            {selected === l.code && <span className={styles.check} aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
