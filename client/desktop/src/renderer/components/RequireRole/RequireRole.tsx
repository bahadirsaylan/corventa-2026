// Rota korumaları — rol sistemi (2026-11-01).
//   <RequireAuth>  : oturum yoksa girişe döner. Renderer yeniden yüklendiyse (main'de oturum sürüyorsa)
//                    kimliği main'den geri alır — kontrol bitene kadar hiçbir şey çizmez.
//   <RequireRole>  : yetki matrisine (constants/permissions.ts) göre rol yetmezse /settings'e yönlendirir
//                    ve "BU İŞLEM İÇİN {ROL} YETKİSİ GEREKLİ" uyarısını gösterir.

import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { hasRole, PERMISSIONS, type Permission } from '@/constants/permissions'
import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import { startSession, useCan, useSessionStore } from '@/stores/sessionStore'

/** Yetkili (ADMIN+) oturumun main'de hâlâ geçerli olup olmadığını yoklama aralığı */
const SESSION_CHECK_MS = 60_000

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const loggedIn = useSessionStore((s) => s.role != null)
  const [checking, setChecking] = useState(!loggedIn)

  useEffect(() => {
    if (loggedIn) {
      setChecking(false)
      return
    }
    let alive = true
    setChecking(true)
    window.corventa.auth
      .getCurrent()
      .then((user) => {
        if (!alive) return
        if (user) startSession(user, { restore: true })
        else navigate('/login', { replace: true })
      })
      .catch(() => {
        if (alive) navigate('/login', { replace: true })
      })
      .finally(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [loggedIn, navigate])

  // Oturum süresi (12 sa) main'de dolunca renderer'daki rol kendiliğinden düşmez. ADMIN+ yetkisi bu yüzden
  // açık kalmasın: dakikada bir main'e sor, oturum yoksa store'u temizle → yukarıdaki effect girişe döner.
  // OPERATOR'da yapılmaz (en düşük yetki — sızan yetki yok; büküm ortasında girişe atılmasın).
  const privileged = useSessionStore((s) => s.role != null && hasRole(s.role, 'ADMIN'))
  useEffect(() => {
    if (!privileged) return
    const id = window.setInterval(() => {
      window.corventa.auth
        .getCurrent()
        .then((user) => {
          if (!user) useSessionStore.getState().clear()
        })
        .catch(() => {
          /* main'e ulaşılamadı — bir sonraki turda tekrar dene */
        })
    }, SESSION_CHECK_MS)
    return () => window.clearInterval(id)
  }, [privileged])

  if (checking || !loggedIn) return null
  return <>{children}</>
}

export default function RequireRole({ permission, children }: { permission: Permission; children: ReactNode }) {
  const allowed = useCan(permission)
  const navigate = useNavigate()

  useEffect(() => {
    if (allowed) return
    showRoleNotice(PERMISSIONS[permission])
    navigate('/settings', { replace: true })
  }, [allowed, permission, navigate])

  return allowed ? <>{children}</> : null
}
