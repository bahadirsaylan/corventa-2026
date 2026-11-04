// Oturumdaki kullanıcı — rol sistemi (2026-11-01): DataApi /api/auth/login ile doğrulanmış kimlik.
// Token main süreçte kalır; burada sadece { username, displayName, role } tutulur.
// Kullanıcıya özel tercihler (ör. sağ hızlı menü) toUserKey(username) anahtarıyla DataApi'de saklanır.
// Yetki kontrolleri: hasRole / useCan → constants/permissions.ts (tek yetki matrisi).

import { create } from 'zustand'

import type { AuthUser, UserRole } from '@shared/types'

import { hasRole as roleAtLeast, roleCan, type Permission } from '@/constants/permissions'

const DEFAULT_USER_KEY = 'varsayilan'

interface SessionStore {
  username: string | null
  displayName: string | null
  role: UserRole | null
  /** Girişten hemen sonra karşılama mesajı gösterilecek mi (gösterilince kapanır) */
  showWelcome: boolean
  /** Girişten sonra (karşılama mesajı kapanınca) bakım uyarı penceresi bir kez gösterilecek mi */
  showMaintenanceAlert: boolean
  setUsername: (username: string | null) => void
  dismissWelcome: () => void
  dismissMaintenanceAlert: () => void
  clear: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  username: null,
  displayName: null,
  role: null,
  showWelcome: false,
  showMaintenanceAlert: false,
  setUsername: (username) => set({ username: username?.trim() || null }),
  dismissWelcome: () => set({ showWelcome: false }),
  dismissMaintenanceAlert: () => set({ showMaintenanceAlert: false }),
  clear: () =>
    set({ username: null, displayName: null, role: null, showWelcome: false, showMaintenanceAlert: false }),
}))

/**
 * Giriş başarılı — kullanıcıyı yaz, karşılama mesajını ve (varsa) bakım uyarısını bir kez göster.
 * restore: renderer yeniden yüklendi, main'de oturum sürüyor → karşılama / bakım uyarısı tekrar açılmaz.
 */
export function startSession(user: AuthUser, opts: { restore?: boolean } = {}): void {
  const first = !opts.restore
  useSessionStore.setState({
    username: user.username.trim() || null,
    displayName: user.displayName?.trim() || user.username,
    role: user.role,
    showWelcome: first,
    showMaintenanceAlert: first,
  })
}

/** Oturumu kapat — main'deki token silinir + DataApi /api/auth/logout; store temizlenir */
export async function endSession(): Promise<void> {
  try {
    await window.corventa.auth.logout()
  } catch {
    /* main'e ulaşılamadı — yerel oturum yine kapanır */
  }
  useSessionStore.getState().clear()
}

/** Kullanıcı adı → DataApi anahtarı (a-z 0-9 . _ -, en fazla 64). Boşsa "varsayilan". */
export function toUserKey(username: string | null | undefined): string {
  if (!username) return DEFAULT_USER_KEY
  // Önce Türkçe küçük harfe çevir (Ç→ç, İ→i, I→ı …), sonra ASCII karşılığı — büyük Türkçe harfler '-' olmasın
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
  const key = username
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return key || DEFAULT_USER_KEY
}

export function useUserKey(): string {
  return toUserKey(useSessionStore((s) => s.username))
}

/** Oturumdaki rol (oturum yoksa null) */
export function useRole(): UserRole | null {
  return useSessionStore((s) => s.role)
}

/** Rol en az min mi — bileşen dışı (o anki oturum) ya da verilen rol için */
export function hasRole(min: UserRole, role: UserRole | null = useSessionStore.getState().role): boolean {
  return roleAtLeast(role, min)
}

/** Bileşenlerde: rol en az min mi (rol değişince yeniden çizilir) */
export function useHasRole(min: UserRole): boolean {
  return roleAtLeast(useRole(), min)
}

/** Bileşenlerde: yetki matrisine göre bu işlem serbest mi */
export function useCan(permission: Permission): boolean {
  return roleCan(useRole(), permission)
}
