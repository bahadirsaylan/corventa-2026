// EXCEL 28 — Makro OYNATMA. Adımlar mevcut manuel hareket uçlarıyla sırayla yürütülür
// (piston/rotasyon pozisyon, rotasyon mesafe, pnömatik yön) — büküm akışlarına dokunmaz.
//
// Her adımda tamamlanma beklenir (sabit süre değil, MachineState polling):
//   Piston   : önce STOP (PLC mode 0 → InPosition latch temizlenir; aynı hedef tekrar verilince de hareket etsin),
//              sonra pozisyon komutu → InPosition && !moving && |konum − hedef| ≤ 0.5 mm
//   Rotasyon : STOP + 150 ms (UnloadPartHandler ile aynı desen) → pozisyon/mesafe komutu →
//              InPosition && yön 0 && |konum − hedef| ≤ 2 mm. Hedef tamsayı mm (backend sözleşmesi).
//   Pnömatik : hedefe doğru yön ver, hedef geçilince / uç sınırda / ilerleme durunca STOP.
//              İlerleme durması SADECE hedefe yakınsa (uç sınıra dayandı) başarı sayılır; uzaktaysa
//              (hava yok / valf arızası) "PNÖMATİK İLERLEMİYOR" hatasıyla makro durur.
//              (Pnömatikte konum modu yok — hassasiyet 100 ms durum döngüsüyle sınırlı.)
// DURDUR her an tüm eksenleri durdurur. Acil stop, hidrolik motor düşmesi, makine verisi kesilmesi,
// ilerleme durması (stall) ve zaman aşımı → makro hata ile durur ve tüm eksenler durdurulur.
// Mod: 'continuous' (sürekli) veya 'step' (her adımdan önce operatör onayı).

import { create } from 'zustand'

import type { Macro, MacroStep } from '@shared/types'
import { MachineMode } from '@shared/types'
import { useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { macroErrorMessage, PISTON_BY_AXIS, PNEUMATIC_BY_AXIS, readAxisValue } from './macroAxes'

export type MacroRunMode = 'continuous' | 'step'
export type MacroRunStatus = 'idle' | 'running' | 'awaiting-confirm' | 'done' | 'stopped' | 'error'

const POLL_MS = 100
const PISTON_DONE_TOL_MM = 0.5
const PISTON_SKIP_TOL_MM = 0.05
const ROTATION_DONE_TOL_MM = 2
const ROTATION_SKIP_TOL_MM = 1
const PNEUMATIC_SKIP_TOL = 1
/** Stop komutundan sonra PLC'nin mode 0'ı işlemesi için bekleme */
const RESTART_DELAY_MS = 150
/** Bu süre boyunca eksen ilerlemezse "ilerlemiyor" hatası */
const STALL_MS = 10_000
const STALL_MIN_PROGRESS = 0.2
/** Pnömatik: bu süre boyunca encoder değişmezse uç sınıra dayandı sayılır */
const PNEUMATIC_STALL_MS = 1500
/** Pnömatik encoder gürültüsü: bundan küçük değişim hareket sayılmaz (gerçek makinede ~50 sayım/mm) */
const PNEUMATIC_NOISE = 3
/** İlerleme durduğunda hedefe bu kadar yakınsa "uç sınıra dayandı" kabul edilir (~1 mm); uzaksa hata */
const PNEUMATIC_END_TOL = 50
const PNEUMATIC_TIMEOUT_MS = 30_000
const STEP_TIMEOUT_MS = 180_000
/** Komuttan sonra tamamlanma bu süreden önce kabul edilmez (komut öncesi bayat durum okunmasın) */
const MIN_SETTLE_AFTER_CMD_MS = 300
/** Bu süre boyunca yeni MachineState gelmezse güvenlik için durdurulur */
const STATE_STALE_MS = 3000

interface MacroRunState {
  status: MacroRunStatus
  mode: MacroRunMode
  macroId: number | null
  /** Çalışan / onay bekleyen adım (0-index); -1 = başlamadı */
  currentIndex: number
  /** Tamamlanan adım sayısı */
  completed: number
  /** Son hata / durdurma nedeni (Türkçe — ekranda t() ile) */
  message: string | null
}

export const useMacroRunStore = create<MacroRunState>(() => ({
  status: 'idle',
  mode: 'continuous',
  macroId: null,
  currentIndex: -1,
  completed: 0,
  message: null,
}))

class MacroAbort extends Error {}

let runToken = 0
let confirmResolver: ((go: boolean) => void) | null = null
let lastStateAt = Date.now()
useMachineStateStore.subscribe(() => {
  lastStateAt = Date.now()
})

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function state() {
  return useMachineStateStore.getState().state
}

/** Çalışma sırasında her döngüde: iptal + güvenlik kontrolü */
function guard(token: number): void {
  if (token !== runToken) throw new MacroAbort('DURDURULDU')
  const s = state()
  if (!s.safety.emergencyStopOK) throw new Error('ACİL STOP AKTİF — MAKRO DURDURULDU')
  if (s.hydraulicMotorState !== 2) throw new Error('HİDROLİK MOTOR HAZIR DEĞİL — MAKRO DURDURULDU')
  if (Date.now() - lastStateAt > STATE_STALE_MS) throw new Error('MAKİNE VERİSİ GELMİYOR — MAKRO DURDURULDU')
}

/** Başlatma ön koşulları — sorun varsa mesaj, yoksa null */
export function macroStartBlockReason(): string | null {
  const s = state()
  if (!s.safety.emergencyStopOK) return 'ACİL STOP AKTİF'
  if (s.hydraulicMotorState !== 2) return 'HİDROLİK MOTOR HAZIR DEĞİL — BAŞLATMADAN HAREKET YAPILAMAZ'
  if (useBendingActivityStore.getState().active) return 'OTOMATİK BÜKÜM ÇALIŞIYOR — MAKRO BAŞLATILAMAZ'
  return null
}

/**
 * Kayıt bağlamı uyarıları (sadece piston adımı içeren makrolarda). Piston değerleri gönye referanslı
 * encoder değerleridir: stage geçişi encoder'ı sıfırlamaz (ChangeStageHandler), ama gönye yapılmadan
 * referans belirsizdir. Gönye durumu Bending API belleğinde tutulur (yeniden başlatınca "yapılmadı"
 * görünür) — bu yüzden engellenmez, oynatmadan önce operatöre güçlü onay sorulur.
 * Boş dizi = uyarı yok (bağlamı bilinmeyen eski makrolar dahil).
 */
export function macroContextWarnings(macro: Macro): string[] {
  if (!macro.steps.some((s) => PISTON_BY_AXIS[s.axis])) return []
  const pi = state().physicalInfo
  const out: string[] = []
  if (macro.recordedGonyeCompleted === true && !pi.isGonyeCompleted) {
    out.push('MAKRO GÖNYE SONRASI KAYDEDİLDİ — ŞU AN GÖNYE YAPILMAMIŞ GÖRÜNÜYOR')
  }
  if (macro.recordedStage != null && macro.recordedStage !== pi.currentStage) {
    out.push('MAKRONUN KAYDEDİLDİĞİ STAGE ŞU ANKİ STAGE İLE AYNI DEĞİL — PİSTONLAR KAYITTAKİ MUTLAK DEĞERLERE GİDER')
  }
  return out
}

/** Tüm eksenleri durdur (hata yutulur — durdurma her koşulda denenir) */
export async function stopAllAxes(): Promise<void> {
  const m = window.corventa.machine
  await Promise.allSettled([
    m.pistonStop('left'),
    m.pistonStop('right'),
    m.pistonStop('upper'),
    m.pistonStop('lower'),
    m.rotationStop(),
    m.pneumaticStop('left'),
    m.pneumaticStop('right'),
  ])
}

/** Koşul sağlanana kadar bekle; ilerleme (progressOf) STALL_MS boyunca değişmezse hata */
async function waitUntil(
  token: number,
  done: () => boolean,
  progressOf: () => number,
  what: string,
  timeoutMs = STEP_TIMEOUT_MS,
): Promise<void> {
  const t0 = Date.now()
  let ref = progressOf()
  let refAt = Date.now()
  for (;;) {
    guard(token)
    if (Date.now() - t0 >= MIN_SETTLE_AFTER_CMD_MS && done()) return
    const p = progressOf()
    if (Math.abs(p - ref) >= STALL_MIN_PROGRESS) {
      ref = p
      refAt = Date.now()
    } else if (Date.now() - refAt > STALL_MS) {
      throw new Error(`${what} İLERLEMİYOR — MAKRO DURDURULDU`)
    }
    if (Date.now() - t0 > timeoutMs) throw new Error(`${what} ZAMAN AŞIMI — MAKRO DURDURULDU`)
    await sleep(POLL_MS)
  }
}

async function runPistonStep(step: MacroStep, token: number): Promise<void> {
  const p = PISTON_BY_AXIS[step.axis]!
  const target = step.value
  if (Math.abs(state()[p.key].positionMm - target) <= PISTON_SKIP_TOL_MM) return
  // STOP → PLC InPosition latch'i temizlenir (jog InPosition'ı değiştirmez; aynı hedef tekrar gelirse hareket etmezdi)
  await window.corventa.machine.pistonStop(p.name)
  await sleep(RESTART_DELAY_MS)
  guard(token)
  await window.corventa.machine.pistonPosition({ piston: p.name, positionMm: target, speedPercent: step.speedPercent })
  await waitUntil(
    token,
    () => {
      const ps = state()[p.key]
      return ps.inPosition && !ps.moving && Math.abs(ps.positionMm - target) <= PISTON_DONE_TOL_MM
    },
    () => state()[p.key].positionMm,
    'PİSTON',
  )
}

async function runRotationStep(step: MacroStep, token: number): Promise<void> {
  const start = state().rotation.positionMm
  const isDistance = step.stepType === 'Distance'
  const amount = Math.round(step.value)
  const target = isDistance ? start + amount : amount
  if (isDistance ? Math.abs(amount) < 1 : Math.abs(start - target) <= ROTATION_SKIP_TOL_MM) return
  await window.corventa.machine.rotationStop()
  await sleep(RESTART_DELAY_MS)
  guard(token)
  if (isDistance) {
    // İşaret = yön (+ = encoder artar) — EngineApiClient backend { direction, distanceMm }'e çevirir
    await window.corventa.machine.rotationDistance({ distance: amount, speedPercent: step.speedPercent })
  } else {
    await window.corventa.machine.rotationPosition({ position: target, speedPercent: step.speedPercent })
  }
  await waitUntil(
    token,
    () => {
      const r = state().rotation
      return r.inPosition && r.activeDirection === 0 && Math.abs(r.positionMm - target) <= ROTATION_DONE_TOL_MM
    },
    () => state().rotation.positionMm,
    'ROTASYON',
  )
}

async function runPneumaticStep(step: MacroStep, token: number): Promise<void> {
  const side = PNEUMATIC_BY_AXIS[step.axis]!
  const read = () => readAxisValue(state(), step.axis)
  const pn = () => (side === 'left' ? state().leftPneumatic : state().rightPneumatic)
  const target = step.value
  const start = read()
  if (Math.abs(start - target) <= PNEUMATIC_SKIP_TOL) return
  // İleri (1) encoder'ı artırır, geri (-1) azaltır
  const direction: 1 | -1 = target > start ? 1 : -1
  try {
    await window.corventa.machine.pneumaticControl({ side, direction })
    const t0 = Date.now()
    let last = start
    let lastChangeAt = Date.now()
    for (;;) {
      guard(token)
      const v = read()
      const s = pn()
      if (direction > 0 ? v >= target : v <= target) break
      if (direction > 0 ? s.extended : s.retracted) break
      if (Math.abs(v - last) >= PNEUMATIC_NOISE) {
        last = v
        lastChangeAt = Date.now()
      } else if (Date.now() - lastChangeAt > PNEUMATIC_STALL_MS) {
        // İlerleme durdu: hedefe yakınsa uç sınıra dayandı (kayıtta da uç sınır okunmuştu) — kabul.
        // Uzaksa kol bilinmeyen yerde kalmış demektir (hava yok / valf arızası) — sonraki adıma GEÇİLMEZ.
        if (Math.abs(v - target) <= PNEUMATIC_END_TOL) break
        throw new Error('PNÖMATİK İLERLEMİYOR — MAKRO DURDURULDU')
      }
      if (Date.now() - t0 > PNEUMATIC_TIMEOUT_MS) throw new Error('PNÖMATİK ZAMAN AŞIMI — MAKRO DURDURULDU')
      await sleep(POLL_MS)
    }
  } finally {
    await window.corventa.machine.pneumaticStop(side).catch(() => undefined)
  }
}

async function runStep(step: MacroStep, token: number): Promise<void> {
  if (PISTON_BY_AXIS[step.axis]) return runPistonStep(step, token)
  if (step.axis === 'Rotation') return runRotationStep(step, token)
  return runPneumaticStep(step, token)
}

/** Adım adım modda operatör onayını bekle (DURDUR → false) */
function awaitConfirm(): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolver = resolve
  })
}

/** Makroyu oynat. startIndex'ten başlar. Bitince/durunca store'daki status güncellenir. */
export async function runMacro(macro: Macro, mode: MacroRunMode, startIndex = 0): Promise<void> {
  const st = useMacroRunStore.getState()
  if (st.status === 'running' || st.status === 'awaiting-confirm') return
  const block = macroStartBlockReason()
  if (block) {
    useMacroRunStore.setState({ status: 'error', message: block, macroId: macro.id, currentIndex: -1, completed: 0, mode })
    return
  }
  const token = ++runToken
  useMacroRunStore.setState({ status: 'running', mode, macroId: macro.id, currentIndex: startIndex, completed: startIndex, message: null })

  try {
    // Manuel ekrandaki gibi: komutlar Manuel modda gönderilir
    await window.corventa.machine.setMode(MachineMode.Manual)
    for (let i = startIndex; i < macro.steps.length; i++) {
      guard(token)
      if (mode === 'step') {
        useMacroRunStore.setState({ status: 'awaiting-confirm', currentIndex: i })
        const go = await awaitConfirm()
        if (!go || token !== runToken) throw new MacroAbort('DURDURULDU')
      }
      useMacroRunStore.setState({ status: 'running', currentIndex: i })
      await runStep(macro.steps[i], token)
      useMacroRunStore.setState({ completed: i + 1 })
    }
    if (token === runToken) {
      useMacroRunStore.setState({ status: 'done', currentIndex: -1, message: 'MAKRO TAMAMLANDI' })
    }
  } catch (err) {
    await stopAllAxes()
    // DURDUR'a basıldı (stopMacro durumu yazdı) — yukarıdaki ikinci stop, DURDUR anında yolda olan
    // hareket komutunun stop'tan SONRA işlenmesi ihtimaline karşı
    if (token !== runToken) return
    if (err instanceof MacroAbort) {
      useMacroRunStore.setState({ status: 'stopped', message: 'MAKRO DURDURULDU' })
    } else {
      const msg = macroErrorMessage(err)
      useMacroRunStore.setState({ status: 'error', message: msg || 'MAKRO HATASI' })
    }
  } finally {
    confirmResolver = null
  }
}

/** Adım adım modda bekleyen adımı onayla */
export function confirmMacroStep(): void {
  const r = confirmResolver
  confirmResolver = null
  r?.(true)
}

/** DURDUR — çalışan makroyu keser ve tüm eksenleri hemen durdurur */
export async function stopMacro(): Promise<void> {
  const st = useMacroRunStore.getState()
  const active = st.status === 'running' || st.status === 'awaiting-confirm'
  runToken++
  const r = confirmResolver
  confirmResolver = null
  r?.(false)
  await stopAllAxes()
  if (active) useMacroRunStore.setState({ status: 'stopped', message: 'MAKRO DURDURULDU' })
}

/** Ekran kapanırken / yeni makro seçilirken durumu sıfırla */
export function resetMacroRun(): void {
  useMacroRunStore.setState({ status: 'idle', macroId: null, currentIndex: -1, completed: 0, message: null })
}
