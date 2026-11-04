// Oturum durumu — rol sistemi (2026-11-01).
//
// Token SADECE burada (main süreç belleğinde) tutulur; renderer'a asla verilmez, diske yazılmaz.
// Uygulama yeniden açılınca oturum yoktur → giriş ekranı. Renderer yeniden yüklenirse (dev reload)
// main'deki oturum sürer; renderer auth:get-current ile kimliği geri alır.
//
// DataApi'ye giden her isteğe (oturum açıkken) Authorization: Bearer eklenir — http.ts başlık sağlayıcısı.
// Bugün token isteyen uçlar: /api/users, /api/auth/logout|me, PUT /api/maintenance/rules. Diğer DataApi
// uçları başlığı yok sayar; ileride [RequireRole] eklenirse UI tarafında değişiklik gerekmez.

import { getConfig } from '@main/config/runtime-config'
import { setRequestHeaderProvider } from '@main/lib/http'
import { ROLE_RANK, type AuthUser, type UserRole } from '@shared/types'

interface Session {
  token: string
  expiresAt: string | null
  user: AuthUser
}

let session: Session | null = null

export function setAuthSession(token: string, expiresAt: string | null, user: AuthUser): void {
  session = { token, expiresAt, user }
}

export function clearAuthSession(): void {
  session = null
}

/** Süresi dolmuş oturum yok sayılır (backend de 401 döner) */
function activeSession(): Session | null {
  if (!session) return null
  if (session.expiresAt) {
    const exp = Date.parse(session.expiresAt)
    if (Number.isFinite(exp) && exp <= Date.now()) {
      session = null
      return null
    }
  }
  return session
}

export function getAuthToken(): string | null {
  return activeSession()?.token ?? null
}

export function getAuthUser(): AuthUser | null {
  return activeSession()?.user ?? null
}

/** Açık oturumun rolü en az `min` mi — main'de verilen kararlar için (örn. kiosk çıkışı) */
export function sessionHasRole(min: UserRole): boolean {
  const user = getAuthUser()
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[min]
}

/** http katmanına kaydet — sadece DataApi adresine giden isteklere Bearer eklenir */
export function installAuthHeaderProvider(): void {
  setRequestHeaderProvider((url) => {
    const token = getAuthToken()
    if (!token) return undefined
    if (!url.startsWith(getConfig().dataApi.baseUrl)) return undefined
    return { Authorization: `Bearer ${token}` }
  })
}
