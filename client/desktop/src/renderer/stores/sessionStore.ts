// Oturumdaki kullanıcı — şimdilik giriş ekranına yazılan kullanıcı adı (şifre doğrulaması henüz yok).
// Kullanıcıya özel tercihler (ör. sağ hızlı menü) bu anahtarla DataApi'de saklanır.
// Rol/yetki sistemi gelince aynı store gerçek kullanıcı kimliğiyle beslenir.

import { create } from 'zustand'

const DEFAULT_USER_KEY = 'varsayilan'

interface SessionStore {
  username: string | null
  /** Girişten hemen sonra karşılama mesajı gösterilecek mi (gösterilince kapanır) */
  showWelcome: boolean
  setUsername: (username: string | null) => void
  dismissWelcome: () => void
  clear: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  username: null,
  showWelcome: false,
  setUsername: (username) => set({ username: username?.trim() || null }),
  dismissWelcome: () => set({ showWelcome: false }),
  clear: () => set({ username: null, showWelcome: false }),
}))

/** Giriş başarılı — kullanıcıyı yaz ve karşılama mesajını bir kez göster. */
export function startSession(username: string): void {
  useSessionStore.setState({ username: username.trim() || null, showWelcome: true })
}

/** Kullanıcı adı → DataApi anahtarı (a-z 0-9 . _ -, en fazla 64). Boşsa "varsayilan". */
export function toUserKey(username: string | null | undefined): string {
  if (!username) return DEFAULT_USER_KEY
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' }
  const key = username
    .trim()
    .replace(/[çğıöşüİ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return key || DEFAULT_USER_KEY
}

export function useUserKey(): string {
  return toUserKey(useSessionStore((s) => s.username))
}
