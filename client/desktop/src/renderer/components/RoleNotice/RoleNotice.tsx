// Yetki uyarısı — yetkisiz düğmeye dokunulunca / korumalı rotaya girilince kısa süreli üst bildirim:
// "BU İŞLEM İÇİN {ROL} YETKİSİ GEREKLİ". App.tsx'te global tek örnek; showRoleNotice() her yerden çağrılır.

import { useEffect } from 'react'
import { create } from 'zustand'

import type { UserRole } from '@shared/types'

import { ROLE_LABELS } from '@/constants/permissions'
import { useT } from '@/i18n'
import { LockIcon } from './LockIcon'
import styles from './RoleNotice.module.css'

const SHOW_MS = 2600

interface RoleNoticeState {
  role: UserRole | null
  seq: number
}

const useRoleNoticeStore = create<RoleNoticeState>(() => ({ role: null, seq: 0 }))

/** Kısa uyarıyı göster (aynı uyarıya tekrar dokunulursa süre yeniden başlar) */
export function showRoleNotice(role: UserRole): void {
  useRoleNoticeStore.setState((s) => ({ role, seq: s.seq + 1 }))
}

export default function RoleNotice() {
  const t = useT()
  const role = useRoleNoticeStore((s) => s.role)
  const seq = useRoleNoticeStore((s) => s.seq)

  useEffect(() => {
    if (!role) return
    const id = setTimeout(() => useRoleNoticeStore.setState({ role: null }), SHOW_MS)
    return () => clearTimeout(id)
  }, [role, seq])

  if (!role) return null
  return (
    <div key={seq} className={styles.toast} role="alert" onClick={() => useRoleNoticeStore.setState({ role: null })}>
      <LockIcon className={styles.icon} />
      <span>{t('BU İŞLEM İÇİN {role} YETKİSİ GEREKLİ', { role: t(ROLE_LABELS[role]) })}</span>
    </div>
  )
}
