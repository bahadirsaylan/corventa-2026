// Ayarlar > Dil Seçimi — aktif dil kartı + desteklenen diller (SVG bayrak + durum rozeti) + önizleme.
// Tüm diller seçilebilir. Karta dokunmak seçer, KAYDET ile kalıcı olur.
// Kaydedilen dil bu cihazda hatırlanır (localStorage) ve tüm arayüz anında o dile geçer (@/i18n).
// Çevirisi olmayan diller Türkçe görünür (rozet: PLANLANAN).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Flag, { type FlagCode } from './Flag'
import { hasDictionary, translate, useLangStore, useT, type LangCode } from '@/i18n'
import styles from './LanguagePage.module.css'

interface LangOption {
  code: LangCode
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

// Önizleme satırları — sözlükteki gerçek anahtarlar
const PREVIEW_KEYS = ['BÜKÜMÜ BAŞLAT', 'GÖNYE AL', 'STAGE SEÇİMİ', 'MAKİNE HAZIR.']

export default function LanguagePage() {
  const navigate = useNavigate()
  const savedCode = useLangStore((s) => s.lang)
  const [selected, setSelected] = useState<LangCode>(savedCode)
  const [justSaved, setJustSaved] = useState(false)
  const t = useT()
  const dirty = selected !== savedCode
  const savedLang = LANGS.find((l) => l.code === savedCode) ?? LANGS[0]
  const selectedLang = LANGS.find((l) => l.code === selected) ?? LANGS[0]

  function choose(code: LangCode) {
    setSelected(code)
    setJustSaved(false)
  }

  function save() {
    useLangStore.getState().setLang(selected) // localStorage'a da yazar
    setJustSaved(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('DİL SEÇİMİ')}</h1>
      </div>

      <div className={styles.body}>
        {/* Aktif dil özet */}
        <div className={styles.currentCard}>
          <span className={styles.currentLabel}>{t('AKTİF DİL')}</span>
          <div className={styles.currentRow}>
            <Flag code={savedLang.flag} className={styles.currentFlag} />
            <span className={styles.currentName}>{t(savedLang.name)}</span>
            <span className={styles.currentNative}>({savedLang.nativeName})</span>
          </div>
        </div>

        {/* Dil kartları */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('DESTEKLENEN DİLLER')}</div>
          <div className={styles.langGrid}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`${styles.langCard} ${selected === l.code ? styles.langSelected : ''}`}
                onClick={() => choose(l.code)}
              >
                <Flag code={l.flag} className={styles.langFlag} />
                <div className={styles.langInfo}>
                  <span className={styles.langName}>{t(l.name)}</span>
                  <span className={styles.langNative}>{l.nativeName}</span>
                </div>
                <StatusBadge ready={hasDictionary(l.code)} />
              </button>
            ))}
          </div>
        </div>

        {/* Önizleme */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('ÖNİZLEME')}</div>
          <div className={styles.previewTable}>
            <div className={`${styles.previewRow} ${styles.previewHeader}`}>
              <span>{t('TÜRKÇE')}</span>
              <span>{t(selectedLang.name)}</span>
            </div>
            {PREVIEW_KEYS.map((k) => {
              const target = translate(k, selected)
              const missing = selected !== 'tr' && target === k
              return (
                <div key={k} className={styles.previewRow}>
                  <span>{k}</span>
                  <span className={styles.previewTarget}>
                    {missing ? `${k} (${t('henüz çevrilmedi')})` : target}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.footerRow}>
          <button type="button" className={styles.applyBtn} onClick={save} disabled={!dirty}>
            {t('KAYDET')}
          </button>
          <p className={styles.note} data-ok={justSaved || undefined}>
            {justSaved
              ? t('KAYDEDİLDİ — {name}', { name: t(savedLang.name) })
              : dirty
                ? t("SEÇİMİ KAYDETMEK İÇİN KAYDET'E BASIN")
                : t('KAYITLI DİL: {name}', { name: t(savedLang.name) })}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ ready }: { ready: boolean }) {
  const t = useT()
  return (
    <span className={styles.statusBadge} data-ready={ready || undefined}>
      {ready ? t('HAZIR') : t('PLANLANAN')}
    </span>
  )
}
