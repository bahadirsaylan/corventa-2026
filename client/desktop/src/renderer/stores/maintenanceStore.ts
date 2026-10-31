// Bakım durumu — tek merkezi kaynak (DataApi GET /api/maintenance).
// Alt uyarı şeridi, girişten sonraki bakım uyarı penceresi, bakım modu ekranı, bakım hatırlatma
// penceresi ve Bakım Süresi sayfası aynı state'i okur. AppLayout'ta bir kez startMaintenancePoller()
// çağrılır; normalde 30 sn'de bir, HATIRLATMA aktifken 5 sn'de bir yenilenir (otomatik kapanma
// geri sayımı ve başka cihazdan DEVAM ET / BİTİR hızlı görünsün). Hatırlatma zamanı 30 sn'lik
// aralığın içine düşüyorsa bir sonraki yenileme o ana çekilir (pencere gecikmeden açılsın).
//
// BAKIM MODU KURALLARI (DataApi MaintenanceModeService, 2026-11-01):
//   - modeStartedAt: mod açılış anı backend'de tutulur → geçen süre ve periyot min süresi buradan.
//   - rules[]: periyot başına minimum bakım süresi — dolmadan "tamamlandı" 409 döner.
//   - reminderDueAt / reminderActive / autoCloseAt: belli süre sonra "DEVAM EDİYOR MUSUNUZ?"
//     hatırlatması; cevap verilmezse backend modu kendisi kapatır (lastAutoClosedAt dolar).
// Eski DataApi (bu alanlar yok) → açılış anı bu cihazda tutulur (localStorage, eski davranış):
//   - mod bu ekrandan açılırsa veya kapalıdan açığa geçiş görülürse → o an kaydedilir
//   - uygulama mod zaten açıkken başlarsa ve kayıt yoksa → UpdatedAt yaklaşık değer olarak kullanılır
//   - mod kapanınca kayıt silinir.
// Makineye komut göndermez; hiçbir hareketi engellemez.

import { create } from 'zustand'

import type { MaintenancePeriodKey, MaintenanceState } from '@shared/types'

const POLL_MS = 30_000
/** Hatırlatma penceresi açıkken yenileme aralığı */
const REMINDER_POLL_MS = 5_000
const MODE_SINCE_KEY = 'corventa.maintenanceModeSince'
/** Kullanıcının gördüğü (TAMAM'a bastığı) son otomatik kapanma — aynı bilgi tekrar gösterilmez */
const AUTO_CLOSED_ACK_KEY = 'corventa.maintenanceAutoClosedAck'
/** Bundan eski otomatik kapanma uygulama açılışında gösterilmez (sessizce görüldü sayılır) */
const AUTO_CLOSED_SHOW_WINDOW_MS = 12 * 3600_000

interface MaintenanceStore {
  state: MaintenanceState | null
  /** İlk yükleme yapıldı mı (başarılı ya da hatalı) */
  loaded: boolean
  error: string | null
  /** Bakım modunun açıldığı an (ms) — mod kapalıysa null */
  modeSinceMs: number | null
  /** modeSinceMs yaklaşık mı (backend alanı yok + cihazda kayıt yok, UpdatedAt'ten alındı) */
  modeSinceApprox: boolean
  /**
   * Bakım modu ekranı küçültüldü mü (KÜÇÜLT — SAYFALARA DÖN). Bileşen state'inde değil burada:
   * otomatik büküm sırasında ekran kapanıp bitince yeniden açıldığında tam boya dönmesin.
   * Mod kapanınca veya kapalıdan açığa geçişte false'a döner.
   */
  screenCollapsed: boolean
  /** Gösterilecek otomatik kapanma bilgisi (lastAutoClosedAt) — TAMAM'a basılınca null */
  autoClosedNotice: string | null
}

export const useMaintenanceStore = create<MaintenanceStore>(() => ({
  state: null,
  loaded: false,
  error: null,
  modeSinceMs: null,
  modeSinceApprox: false,
  screenCollapsed: false,
  autoClosedNotice: null,
}))

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* depolama kapalı — bu oturumda bellekte kalır */
  }
}

function readSince(): number | null {
  const v = Number(readStorage(MODE_SINCE_KEY))
  return Number.isFinite(v) && v > 0 ? v : null
}

function writeSince(ms: number | null): void {
  writeStorage(MODE_SINCE_KEY, ms == null ? null : String(ms))
}

/** ISO → ms (geçersiz / boş → null) */
export function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const v = Date.parse(iso)
  return Number.isFinite(v) ? v : null
}

/** Yeni otomatik kapanma var mı — görülmemiş ve yakın zamanda olmuşsa gösterilecek değer */
function pickAutoClosedNotice(next: MaintenanceState, current: string | null): string | null {
  const at = next.lastAutoClosedAt ?? null
  if (!at || at === current) return current
  if (readStorage(AUTO_CLOSED_ACK_KEY) === at) return current
  const ms = parseIsoMs(at)
  if (ms == null || Date.now() - ms > AUTO_CLOSED_SHOW_WINDOW_MS) {
    // Çok eski kapanma (ör. uygulama uzun süre kapalıydı) — bilgi penceresi açılmaz
    writeStorage(AUTO_CLOSED_ACK_KEY, at)
    return current
  }
  return at
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
    const backendSince = parseIsoMs(next.modeStartedAt)
    if (backendSince != null) {
      // Yeni DataApi — açılış anı backend'de (tüm cihazlarda aynı, kesin)
      modeSinceMs = Math.min(backendSince, Date.now())
    } else if (wasOn && prev.modeSinceMs != null) {
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
  const autoClosedNotice = pickAutoClosedNotice(next, prev.autoClosedNotice)
  useMaintenanceStore.setState({
    state: next, loaded: true, error: null, modeSinceMs, modeSinceApprox, screenCollapsed, autoClosedNotice,
  })
  reschedulePoll()
}

/** Bakım modu ekranını küçült (sadece şerit) / tam boy aç. */
export function setMaintenanceScreenCollapsed(collapsed: boolean): void {
  useMaintenanceStore.setState({ screenCollapsed: collapsed })
}

/** "BAKIM MODU OTOMATİK KAPATILDI" bilgisini kapat — aynı kapanma bir daha gösterilmez. */
export function dismissMaintenanceAutoClosedNotice(): void {
  const at = useMaintenanceStore.getState().autoClosedNotice
  if (at) writeStorage(AUTO_CLOSED_ACK_KEY, at)
  useMaintenanceStore.setState({ autoClosedNotice: null })
}

/**
 * Hatırlatma şu an aktif mi — backend reminderActive VEYA (yenileme arasında) reminderDueAt geçti.
 * Mod kapalıysa her zaman false.
 */
export function isMaintenanceReminderActive(state: MaintenanceState | null, nowMs: number = Date.now()): boolean {
  if (!state?.isInMaintenanceMode) return false
  if (state.reminderActive) return true
  const due = parseIsoMs(state.reminderDueAt)
  return due != null && nowMs >= due
}

/** Electron IPC hatayı "Error invoking remote method '...': Error: ..." diye sarar → ön eki at. */
export function maintenanceErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  return raw.replace(/^Error invoking remote method '[^']*':\s*/, '').replace(/^(Http)?Error:\s*/, '')
}

/** Şimdi yenile (hata olursa son state korunur). */
export async function refreshMaintenance(): Promise<void> {
  try {
    const s = await window.corventa.settings.getMaintenance()
    if (s) applyMaintenanceState(s)
  } catch (err) {
    useMaintenanceStore.setState({
      loaded: true,
      error: maintenanceErrorMessage(err) || 'Bakım durumu alınamadı',
    })
  }
}

/**
 * Periyodu "şimdi yapıldı" işaretle (POST /api/maintenance/mark-completed). Hata fırlatır —
 * 409: mod kapalı / minimum süre dolmadı (mesaj backend'den; maintenanceErrorMessage ile gösterin).
 */
export async function markMaintenancePeriodCompleted(period: MaintenancePeriodKey): Promise<MaintenanceState> {
  const updated = await window.corventa.settings.markMaintenanceCompleted(period)
  applyMaintenanceState(updated)
  return updated
}

/** Bakım modunu aç/kapat (POST /api/maintenance/mode). Hata fırlatır. */
export async function setMaintenanceModeOn(on: boolean): Promise<MaintenanceState> {
  const updated = await window.corventa.settings.setMaintenanceMode(on)
  if (on && !useMaintenanceStore.getState().state?.isInMaintenanceMode && !updated.modeStartedAt) {
    // Eski DataApi — bu ekrandan açıldı → açılış anı kesin
    const now = Date.now()
    writeSince(now)
    useMaintenanceStore.setState({ modeSinceMs: now, modeSinceApprox: false })
  }
  applyMaintenanceState(updated)
  return updated
}

/** Hatırlatmada DEVAM ET (POST /api/maintenance/continue) — hatırlatma süresi yeniden başlar. Hata fırlatır. */
export async function continueMaintenanceMode(): Promise<MaintenanceState> {
  const updated = await window.corventa.settings.continueMaintenanceMode()
  applyMaintenanceState(updated)
  return updated
}

// ── Yenileme zamanlayıcısı ─────────────────────────────────────────
let pollerStarted = false
let pollTimer: ReturnType<typeof setTimeout> | null = null

/** Sonraki yenilemeye kalan süre: hatırlatmada 5 sn; hatırlatma 30 sn içinde başlayacaksa o an. */
function nextPollDelay(): number {
  const { state } = useMaintenanceStore.getState()
  if (isMaintenanceReminderActive(state)) return REMINDER_POLL_MS
  const due = state?.isInMaintenanceMode ? parseIsoMs(state.reminderDueAt) : null
  if (due != null) {
    const until = due - Date.now() + 500
    if (until < POLL_MS) return Math.max(REMINDER_POLL_MS, until)
  }
  return POLL_MS
}

function reschedulePoll(): void {
  if (!pollerStarted) return
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = setTimeout(() => {
    pollTimer = null
    // Başarılı yenileme applyMaintenanceState → reschedulePoll çağırır; hatada burada yeniden kurulur
    void refreshMaintenance().finally(() => {
      if (pollerStarted && !pollTimer) reschedulePoll()
    })
  }, nextPollDelay())
}

/** AppLayout'ta bir kez çağrılır. Dönen fonksiyon poller'ı durdurur. */
export function startMaintenancePoller(): () => void {
  if (pollerStarted) return () => {}
  pollerStarted = true
  void refreshMaintenance().finally(() => {
    if (pollerStarted && !pollTimer) reschedulePoll()
  })
  return () => {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
    pollerStarted = false
  }
}
