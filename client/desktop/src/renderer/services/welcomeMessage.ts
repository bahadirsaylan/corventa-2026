// Karşılama mesajı — 2026-11-19 (kullanıcı): HER KULLANICININ KENDİ mesajı. DataApi UserPreferences
// (prefKey "welcome-message", kullanıcı anahtarı toUserKey(username)) — hızlı menü düzeni gibi. Buluttan YÖNETİLMEZ.
// Ayarlar > Karşılama Mesajı'nda düzenlenir; girişten sonra ana ekranda bir kez gösterilir (WelcomeOverlay).
// Eski sürümde mesaj cihazda (localStorage) tutuluyordu — kullanıcının kaydı yoksa o eski mesaj okunur.

export const WELCOME_STORAGE_KEY = 'corventa.welcomeMessage'
export const WELCOME_PREF_KEY = 'welcome-message'
export const WELCOME_MAX_LENGTH = 500
export const WELCOME_DEFAULT_MESSAGE =
  'CORVENTA BENDING MACHINE\n\nMakineyi seçtiğiniz için teşekkür ederiz.\nİyi çalışmalar dileriz.'

function readLegacy(): string | null {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Kullanıcının kayıtlı mesajı; yoksa (eski cihaz kaydı da yoksa) null → varsayılan mesaj seçili dilde. */
export async function loadWelcomeMessage(userKey: string): Promise<string | null> {
  try {
    const pref = await window.corventa.settings.getUserPreference(userKey, WELCOME_PREF_KEY)
    if (pref) {
      const v = JSON.parse(pref.valueJson) as { message?: unknown }
      if (typeof v.message === 'string') return v.message
    }
  } catch (e) {
    console.warn('[welcome] kullanıcı mesajı okunamadı', e)
  }
  return readLegacy()
}

/** Kullanıcının mesajını kaydeder (null = varsayılana dön). */
export async function saveWelcomeMessage(userKey: string, message: string | null): Promise<void> {
  const value = message == null ? { version: 1, message: null } : { version: 1, message: message.slice(0, WELCOME_MAX_LENGTH) }
  await window.corventa.settings.putUserPreference(userKey, WELCOME_PREF_KEY, JSON.stringify(value))
}
