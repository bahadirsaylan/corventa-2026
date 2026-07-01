import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsMenuGrid.module.css'

type SaleType = 'SATIŞ' | 'TAKAS' | 'HİBE'

export default function SettingsMenuGrid() {
  const navigate = useNavigate()
  const [smsCode, setSmsCode] = useState('')
  const [saleType, setSaleType] = useState<SaleType>('SATIŞ')

  const openUserGuide = async () => {
    try {
      const result = await window.corventa.system.openUserGuide()
      if (!result.ok) {
        console.error('PDF açılamadı:', result.error)
        alert(`PDF açılamadı: ${result.error ?? 'bilinmeyen hata'}`)
      }
    } catch (err) {
      console.error('PDF IPC hatası:', err)
      alert('PDF açılamadı (IPC hatası).')
    }
  }

  return (
    <div className={styles.grid}>
      {/* ── LEFT COLUMN ───────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="GARANTİ SÜRESİ" onClick={() => navigate('/settings/warranty')} />
        <SettingsBtn label="BİG DATA BAĞLANTI AYARLARI" />
        <SettingsBtn label="KULLANICI YÖNETİMİ" />
        <SettingsBtn label={<>KIVRIM İÇİN VARSAYILAN HIZ : <span className={styles.highlight}>6m/dk</span></>} />
        <SettingsBtn label="KARŞILAMA MESAJI" onClick={() => navigate('/settings/welcome-message')} />
        <SettingsBtn label="CHECK LIST" onClick={() => navigate('/settings/checklist')} />
        <SettingsBtn label="PDF KULLANIM KİTABI" onClick={openUserGuide} />
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

        {/* Müşteri değişikliği — SMS onayı (büyütülmüş) */}
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

        {/* Satış / Takas / Hibe (büyütülmüş) */}
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
      </div>
    </div>
  )
}

/* ── Reusable plain button ───────────────────── */
function SettingsBtn({
  label,
  onClick,
}: {
  label: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button className={styles.settingsBtn} onClick={onClick}>
      <span className={styles.btnLabel}>{label}</span>
    </button>
  )
}
