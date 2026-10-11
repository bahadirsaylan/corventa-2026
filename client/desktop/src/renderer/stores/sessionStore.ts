// Oturumdaki kullanıcı — şimdilik giriş ekranına yazılan kullanıcı adı (şifre doğrulaması henüz yok).
// Kullanıcıya özel tercihler (ör. sağ hızlı menü) bu anahtarla DataApi'de saklanır.
// Rol/yetki sistemi gelince aynı store gerçek kullanıcı kimliğiyle beslenir.

import { create } from 'zustand'

const DEFAULT_USER_KEY = 'varsayilan'

interface SessionStore {
  username: string | null
  setUsername: (username: string | null) => void
  clear: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  username: null,
  setUsername: (username) => set({ username: username?.trim() || null }),
  clear: () => set({ username: null }),
}))

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
