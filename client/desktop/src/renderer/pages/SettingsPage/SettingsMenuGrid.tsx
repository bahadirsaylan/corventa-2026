import { useNavigate } from 'react-router-dom'
import styles from './SettingsMenuGrid.module.css'

export default function SettingsMenuGrid() {
  const navigate = useNavigate()

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
        <SettingsBtn label="BİG DATA BAĞLANTI AYARLARI" onClick={() => navigate('/settings/big-data')} />
        <SettingsBtn label="KULLANICI YÖNETİMİ" onClick={() => navigate('/settings/users')} />
        <SettingsBtn
          label={<>KIVRIM İÇİN VARSAYILAN HIZ : <span className={styles.highlight}>6m/dk</span></>}
          onClick={() => navigate('/settings/default-speeds')}
        />
        <SettingsBtn label="KARŞILAMA MESAJI" onClick={() => navigate('/settings/welcome-message')} />
        <SettingsBtn label="CHECK LIST" onClick={() => navigate('/settings/checklist')} />
        <SettingsBtn label="PDF KULLANIM KİTABI" onClick={openUserGuide} />
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
