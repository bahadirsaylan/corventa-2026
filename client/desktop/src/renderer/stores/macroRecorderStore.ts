// EXCEL 28 — MAKRO KAYDI (usta öğrenme). CNC kodlama mantığı:
//   Usta manuel ekranda tuşlarla hareket ederken her hareket başlangıcı noteMotion(eksen, hız) ile bildirilir.
//   Aynı eksende ardışık hareketler birleşir (adım yazılmaz). FARKLI bir eksen hareket etmeye başlayınca
//   (veya kayıt bitince) önceki eksenin GERÇEK son değeri (encoder) adım olarak eklenir.
//   Örn. sol piston 125 → 130, sonra rotasyon → "SOL PİSTON 130" yazılır.
// Adım hemen sıraya konur (sıra korunsun), değeri eksen durup sabitlenince (en fazla 3 sn) kesinleşir.
// Eksen hiç hareket etmediyse (tuşa dokunup bırakıldı) adım silinir.
// Sadece renderer belleğinde tutulur; kayıt bitince isim + açıklama ile DataApi'ye yazılır.

import { create } from 'zustand'

import type { MacroAxis, MacroStep } from '@shared/types'
import {
  axisEpsilon,
  isAxisMoving,
  readAxisValue,
  roundAxisValue,
} from '@/services/macroAxes'

import { useMachineStateStore } from './machineStateStore'

/** Değerin kesinleşmesi için eksenin durup sabit kalması beklenir (en fazla bu kadar) */
const SETTLE_MAX_MS = 3000
const SETTLE_POLL_MS = 100
/** Bu kadar ardışık okumada değer değişmezse "sabit" sayılır */
const SETTLE_STABLE_READS = 3

interface RecordedStep extends MacroStep {
  /** Kayıt içi anahtar (kesinleştirme / silme için) */
  key: number
  /** Değer henüz kesinleşmedi (eksen duruyor/sabitleniyor) */
  pending: boolean
}

interface MacroRecorderState {
  recording: boolean
  steps: RecordedStep[]
  /** Şu an "açık" olan eksen (aynı eksende hareketler birleşir) */
  current: { axis: MacroAxis; speedPercent: number; startValue: number } | null

  start: () => void
  /** Bir eksen hareketi başlarken çağrılır (jog / pozisyon / pnömatik). Kayıt kapalıysa etkisiz. */
  noteMotion: (axis: MacroAxis, speedPercent: number) => void
  /** Kaydı bitirir: açık ekseni de yazar, bekleyen değerlerin kesinleşmesini bekler, adımları döner */
  finish: () => Promise<MacroStep[]>
  /** Kaydı ve adımları atar */
  discard: () => void
}

let nextKey = 1
let session = 0
const pendingSettles = new Set<Promise<void>>()

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export const useMacroRecorderStore = create<MacroRecorderState>((set, get) => {
  /** Ekseni adım olarak yaz: hemen sıraya koy, değeri durunca kesinleştir */
  function commit(cur: NonNullable<MacroRecorderState['current']>): void {
    const key = nextKey++
    const mySession = session
    const state = useMachineStateStore.getState().state
    const step: RecordedStep = {
      key,
      pending: true,
      axis: cur.axis,
      stepType: cur.axis === 'PneumaticLeft' || cur.axis === 'PneumaticRight' ? 'Pneumatic' : 'Position',
      value: roundAxisValue(cur.axis, readAxisValue(state, cur.axis)),
      speedPercent: cur.axis === 'PneumaticLeft' || cur.axis === 'PneumaticRight' ? 0 : cur.speedPercent,
    }
    set((s) => ({ steps: [...s.steps, step] }))

    const p = (async () => {
      const t0 = Date.now()
      let last = readAxisValue(useMachineStateStore.getState().state, cur.axis)
      let stable = 0
      while (Date.now() - t0 < SETTLE_MAX_MS) {
        await sleep(SETTLE_POLL_MS)
        const s = useMachineStateStore.getState().state
        const v = readAxisValue(s, cur.axis)
        stable = !isAxisMoving(s, cur.axis) && Math.abs(v - last) < 1e-6 ? stable + 1 : 0
        last = v
        if (stable >= SETTLE_STABLE_READS) break
      }
      if (mySession !== session) return // kayıt atıldı / yenisi başladı
      const finalValue = roundAxisValue(cur.axis, last)
      const moved = Math.abs(last - cur.startValue) >= axisEpsilon(cur.axis)
      set((s) => ({
        steps: moved
          ? s.steps.map((x) => (x.key === key ? { ...x, value: finalValue, pending: false } : x))
          : s.steps.filter((x) => x.key !== key),
      }))
    })()
    pendingSettles.add(p)
    void p.finally(() => pendingSettles.delete(p))
  }

  return {
    recording: false,
    steps: [],
    current: null,

    start: () => {
      session++
      set({ recording: true, steps: [], current: null })
    },

    noteMotion: (axis, speedPercent) => {
      const { recording, current } = get()
      if (!recording) return
      if (current && current.axis === axis) {
        // Aynı eksen — birleşir; son kullanılan hız geçerli
        set({ current: { ...current, speedPercent } })
        return
      }
      if (current) commit(current)
      const startValue = readAxisValue(useMachineStateStore.getState().state, axis)
      set({ current: { axis, speedPercent, startValue } })
    },

    finish: async () => {
      const { recording, current } = get()
      if (!recording) return []
      if (current) commit(current)
      set({ current: null })
      while (pendingSettles.size > 0) await Promise.all([...pendingSettles])
      set({ recording: false })
      return get().steps.map(({ key: _k, pending: _p, ...step }) => step)
    },

    discard: () => {
      session++
      set({ recording: false, steps: [], current: null })
    },
  }
})
