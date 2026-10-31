// Rol sistemi + oturum (DataApi /api/auth, /api/users) — 2026-11-01.
// Token SADECE main süreçte tutulur; renderer'a sadece AuthUser (kim + rol) gelir.
// Rol sırası: OPERATOR < ADMIN < SUPERADMIN (yetki matrisi renderer/constants/permissions.ts).

export type UserRole = 'OPERATOR' | 'ADMIN' | 'SUPERADMIN'

export const USER_ROLES: readonly UserRole[] = ['OPERATOR', 'ADMIN', 'SUPERADMIN'] as const

/** Rol sırası — büyük olan küçüğün her şeyini yapabilir */
export const ROLE_RANK: Record<UserRole, number> = { OPERATOR: 1, ADMIN: 2, SUPERADMIN: 3 }

/** Backend'den gelen rol metnini doğrula (bilinmeyen → OPERATOR, en düşük yetki) */
export function normalizeRole(role: unknown): UserRole {
  const r = String(role ?? '').trim().toUpperCase()
  return r === 'SUPERADMIN' || r === 'ADMIN' ? r : 'OPERATOR'
}

/** Oturumdaki kullanıcı — renderer'ın gördüğü tek kimlik bilgisi (token YOK) */
export interface AuthUser {
  username: string
  displayName: string
  role: UserRole
}

/** DataApi GET /api/users satırı (camelCase; tarihler ISO UTC) */
export interface UserListItem {
  id: number
  username: string
  displayName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  lockedUntil: string | null
}

export interface CreateUserBody {
  username: string
  displayName: string
  password: string
  role: UserRole
}

/** PUT /api/users/{id} — alanlar opsiyonel; password doluysa şifre sıfırlanır (kilit de açılır) */
export interface UpdateUserBody {
  displayName?: string
  role?: UserRole
  isActive?: boolean
  password?: string
}

/**
 * IPC sonuç zarfı — HTTP hataları fırlatılmaz, durum koduyla döner (renderer net mesaj seçer).
 * status 0 = DataApi'ye ulaşılamadı. lockedUntil: 423 (çok fazla yanlış şifre).
 */
export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; lockedUntil?: string | null }
