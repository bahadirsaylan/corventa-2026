// İnternet erişim durumu (EXCEL 37 — "Google bağlantısı denenecek").
// Main süreçteki ConnectivityService 30 sn'de bir Google generate_204 ucunu dener; sonuç IPC ile renderer'a gelir.

export type InternetState = 'unknown' | 'online' | 'offline'

export interface InternetStatus {
  /** unknown = henüz hiç kontrol yapılmadı */
  state: InternetState
  /** Şu an bir kontrol sürüyor mu (durum ikonu titremesin diye state ayrı tutulur) */
  checking: boolean
  /** Son tamamlanan kontrolün zamanı (ISO) — hiç kontrol yoksa null */
  lastCheckedAt: string | null
  /** Son başarılı kontrolün zamanı (ISO) */
  lastOnlineAt: string | null
  /** Son başarılı isteğin gecikmesi (ms) — offline ise null */
  latencyMs: number | null
  /** Cevap veren uç (www.google.com / clients3.google.com) */
  target: string | null
  /** Offline ise son hata metni (teknik, log amaçlı) */
  error: string | null
  /** Demo modunda gerçek istek atılmaz, hep online varsayılır */
  simulated: boolean
}
