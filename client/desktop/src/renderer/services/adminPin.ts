// Admin ayarları PIN'i — DataApi kullanıcı tercihlerinde makineye ait kayıt olarak SHA-256 özeti tutulur.
// Kayıt yoksa varsayılan PIN geçerlidir (ilk kurulumda Admin Ayarları > PIN'den değiştirilmeli).
// Rol/yetki sistemi gelince bu kapı kullanıcının rolüyle değiştirilecek.

const USER_KEY = 'makine'
const PREF_KEY = 'admin-pin'
export const DEFAULT_ADMIN_PIN = '1234'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`corventa:${text}`))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function storedHash(): Promise<string | null> {
  try {
    const pref = await window.corventa.settings.getUserPreference(USER_KEY, PREF_KEY)
    const v = pref ? (JSON.parse(pref.valueJson) as { hash?: string }) : null
    return typeof v?.hash === 'string' ? v.hash : null
  } catch {
    return null
  }
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const hash = await storedHash()
  return (await sha256(pin)) === (hash ?? (await sha256(DEFAULT_ADMIN_PIN)))
}

export async function changeAdminPin(pin: string): Promise<void> {
  await window.corventa.settings.putUserPreference(USER_KEY, PREF_KEY, JSON.stringify({ hash: await sha256(pin) }))
}
