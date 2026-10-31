// Bakım durumu — tek merkezi kaynak (DataApi GET /api/maintenance).
// Alt uyarı şeridi, girişten sonraki bakım uyarı penceresi, bakım modu ekranı ve Bakım Süresi sayfası
// aynı state'i okur. AppLayout'ta bir kez startMaintenancePoller() çağrılır; 30 sn'de bir yenilenir
// (bakım modu başka yerden — ör. servis — açılırsa en geç 30 sn'de görünür).
//
// Bakım modunda geçen süre: DataApi'de "mod ne zaman açıldı" alanı YOK (UpdatedAt her bakım
// işaretlemesinde de değişiyor). Bu yüzden açılış anı bu cihazda tutulur (localStorage):
//   - mod bu ekrandan açılırsa veya kapalıdan açığa geçiş görülürse → o an kaydedilir
//   - uygulama mod zaten açıkken başlarsa ve kayıt yoksa → UpdatedAt yaklaşık değer olarak kullanılır
//   - mod kapanınca kayıt silinir.
// Sadece görünür bilgi — hiçbir hareketi / büküm başlatmayı engellemez, makineye komut göndermez.

import { create } from 'zustand'

import type { MaintenancePeriodKey, MaintenanceState } from '@shared/types'

const POLL_MS = 30_000
const MODE_SINCE_KEY = 'corventa.maintenanceModeSince'

interface MaintenanceStore {
  state: MaintenanceState | null
  /** İlk yükleme yapıldı mı (başarılı ya da hatalı) */
  loaded: boolean
  error: string | null
  /** Bakım modunun açıldığı an (ms) — mod kapalıysa null */
  modeSinceMs: number | null
  /** modeSinceMs yaklaşık mı (cihazda kayıt yoktu, DataApi UpdatedAt'ten alındı) */
  modeSinceApprox: boolean
  /**
   * Bakım modu ekranı küçültüldü mü (KÜÇÜLT — SAYFALARA DÖN). Bileşen state'inde değil burada:
   * otomatik büküm sırasında ekran kapanıp bitince yeniden açıldığında tam boya dönmesin.
   * Mod kapanınca veya kapalıdan açığa geçişte false'a döner.
   */
  screenCollapsed: boolean
}

export const useMaintenanceStore = create<MaintenanceStore>(() => ({
  state: null,
  loaded: false,
  error: null,
  modeSinceMs: null,
  modeSinceApprox: false,
  screenCollapsed: false,
}))

function readSince(): number | null {
  try {
    const v = Number(localStorage.getItem(MODE_SINCE_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function writeSince(ms: number | null): void {
  try {
    if (ms == null) localStorage.removeItem(MODE_SINCE_KEY)
    else localStorage.setItem(MODE_SINCE_KEY, String(ms))
  } catch {
    /* depolama kapalı — bu oturumda bellekte kalır */
  }
}

/** DataApi'den gelen yeni state'i yaz + bakım modu başlangıç anını güncelle. */
export function applyMaintenanceState(next: MaintenanceState): void {
  const prev = useMaintenanceStore.getState()
  let modeSinceMs: number | null = null
  let modeSinceApprox = false
  const wasOn = prev.state?.isInMaintenanceMode === true
  // Mod yeniden açıldı / kapandı → ekran yine tam boy gelsin
  const screenCollapsed = next.isInMaintenanceMode && wasOn ? prev.screenCollapsed : false
  if (next.isInMaintenanceMode) {
    if (wasOn && prev.modeSinceMs != null) {
      modeSinceMs = prev.modeSinceMs
      modeSinceApprox = prev.modeSinceApprox
    } else if (prev.state && !wasOn) {
      // Bu oturumda kapalıdan açığa geçiş görüldü → şimdi açıldı (en geç 30 sn gecikmeyle)
      modeSinceMs = Date.now()
      writeSince(modeSinceMs)
    } else {
      const stored = readSince()
      if (stored != null) {
        modeSinceMs = stored
      } else {
        const upd = Date.parse(next.updatedAt)
        modeSinceMs = Number.isFinite(upd) ? Math.min(upd, Date.now()) : Date.now()
        modeSinceApprox = true
      }
    }
  } else {
    writeSince(null)
  }
  useMaintenanceStore.setState({ state: next, loaded: true, error: null, modeSinceMs, modeSinceApprox, screenCollapsed })
}

/** Bakım modu ekranını küçült (sadece şerit) / tam boy aç. */
export function setMaintenanceScreenCollapsed(collapsed: boolean): void {
  useMaintenanceStore.setState({ screenCollapsed: collapsed })
}

/** Şimdi yenile (hata olursa son state korunur). */
export async function refreshMaintenance(): Promise<void> {
  try {
    const s = await window.corventa.settings.getMaintenance()
    if (s) applyMaintenanceState(s)
  } catch (err) {
    useMaintenanceStore.setState({
      loaded: true,
      error: (err as Error)?.message ?? 'Bakım durumu alınamadı',
    })
  }
}

/** Periyodu "şimdi yapıldı" işaretle (POST /api/maintenance/mark-completed). Hata fırlatır. */
export async function markMaintenancePeriodCompleted(period: MaintenancePeriodKey): Promise<MaintenanceState> {
  const updated = await window.corventa.settings.markMaintenanceCompleted(period)
  applyMaintenanceState(updated)
  return updated
}

/** Bakım modunu aç/kapat (POST /api/maintenance/mode). Hata fırlatır. */
export async function setMaintenanceModeOn(on: boolean): Promise<MaintenanceState> {
  const updated = await window.corventa.settings.setMaintenanceMode(on)
  if (on && !useMaintenanceStore.getState().state?.isInMaintenanceMode) {
    // Bu ekrandan açıldı → açılış anı kesin
    const now = Date.now()
    writeSince(now)
    useMaintenanceStore.setState({ modeSinceMs: now, modeSinceApprox: false })
  }
  applyMaintenanceState(updated)
  return updated
}

let pollerStarted = false

/** AppLayout'ta bir kez çağrılır. Dönen fonksiyon poller'ı durdurur. */
export function startMaintenancePoller(): () => void {
  if (pollerStarted) return () => {}
  pollerStarted = true
  void refreshMaintenance()
  const id = setInterval(() => void refreshMaintenance(), POLL_MS)
  return () => {
    clearInterval(id)
    pollerStarted = false
  }
}
