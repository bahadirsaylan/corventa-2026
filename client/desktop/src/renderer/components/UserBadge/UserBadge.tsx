// Aktif kullanıcı + rol rozeti — Ayarlar başlığı ve sağ hızlı menüde gösterilir (rol sistemi 2026-11-01).
// Rol rengi (2026-11-16, 6 rol): constants/permissions.ts ROLE_COLORS (KULLANICI mavi … SÜPERADMİN kırmızı).
// EXCEL 40 (2026-11-16): tek seferlik KURULUM KULLANICISI ise rozetin yanında "KURULUMU TAMAMLA" düğmesi —
// onaylanınca hesap DataApi'de kalıcı pasifleşir ve girişe dönülür (bir daha giriş yapılamaz).

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { ROLE_COLORS, ROLE_SHORT_LABELS } from '@/constants/permissions'
import { completeSetupSession, useSessionStore } from '@/stores/sessionStore'
import { t as tr, useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './UserBadge.module.css'

export default function UserBadge({ layout = 'inline' }: { layout?: 'inline' | 'stacked' }) {
  const t = useT()
  const displayName = useSessionStore((s) => s.displayName)
  const username = useSessionStore((s) => s.username)
  const role = useSessionStore((s) => s.role)
  const isOneTimeSetup = useSessionStore((s) => s.isOneTimeSetup)
  if (!role) return null
  return (
    <div className={styles.badge} data-layout={layout}>
      <Icon name="user" size={18} className={styles.icon} />
      <span className={styles.name}>{displayName || username}</span>
      <span className={styles.role} data-role={role} style={{ backgroundColor: ROLE_COLORS[role] }}>
        {t(ROLE_SHORT_LABELS[role])}
      </span>
      {isOneTimeSetup && (
        <>
          <span className={styles.setupTag}>{t('KURULUM KULLANICISI')}</span>
          <CompleteSetupButton />
        </>
      )}
    </div>
  )
}

/** EXCEL 40 — KURULUMU TAMAMLA (onay penceresiyle) */
function CompleteSetupButton() {
  const t = useT()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await completeSetupSession()
      if (res.ok) {
        setConfirming(false)
        navigate('/login', { replace: true })
        return
      }
      setError(res.status === 0 ? tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN') : res.error)
    } catch {
      setError(tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={styles.completeBtn} onClick={() => setConfirming(true)} disabled={busy}>
        {t('KURULUMU TAMAMLA')}
      </button>
      {error && (
        <span className={styles.completeError} role="alert">
          {error}
        </span>
      )}
      {confirming &&
        createPortal(
          <ConfirmModal
            message="KURULUM TAMAMLANSIN MI? BU KURULUM KULLANICISI KALICI OLARAK PASİFLEŞECEK VE BİR DAHA GİRİŞ YAPILAMAYACAK."
            confirmLabel="KURULUMU TAMAMLA"
            variant="danger"
            onCancel={() => !busy && setConfirming(false)}
            onConfirm={() => void complete()}
          />,
          document.body,
        )}
    </>
  )
}
