// Ayarlar > Dil Seçimi — aktif dil radio kartı + önizleme.
// Backend: DataApi.settings.language (henüz yok, mock — local state).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LanguagePage.module.css'

interface LangOption {
  code: string
  name: string
  nativeName: string
  flag: string      // emoji flag
  status: 'ready' | 'partial' | 'planned'
}

const LANGS: LangOption[] = [
  { code: 'tr', name: 'TÜRKÇE',     nativeName: 'Türkçe',        flag: '🇹🇷', status: 'ready' },
  { code: 'en', name: 'İNGİLİZCE',  nativeName: 'English',       flag: '🇬🇧', status: 'partial' },
  { code: 'de', name: 'ALMANCA',    nativeName: 'Deutsch',       flag: '🇩🇪', status: 'planned' },
  { code: 'ru', name: 'RUSÇA',      nativeName: 'Русский',       flag: '🇷🇺', status: 'planned' },
  { code: 'ar', name: 'ARAPÇA',     nativeName: 'العربية',        flag: '🇸🇦', status: 'planned' },
  { code: 'fr', name: 'FRANSIZCA',  nativeName: 'Français',      flag: '🇫🇷', status: 'planned' },
]

const PREVIEW_KEYS: Array<{ key: string; tr: string; en: string }> = [
  { key: 'BÜKÜM BAŞLAT',             tr: 'BÜKÜM BAŞLAT',              en: 'START BENDING' },
  { key: 'GÖNYE',                    tr: 'GÖNYE ALINDI',               en: 'REFERENCE SET' },
  { key: 'YAN DAYAMA',               tr: 'YAN DAYAMA AYARI',           en: 'SIDE SUPPORT ADJ.' },
  { key: 'HAZIR',                    tr: 'MAKİNE HAZIR',               en: 'MACHINE READY' },
]

export default function LanguagePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>('tr')

  const selectedLang = LANGS.find((l) => l.code === selected)!

  function apply() {
    alert(`Dil değiştirildi: ${selectedLang.name} (mock — DataApi.settings.updateLanguage ile yazılacak, sayfa refresh gerekir)`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>DİL SEÇİMİ</h1>
      </div>

      <div className={styles.body}>
        {/* Aktif dil özet */}
        <div className={styles.currentCard}>
          <span className={styles.currentLabel}>AKTİF DİL</span>
          <div className={styles.currentRow}>
            <span className={styles.currentFlag}>{selectedLang.flag}</span>
            <span className={styles.currentName}>{selectedLang.name}</span>
            <span className={styles.currentNative}>({selectedLang.nativeName})</span>
          </div>
        </div>

        {/* Dil kartları */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>DESTEKLENEN DİLLER</div>
          <div className={styles.langGrid}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`${styles.langCard} ${selected === l.code ? styles.langSelected : ''}`}
                onClick={() => setSelected(l.code)}
                disabled={l.status === 'planned'}
              >
                <span className={styles.langFlag}>{l.flag}</span>
                <div className={styles.langInfo}>
                  <span className={styles.langName}>{l.name}</span>
                  <span className={styles.langNative}>{l.nativeName}</span>
                </div>
                <StatusBadge status={l.status} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>ÖNİZLEME</div>
          <div className={styles.previewTable}>
            <div className={`${styles.previewRow} ${styles.previewHeader}`}>
              <span>TÜRKÇE</span>
              <span>{selectedLang.name}</span>
            </div>
            {PREVIEW_KEYS.map((k) => (
              <div key={k.key} className={styles.previewRow}>
                <span>{k.tr}</span>
                <span className={styles.previewTarget}>
                  {selected === 'en' ? k.en : selected === 'tr' ? k.tr : `${k.tr} (henüz çevrilmedi)`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footerRow}>
          <button className={styles.applyBtn} onClick={apply}>UYGULA VE YENİDEN BAŞLAT</button>
          <p className={styles.note}>
            Dil değişikliği tam olarak uygulanabilmesi için UI'ın yeniden başlatılması gerekir.
            "Planlanan" statüsündeki diller henüz aktive edilmemiştir.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'ready' | 'partial' | 'planned' }) {
  const map = {
    ready:   { label: 'HAZIR',    bg: '#dcfce7', color: '#14532d' },
    partial: { label: 'KISMEN',   bg: '#fef3c7', color: '#78350f' },
    planned: { label: 'PLANLAN.', bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status]
  return <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>{s.label}</span>
}
