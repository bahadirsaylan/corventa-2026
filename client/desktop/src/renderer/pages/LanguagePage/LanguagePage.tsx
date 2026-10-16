// Ayarlar > Dil Seçimi — sade liste: bayrak + dilin kendi adı + Türkçe adı.
// Tüm diller seçilebilir. Karta dokunmak seçer, KAYDET ile kalıcı olur.
// Kaydedilen dil bu cihazda hatırlanır (localStorage) ve tüm arayüz anında o dile geçer (@/i18n).
// Şimdilik çevirisi olan dil: İngilizce — diğerleri Türkçe görünür.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Flag, { type FlagCode } from './Flag'
import { useLangStore, useT, type LangCode } from '@/i18n'
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
  const [saved, setSaved] = useState<string>(readStored)
  const [selected, setSelected] = useState<string>(saved)
  const [justSaved, setJustSaved] = useState(false)
  const t = useT()
  const dirty = selected !== saved
  const savedLang = LANGS.find((l) => l.code === saved)!

  function choose(code: string) {
    setSelected(code)
    setJustSaved(false)
  }

  function save() {
    useLangStore.getState().setLang(selected as LangCode) // localStorage'a da yazar
    setSaved(selected)
    setJustSaved(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>{t('DİL SEÇİMİ')}</h1>
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
            <span className={styles.name}>{t(l.name)}</span>
            {selected === l.code && <span className={styles.check} aria-hidden>✓</span>}
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.status} data-ok={justSaved || undefined}>
          {justSaved
            ? t('KAYDEDİLDİ — {name}', { name: t(savedLang.name) })
            : dirty
              ? t("SEÇİMİ KAYDETMEK İÇİN KAYDET'E BASIN")
              : t('KAYITLI DİL: {name}', { name: t(savedLang.name) })}
        </span>
        <button type="button" className={styles.saveBtn} onClick={save} disabled={!dirty}>
          {t('KAYDET')}
        </button>
      </div>
    </div>
  )
}
