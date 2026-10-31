// Aktif kullanıcı + rol rozeti — Ayarlar başlığı ve sağ hızlı menüde gösterilir (rol sistemi 2026-11-01).
// Rol rengi: OPERATÖR mavi, ADMİN turuncu, SÜPERADMİN kırmızı (endüstriyel durum renkleri).

import { ROLE_LABELS } from '@/constants/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useT } from '@/i18n'
import styles from './UserBadge.module.css'

export default function UserBadge({ layout = 'inline' }: { layout?: 'inline' | 'stacked' }) {
  const t = useT()
  const displayName = useSessionStore((s) => s.displayName)
  const username = useSessionStore((s) => s.username)
  const role = useSessionStore((s) => s.role)
  if (!role) return null
  return (
    <div className={styles.badge} data-layout={layout}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span className={styles.name}>{displayName || username}</span>
      <span className={styles.role} data-role={role}>
        {t(ROLE_LABELS[role])}
      </span>
    </div>
  )
}
