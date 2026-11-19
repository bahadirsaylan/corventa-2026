// GLOBAL UYARI KUYRUĞU (2026-11-19) — açılış / oturum uyarı pencereleri ÜST ÜSTE AÇILMAZ.
//
// Her uyarı penceresi (karşılama, bakım uyarısı, bakım hatırlatması, yağ kirlilik …) kendini bir "yuva" olarak
// ister: useAlertSlot(id, priority, want). Aynı anda SADECE ÖNDEKİ yuva görünür; diğerleri sırada bekler.
//   • Sıra: öndeki kapanınca (want=false) bekleyenlerden EN YÜKSEK ÖNCELİKLİ, eşitse EN ESKİ istenen öne geçer.
//   • Önleme yok: görünen pencere daha yüksek öncelikli biri gelince kapanmaz (okunan pencere kaybolmasın).
//   • Duraklatma (paused): büküm sürerken / büküme ait modal açıkken / alarm-tahliye ekranlarında hiçbir kuyruk
//     penceresi görünmez ve yeni pencere öne alınmaz; duraklatma bitince kaldığı yerden devam eder.
//     Büküm modalları (çok açılı segment, ölçüm hatası, iptal onayı, alarm sayfası) kuyruğa GİRMEZ — hiç gecikmez.
//   • Oturum değişince (giriş / çıkış) kuyruk sıfırlanır, yeni sessionId üretilir (uyarı kayıtlarında gruplama için).
//   • Girişten sonra kirlilik sensörü ilk kararını verene kadar (3 sn kararlılık; en fazla SETTLE_MAX_MS) hiçbir pencere
//     öne alınmaz: açılış uyarıları (bakım durumu, kirlilik) toplansın, ilk pencere yükleme hızına göre değil
//     ÖNCELİĞE göre seçilsin (kirlilik > bakım > karşılama).
// Sadece görünürlük düzeni — makineye komut göndermez, uyarıların içeriğini değiştirmez.

import { useEffect } from 'react'
import { create } from 'zustand'

import { useContaminationStore } from './contaminationStore'
import { useSessionStore } from './sessionStore'

/** Öncelik (büyük = önce). Aynı öncelikte ilk istenen önce. */
export const ALERT_PRIORITY = {
  /** Açılış güvenlik uyarısı (ileride pencere olursa — şu an alt şeritte) */
  safety: 100,
  /** Yağ kirlilik sensörü K1–K3 */
  contamination: 90,
  /** Vadesi geçmiş bakım / bakım kilidi */
  maintenanceAlert: 80,
  /** Bakım modu uzun süredir açık — DEVAM EDİYOR MUSUNUZ? */
  maintenanceReminder: 70,
  /** Bakım modu otomatik kapatıldı (bilgi) */
  maintenanceAutoClosed: 60,
  /** Karşılama mesajı */
  welcome: 50,
  /** Diğer bilgi pencereleri (bulut güncellemesi vb.) */
  info: 10,
} as const

interface Slot {
  id: string
  priority: number
  /** İstek sırası (eşit öncelikte FIFO) */
  seq: number
}

interface AlertQueueState {
  slots: Record<string, Slot>
  /** Öndeki yuva (duraklatma bitince görünür) */
  front: string | null
  /** Öndeki yuvanın ilk göründüğü an (ISO) — uyarı kaydında shownAt */
  frontShownAt: string | null
  paused: boolean
  /** Oturum kimliği — her girişte yeni */
  sessionId: string
}

let seqCounter = 0

/** Giriş sonrası ilk seçim en geç bu kadar bekler (makine verisi yoksa kirlilik kararı gelmez) */
const SETTLE_MAX_MS = 8_000
let holdUntil = 0
let holdTimer: ReturnType<typeof setTimeout> | null = null

/** Açılış bekletmesi sürüyor mu */
function holding(): boolean {
  return Date.now() < holdUntil
}

/** Bekletmeyi en geç ms sonra bitir ve o anda ilk seçimi yap */
function releaseHoldIn(ms: number): void {
  holdUntil = Math.min(holdUntil, Date.now() + ms)
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = setTimeout(() => { holdTimer = null; update(() => ({})) }, Math.max(0, holdUntil - Date.now()) + 20)
}

function newSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export const useAlertQueueStore = create<AlertQueueState>(() => ({
  slots: {},
  front: null,
  frontShownAt: null,
  paused: false,
  sessionId: newSessionId(),
}))

/** Ön yuvayı yeniden seç (önleme yok: mevcut ön yuva istenmeye devam ediyorsa kalır) */
function pickFront(s: AlertQueueState): Partial<AlertQueueState> {
  if (s.front && s.slots[s.front]) {
    // Görünür hale geldiyse (duraklatma bitti) ilk görünme anını yaz
    if (!s.paused && !s.frontShownAt) return { frontShownAt: new Date().toISOString() }
    return {}
  }
  if (s.paused || holding()) return s.front ? { front: null, frontShownAt: null } : {}
  let best: Slot | null = null
  for (const slot of Object.values(s.slots)) {
    if (!best || slot.priority > best.priority || (slot.priority === best.priority && slot.seq < best.seq)) best = slot
  }
  return { front: best?.id ?? null, frontShownAt: best ? new Date().toISOString() : null }
}

function update(fn: (s: AlertQueueState) => Partial<AlertQueueState>): void {
  useAlertQueueStore.setState((s) => {
    const next = { ...s, ...fn(s) }
    return { ...next, ...pickFront(next) }
  })
}

export function requestAlertSlot(id: string, priority: number): void {
  if (useAlertQueueStore.getState().slots[id]?.priority === priority) return
  update((s) => ({
    slots: { ...s.slots, [id]: { id, priority, seq: s.slots[id]?.seq ?? ++seqCounter } },
  }))
}

export function releaseAlertSlot(id: string): void {
  if (!useAlertQueueStore.getState().slots[id]) return
  update((s) => {
    const slots = { ...s.slots }
    delete slots[id]
    return s.front === id ? { slots, front: null, frontShownAt: null } : { slots }
  })
}

export function setAlertQueuePaused(paused: boolean): void {
  if (useAlertQueueStore.getState().paused === paused) return
  update(() => ({ paused }))
}

/** Öndeki yuvanın ilk göründüğü an (ISO) — sadece o yuva için, yoksa şimdi */
export function alertShownAt(id: string): string {
  const s = useAlertQueueStore.getState()
  return (s.front === id && s.frontShownAt) || new Date().toISOString()
}

export function alertSessionId(): string {
  return useAlertQueueStore.getState().sessionId
}

/**
 * Uyarı penceresi kuyruğa katılır: want=true iken sıraya girer; dönen değer true ise ŞİMDİ çizilmeli.
 * want=false olunca (kapatıldı / koşul kalktı) yuvayı bırakır, sıradaki öne geçer.
 */
export function useAlertSlot(id: string, priority: number, want: boolean): boolean {
  useEffect(() => {
    if (want) requestAlertSlot(id, priority)
    else releaseAlertSlot(id)
  }, [id, priority, want])
  useEffect(() => () => releaseAlertSlot(id), [id])
  return useAlertQueueStore((s) => want && !s.paused && s.front === id)
}

// Oturum değişince kuyruk + oturum kimliği sıfırlanır (pencereler kendi bayraklarını sessionStore'dan alır)
useSessionStore.subscribe((s, prev) => {
  if (s.username === prev.username) return
  holdUntil = s.username ? Date.now() + SETTLE_MAX_MS : 0
  if (s.username) releaseHoldIn(SETTLE_MAX_MS)
  useAlertQueueStore.setState({ slots: {}, front: null, frontShownAt: null, sessionId: newSessionId() })
})

// Kirlilik ilk kararı gelince açılış bekletmesi biter → ilk pencere öncelik sırasıyla seçilir.
// 150 ms pay: kirlilik penceresinin yuva isteği (React effect) önce kuyruğa girsin.
useContaminationStore.subscribe((s, prev) => {
  if (s.decided && !prev.decided && holding()) releaseHoldIn(150)
})
