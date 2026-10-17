import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserGuideViewer from '@/components/UserGuideViewer/UserGuideViewer'
import { useT } from '@/i18n'
import styles from './SettingsMenuGrid.module.css'

export default function SettingsMenuGrid() {
  const navigate = useNavigate()

  // PDF kılavuz uygulama içinde (kiosk'tan çıkmadan) tam ekran açılır
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className={styles.grid}>
      {showGuide && <UserGuideViewer onClose={() => setShowGuide(false)} />}
      {/* ── LEFT COLUMN ───────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="GARANTİ SÜRESİ" onClick={() => navigate('/settings/warranty')} />
        <SettingsBtn label="BİG DATA BAĞLANTI AYARLARI" onClick={() => navigate('/settings/big-data')} />
        <SettingsBtn label="KULLANICI YÖNETİMİ" onClick={() => navigate('/settings/users')} />
        <SettingsBtn label="OPERATÖR AYARLARI" onClick={() => navigate('/settings/operator')} />
        <SettingsBtn label="KARŞILAMA MESAJI" onClick={() => navigate('/settings/welcome-message')} />
        <SettingsBtn label="CHECK LIST" onClick={() => navigate('/settings/checklist')} />
        <SettingsBtn label="PDF KULLANIM KİTABI" onClick={() => setShowGuide(true)} />
        <SettingsBtn label="BAKIM SÜRESİ" onClick={() => navigate('/settings/maintenance')} />
        <SettingsBtn label="CETVEL SIFIRLAMA" onClick={() => navigate('/settings/encoder-reset')} />
      </div>

      {/* ── RIGHT COLUMN ──────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="HATA RAPORLARI" onClick={() => navigate('/settings/error-reports')} />
        <SettingsBtn label="KULLANMA SÜRELERİ" onClick={() => navigate('/settings/machine-hours')} />
        <SettingsBtn label="KIVRIM ADETLERİ RAPORU" onClick={() => navigate('/settings/bending-count')} />
        <SettingsBtn label="DİL SEÇİMİ" onClick={() => navigate('/settings/language')} />
        <SettingsBtn label="SERTİFİKA SORGULA" onClick={() => navigate('/settings/certificate')} />
        <SettingsBtn label="MÜŞTERİ DEĞİŞİKLİĞİ" onClick={() => navigate('/settings/customer-change')} />
        <SettingsBtn label="SATIŞ / TAKAS / HİBE" onClick={() => navigate('/settings/machine-transfer')} />
        <SettingsBtn label="HIZLI MENÜ" onClick={() => navigate('/settings/side-menu')} />
        <SettingsBtn label="ADMİN AYARLARI" onClick={() => navigate('/settings/admin')} />
      </div>
    </div>
  )
}

/* ── Reusable plain button ───────────────────── */
function SettingsBtn({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
  const tr = useT()
  return (
    <button className={styles.settingsBtn} onClick={onClick}>
      <span className={styles.btnLabel}>{tr(label)}</span>
    </button>
  )
}
