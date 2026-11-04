// EXCEL 27 — güvenlik uyarıları (encoder durması + açılış / büküm başı yağ sıcaklığı ve sensör kontrolü).
// Kaynak: DataApi /corventa MachineEvent'leri (backend SafetyMonitorService / SafetyCheckService).
// Sadece GÖRÜNÜR UYARI — hiçbir hareketi / büküm başlatmayı engellemez (engel backend'de, ayara bağlı).
//
// Gösterim: alt panel uyarı şeridi (BottomStatsPanel). Operatör KAPAT ile gizler; aynı olay tekrar gösterilmez.
//   SafetyCheck: backend son durumu yayınlar (sorun yoksa "info") → info gelince uyarı kendiliğinden kalkar.
//   EncoderStall: anlık olay — eksen başına son uyarı, operatör kapatana kadar (en fazla 10 dk) kalır.
//   /corventa bağlanınca cache replay gelir: 10 dk'dan eski encoder uyarısı gösterilmez.

import { create } from 'zustand'

import {
  EventMessageType,
  EventTypes,
  type EncoderStallPayload,
  type MachineEvent,
  type SafetyAxis,
  type SafetyCheckPayload,
} from '@shared/types'

/** Encoder durma uyarısı bu süreden eskiyse gösterilmez (cache replay / unutulmuş uyarı) */
const STALL_SHOW_WINDOW_MS = 10 * 60_000

export interface StallAlert {
  key: string // timestamp + eksen — kapatılanı tekrar göstermemek için
  at: number
  payload: EncoderStallPayload
}

export interface CheckAlert {
  key: string
  at: number
  level: 'warning' | 'error'
  payload: SafetyCheckPayload
}

interface SafetyAlertsState {
  stalls: Partial<Record<SafetyAxis, StallAlert>>
  check: CheckAlert | null
  dismissed: Record<string, true>
  ingest: (evt: MachineEvent) => void
  dismissStall: (axis: SafetyAxis) => void
  dismissCheck: () => void
}

function eventMs(evt: MachineEvent): number {
  const ms = Date.parse(evt.timestamp)
  return Number.isFinite(ms) ? ms : Date.now()
}

export const useSafetyAlertsStore = create<SafetyAlertsState>((set, get) => ({
  stalls: {},
  check: null,
  dismissed: {},

  ingest: (evt) => {
    if (evt.eventType === EventTypes.EncoderStall) {
      const p = evt.payload as EncoderStallPayload | null
      if (!p?.axis) return
      const at = eventMs(evt)
      const key = `${evt.timestamp}|${p.axis}`
      if (Date.now() - at > STALL_SHOW_WINDOW_MS || get().dismissed[key]) return
      set((s) => ({ stalls: { ...s.stalls, [p.axis]: { key, at, payload: p } } }))
      return
    }

    if (evt.eventType === EventTypes.SafetyCheck) {
      const p = evt.payload as SafetyCheckPayload | null
      if (!p) return
      // Sorun yok → önceki uyarı kalkar (durum düzeldi)
      if (evt.messageType === EventMessageType.Info || (!p.blocked && (p.warnings?.length ?? 0) === 0)) {
        set({ check: null })
        return
      }
      const key = evt.timestamp
      if (get().dismissed[key]) return
      set({
        check: {
          key,
          at: eventMs(evt),
          level: evt.messageType === EventMessageType.Error || p.blocked ? 'error' : 'warning',
          payload: p,
        },
      })
    }
  },

  dismissStall: (axis) =>
    set((s) => {
      const a = s.stalls[axis]
      if (!a) return s
      const stalls = { ...s.stalls }
      delete stalls[axis]
      return { stalls, dismissed: { ...s.dismissed, [a.key]: true } }
    }),

  dismissCheck: () =>
    set((s) => (s.check ? { check: null, dismissed: { ...s.dismissed, [s.check.key]: true } } : s)),
}))

/** En yeni encoder durma uyarısı (gösterim süresi içinde) */
export function selectLatestStall(stalls: Partial<Record<SafetyAxis, StallAlert>>, nowMs = Date.now()): StallAlert | null {
  let best: StallAlert | null = null
  for (const a of Object.values(stalls)) {
    if (!a || nowMs - a.at > STALL_SHOW_WINDOW_MS) continue
    if (!best || a.at > best.at) best = a
  }
  return best
}

const AXIS_LABELS: Record<SafetyAxis, string> = {
  Right: 'SAĞ PİSTON',
  Left: 'SOL PİSTON',
  Upper: 'ÜST PİSTON',
  Lower: 'ALT PİSTON',
  Rotation: 'ROTASYON',
}

type T = (source: string, vars?: Record<string, string | number>) => string

export function stallAlertText(a: StallAlert, t: T): string {
  return t('ENCODER DURMASI — {axis}: {ms} ms İÇİNDE İLERLEME YOK, MEKANİK / CETVEL KONTROL EDİN', {
    axis: t(AXIS_LABELS[a.payload.axis] ?? a.payload.axis),
    ms: a.payload.windowMs,
  })
}

/** Şeritte tek satır: en önemli uyarı (+ diğerlerinin sayısı) */
export function checkAlertText(a: CheckAlert, t: T): string {
  const p = a.payload
  const warnings = p.warnings ?? []
  const order = ['OilTempCritical', 'OilTempSensorFault', 'S1PressureSensorFault', 'S2PressureSensorFault', 'OilTempHigh']
  const sorted = [...warnings].sort((x, y) => {
    const ix = order.indexOf(x.code)
    const iy = order.indexOf(y.code)
    return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy)
  })
  const first = sorted[0]
  let text: string
  if (p.blocked) {
    text = t('YAĞ SICAKLIĞI ÇOK YÜKSEK ({v}°C) — BÜKÜM BAŞLATILMADI', { v: p.oilTempC })
  } else if (!first) {
    return ''
  } else {
    switch (first.code) {
      case 'OilTempCritical':
        text = t('YAĞ SICAKLIĞI ÇOK YÜKSEK ({v}°C, SINIR {limit}°C)', { v: p.oilTempC, limit: p.oilTempBlockC })
        break
      case 'OilTempHigh':
        text = t('YAĞ SICAKLIĞI YÜKSEK ({v}°C, UYARI {limit}°C)', { v: p.oilTempC, limit: p.oilTempWarnC })
        break
      case 'OilTempSensorFault':
        text = t('YAĞ SICAKLIĞI SENSÖRÜ ARALIK DIŞI ({v}°C) — SENSÖR / KABLO KONTROL EDİN', { v: p.oilTempC })
        break
      case 'S1PressureSensorFault':
        text = t('S1 BASINÇ SENSÖRÜ ARALIK DIŞI — SENSÖR / KABLO KONTROL EDİN')
        break
      case 'S2PressureSensorFault':
        text = t('S2 BASINÇ SENSÖRÜ ARALIK DIŞI — SENSÖR / KABLO KONTROL EDİN')
        break
      default:
        text = first.message
    }
  }
  const others = p.blocked ? warnings.filter((w) => w.code !== 'OilTempCritical').length : warnings.length - 1
  return others > 0 ? `${text} ${t('(+{n} UYARI)', { n: others })}` : text
}
