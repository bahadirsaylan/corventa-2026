// Karşılama mesajı — Ayarlar > Karşılama Mesajı'nda düzenlenir (bu cihazda, localStorage),
// kullanıcı girişinden sonra ana ekranda bir kez gösterilir (WelcomeOverlay).

export const WELCOME_STORAGE_KEY = 'corventa.welcomeMessage'
export const WELCOME_MAX_LENGTH = 500
export const WELCOME_DEFAULT_MESSAGE =
  'CORVENTA BENDING MACHINE\n\nMakineyi seçtiğiniz için teşekkür ederiz.\nİyi çalışmalar dileriz.'

/** Kayıtlı mesaj; yoksa null (varsayılan mesaj kullanılır ve seçili dile çevrilir). */
export function readWelcomeMessage(): string | null {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY)
  } catch {
    return null
  }
}
