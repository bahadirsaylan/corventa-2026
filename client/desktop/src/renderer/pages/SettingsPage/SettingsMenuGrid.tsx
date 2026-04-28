import { useState } from 'react'
import styles from './SettingsMenuGrid.module.css'

type SaleType = 'SATIŞ' | 'TAKAS' | 'HİBE'

export default function SettingsMenuGrid() {
  const [smsCode, setSmsCode] = useState('')
  const [saleType, setSaleType] = useState<SaleType>('SATIŞ')

  return (
    <div className={styles.grid}>
      {/* ── LEFT COLUMN ───────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="GARANTİ SÜRESİ" />
        <SettingsBtn label="BİG DATA BAĞLANTI AYARLARI" />
        <SettingsBtn label="KULLANICI YÖNETİMİ" />
        <SettingsBtn label={<>KIVRIM İÇİN VARSAYILAN HIZ : <span className={styles.highlight}>6m/dk</span></>} />
        <SettingsBtn label="KARŞILAMA MESAJI" />
        <SettingsBtn label="CHECK LIST" />
        <SettingsBtn label="PDF KULLANIM KİTABI" />
        <SettingsBtn label={<>BAKIM SÜRESİ : <span className={styles.subtext}>HAFTALIK 3 DAYS, AYLIK 12 DAYS</span></>} />
        <SettingsBtn label="CETVEL SIFIRLAMA" />
      </div>

      {/* ── RIGHT COLUMN ──────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="HATA RAPORLARI" />
        <SettingsBtn label="KULLANMA SÜRELERİ" />
        <SettingsBtn label="KIVRIM ADETLERİ RAPORU" />
        <SettingsBtn label="DİL SEÇİMİ" />
        <SettingsBtn label="SERTİFİKA SORGULA" />

        {/* Müşteri değişikliği row */}
        <div className={`${styles.settingsBtn} ${styles.customerChangeRow}`}>
          <span className={styles.btnLabel}>MÜŞTERİ DEĞİŞİKLİĞİ</span>
          <div className={styles.smsBox}>
            <span className={styles.smsLabel}>SMS ONAYI :</span>
            <input
              className={styles.smsInput}
              type="text"
              maxLength={8}
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              placeholder="_ _ _ _ _ _ _ _"
            />
          </div>
        </div>

        {/* Satış / Takas / Hibe row */}
        <div className={`${styles.settingsBtn} ${styles.saleTypeRow}`}>
          {(['SATIŞ', 'TAKAS', 'HİBE'] as SaleType[]).map((type) => (
            <label key={type} className={styles.radioLabel}>
              <input
                type="radio"
                name="saleType"
                className={styles.radioInput}
                checked={saleType === type}
                onChange={() => setSaleType(type)}
              />
              <span className={`${styles.radioDot} ${saleType === type ? styles.radioActive : ''}`} />
              <span className={styles.radioText}>{type}</span>
            </label>
          ))}
          <button className={styles.sendCodeBtn}>
            KOD<br />GÖNDER
          </button>
        </div>

        {/* Sosyal Medya Girişi */}
        <div className={`${styles.settingsBtn} ${styles.socialRow}`}>
          <span className={styles.btnLabel}>SOSYAL MEDYA GİRİŞ PANELİ</span>
          <div className={styles.socialIcons}>
            <SocialIcon platform="instagram" />
            <SocialIcon platform="linkedin" />
            <SocialIcon platform="youtube" />
            <SocialIcon platform="facebook" />
            <SocialIcon platform="twitter" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Reusable plain button ───────────────────── */
function SettingsBtn({ label }: { label: React.ReactNode }) {
  return (
    <button className={styles.settingsBtn}>
      <span className={styles.btnLabel}>{label}</span>
    </button>
  )
}

/* ── Social media icons ──────────────────────── */
type Platform = 'instagram' | 'linkedin' | 'youtube' | 'facebook' | 'twitter'

function SocialIcon({ platform }: { platform: Platform }) {
  const icons: Record<Platform, React.ReactNode> = {
    instagram: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
        <line x1="7" y1="10" x2="7" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="7" cy="7.5" r="1.2" fill="currentColor" />
        <path d="M11 10v7M11 13c0-1.657 1.343-3 3-3s3 1.343 3 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="2" />
        <polygon points="10,9 16,12 10,15" fill="currentColor" />
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M13 21v-8h2.5l.5-3H13V8.5C13 7.67 13.33 7 14.5 7H16V4.5S15 4 13.5 4C11.015 4 10 5.54 10 7.5V10H7.5v3H10v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }

  return <span className={styles.socialIcon}>{icons[platform]}</span>
}
