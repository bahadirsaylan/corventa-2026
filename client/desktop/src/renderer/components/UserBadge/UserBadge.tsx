// Aktif kullanıcı + rol rozeti — Ayarlar başlığı ve sağ hızlı menüde gösterilir (rol sistemi 2026-11-01).
// Rol rengi: OPERATÖR mavi, ADMİN turuncu, SÜPERADMİN kırmızı (endüstriyel durum renkleri).

import { ROLE_LABELS } from '@/constants/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './UserBadge.module.css'

export default function UserBadge({ layout = 'inline' }: { layout?: 'inline' | 'stacked' }) {
  const t = useT()
  const displayName = useSessionStore((s) => s.displayName)
  const username = useSessionStore((s) => s.username)
  const role = useSessionStore((s) => s.role)
  if (!role) return null
  return (
    <div className={styles.badge} data-layout={layout}>
      <Icon name="user" size={18} className={styles.icon} />
      <span className={styles.name}>{displayName || username}</span>
      <span className={styles.role} data-role={role}>
        {t(ROLE_LABELS[role])}
      </span>
    </div>
  )
}
