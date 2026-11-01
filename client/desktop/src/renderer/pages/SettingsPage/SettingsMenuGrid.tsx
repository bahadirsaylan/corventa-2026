import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserGuideViewer from '@/components/UserGuideViewer/UserGuideViewer'
import { LockIcon } from '@/components/RoleNotice/LockIcon'
import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import { PERMISSIONS, type Permission } from '@/constants/permissions'
import { useCan } from '@/stores/sessionStore'
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
        <SettingsBtn label="GARANTİ SÜRESİ" permission="warranty" onClick={() => navigate('/settings/warranty')} />
        <SettingsBtn label="BULUT BAĞLANTISI" permission="big-data" onClick={() => navigate('/settings/big-data')} />
        <SettingsBtn label="KULLANICI YÖNETİMİ" permission="user-management" onClick={() => navigate('/settings/users')} />
        <SettingsBtn label="OPERATÖR AYARLARI" permission="operator-settings" onClick={() => navigate('/settings/operator')} />
        <SettingsBtn label="KARŞILAMA MESAJI" permission="welcome-message" onClick={() => navigate('/settings/welcome-message')} />
        <SettingsBtn label="CHECK LIST" permission="checklist" onClick={() => navigate('/settings/checklist')} />
        <SettingsBtn label="PDF KULLANIM KİTABI" permission="pdf-guide" onClick={() => setShowGuide(true)} />
        <SettingsBtn label="BAKIM SÜRESİ" permission="maintenance" onClick={() => navigate('/settings/maintenance')} />
        <SettingsBtn label="KALIP KODU SORGULA" permission="mold-query" onClick={() => navigate('/settings/mold-code')} />
        {/* CETVEL SIFIRLAMA → Admin Ayarları > GÖNYE & STAGE sekmesine taşındı (sadece admin) */}
      </div>

      {/* ── RIGHT COLUMN ──────────────────────────── */}
      <div className={styles.col}>
        <SettingsBtn label="HATA RAPORLARI" permission="error-reports" onClick={() => navigate('/settings/error-reports')} />
        <SettingsBtn label="BÜKÜM GEÇMİŞİ" permission="bending-history" onClick={() => navigate('/settings/bending-history')} />
        <SettingsBtn label="KULLANMA SÜRELERİ" permission="machine-hours" onClick={() => navigate('/settings/machine-hours')} />
        <SettingsBtn label="KIVRIM ADETLERİ RAPORU" permission="bending-count" onClick={() => navigate('/settings/bending-count')} />
        <SettingsBtn label="DİL SEÇİMİ" permission="language" onClick={() => navigate('/settings/language')} />
        <SettingsBtn label="SERTİFİKA SORGULA" permission="certificate" onClick={() => navigate('/settings/certificate')} />
        <SettingsBtn label="KALIP KÜTÜPHANESİ" permission="mold-library" onClick={() => navigate('/settings/mold-library')} />
        {/* SATIŞ / TAKAS / HİBE → MÜŞTERİ DEĞİŞİKLİĞİ içinde "neden" adımı (madde 17) */}
        <SettingsBtn label="MÜŞTERİ DEĞİŞİKLİĞİ" permission="customer-change" onClick={() => navigate('/settings/customer-change')} />
        <SettingsBtn label="HIZLI MENÜ" permission="side-menu" onClick={() => navigate('/settings/side-menu')} />
        <SettingsBtn label="ADMİN AYARLARI" permission="admin-settings" onClick={() => navigate('/settings/admin')} />
      </div>
    </div>
  )
}

/* ── Reusable plain button ───────────────────── */
// Rol yetmiyorsa gizlenmez: soluk + kilit; dokununca "BU İŞLEM İÇİN {ROL} YETKİSİ GEREKLİ" (permissions.ts)
function SettingsBtn({
  label,
  permission,
  onClick,
}: {
  label: string
  permission: Permission
  onClick?: () => void
}) {
  const tr = useT()
  const allowed = useCan(permission)
  return (
    <button
      className={`${styles.settingsBtn} ${allowed ? '' : styles.locked}`}
      onClick={allowed ? onClick : () => showRoleNotice(PERMISSIONS[permission])}
      aria-disabled={!allowed || undefined}
    >
      <span className={styles.btnLabel}>{tr(label)}</span>
      {!allowed && <LockIcon className={styles.lockIcon} />}
    </button>
  )
}
