// Rol sistemi + oturum (DataApi /api/auth, /api/users) — 2026-11-01.
// Token SADECE main süreçte tutulur; renderer'a sadece AuthUser (kim + rol) gelir.
// Rol sırası (2026-11-16, test raporu "roller netleştirilmeli — atölye sorumlusuna admin verilemez"):
//   OPERATOR (ekranda KULLANICI) < SUPERVISOR (ATÖLYE SORUMLUSU) < SERVICEMAN (SERVİS TEKNİSYENİ) < DEALER (BAYİ)
//   < ADMIN (MAKİNE ÜRETİCİSİ) < SUPERADMIN (YAZILIM ÜRETİCİSİ).
// OPERATOR kodu korunur (mevcut DB satırları / oturumlar). Yetki matrisi renderer/constants/permissions.ts.

export type UserRole = 'OPERATOR' | 'SUPERVISOR' | 'SERVICEMAN' | 'DEALER' | 'ADMIN' | 'SUPERADMIN'

/** Düşükten yükseğe */
export const USER_ROLES: readonly UserRole[] = ['OPERATOR', 'SUPERVISOR', 'SERVICEMAN', 'DEALER', 'ADMIN', 'SUPERADMIN'] as const

/** Rol sırası — büyük olan küçüğün her şeyini yapabilir (DataApi UserRoles.Level ile aynı) */
export const ROLE_RANK: Record<UserRole, number> = {
  OPERATOR: 1,
  SUPERVISOR: 2,
  SERVICEMAN: 3,
  DEALER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

/** Backend'den gelen rol metnini doğrula (bilinmeyen → OPERATOR, en düşük yetki) */
export function normalizeRole(role: unknown): UserRole {
  const r = String(role ?? '').trim().toUpperCase()
  return (USER_ROLES as readonly string[]).includes(r) ? (r as UserRole) : 'OPERATOR'
}

/**
 * Kullanıcı yönetimi kuralı (2026-11-16, DataApi UserRoles.CanManage ile aynı): SUPERADMIN herkesi; diğerleri
 * SADECE kendi rolünden KESİN DÜŞÜK rolleri oluşturur / düzenler / pasifleştirir / atar.
 */
export function canManageRole(actor: UserRole | null | undefined, target: UserRole): boolean {
  if (!actor) return false
  if (actor === 'SUPERADMIN') return true
  return ROLE_RANK[target] < ROLE_RANK[actor]
}

/** EXCEL 40 — tek seferlik kurulum kullanıcısının alabileceği en yüksek rol */
export const ONE_TIME_SETUP_MAX_ROLE: UserRole = 'SERVICEMAN'

/** Oturumdaki kullanıcı — renderer'ın gördüğü tek kimlik bilgisi (token YOK) */
export interface AuthUser {
  username: string
  displayName: string
  role: UserRole
  /** EXCEL 40 — tek seferlik kurulum kullanıcısı (UI "KURULUMU TAMAMLA" düğmesini gösterir) */
  isOneTimeSetup?: boolean
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
  /** 'local' | 'cloud' (bulut kullanıcısı yerelden düzenlenemez) */
  source?: 'local' | 'cloud'
  /** EXCEL 40 — tek seferlik kurulum kullanıcısı */
  isOneTimeSetup?: boolean
  /** Kurulum kullanıcısının tek girişi (ISO UTC); doluysa hesap tekrar açılamaz */
  setupUsedAt?: string | null
}

export interface CreateUserBody {
  username: string
  displayName: string
  password: string
  role: UserRole
  /** EXCEL 40 — sadece ADMIN+; rol en fazla SERVICEMAN */
  isOneTimeSetup?: boolean
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
