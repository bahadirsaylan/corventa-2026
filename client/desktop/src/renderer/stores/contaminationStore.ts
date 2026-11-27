// YAĞ KİRLİLİK UYARISI (2026-11-19) — K1–K3 kirlilik sensörlerinin KARARLI durumu (anlık titreşim değil).
// Kaynak: MachineState.safety.contaminationK1..3 (true = KİRLİ veya sensör / kablo arızalı — ModbusPlcDriver çevirir).
// Kural: makine verisi taze (ilk durum geldi + son güncelleme < 2 sn) olmalı.
// 2026-11-27 (kullanıcı): her sensör AYRI ayrı, ContaminationMinDurationSec'ten (vars. 5 sn) UZUN kesintisiz kirli
// demeli — anlık basınçlarda gelen kısa kirli sinyali yok sayılır; temiz 10 sn sürmeli. Yağ sıcaklığı
// ContaminationModalMinOilTempC'nin (vars. 35 °C) altındaysa sadece alt şeritte uyarı (pencere açılmaz — modalAllowed).
// Bu store'u AlertQueueHost'taki useContaminationWatcher günceller; uyarı penceresi ve alt şerit buradan okur.
// Sadece uyarı — hiçbir hareketi engellemez.

import { useEffect, useRef } from 'react'
import { create } from 'zustand'

import { useConnectionStore } from './connectionStore'
import { useMachineStateStore } from './machineStateStore'
import { useSessionStore } from './sessionStore'

export type ContaminationSensor = 'K1' | 'K2' | 'K3'

const SENSORS: ContaminationSensor[] = ['K1', 'K2', 'K3']
const DEFAULT_DIRTY_SEC = 5
const DEFAULT_MODAL_MIN_TEMP_C = 35
const CLEAN_STABLE_MS = 10_000
const FRESH_MS = 2_000
const TICK_MS = 500
const SETTINGS_REFRESH_MS = 30_000

interface ContaminationState {
  /** Kararlı kirli sensörler (sıralı); boş = temiz / bilinmiyor */
  dirty: ContaminationSensor[]
  /** Bu oturumda penceresi gösterilip kapatılmış kirli küme anahtarı ("K1,K3"); temiz kalınca sıfırlanır */
  promptedKey: string | null
  /** Oturum açıldıktan sonra ilk karar verildi mi — uyarı kuyruğu ilk seçimi bunu bekler */
  decided: boolean
  /** 2026-11-27 — yağ sıcaklığı pencere eşiğinde / üstünde mi (altındaysa sadece alt şerit) */
  modalAllowed: boolean
}

export const useContaminationStore = create<ContaminationState>(() => ({ dirty: [], promptedKey: null, decided: false, modalAllowed: true }))

export const contaminationKey = (list: readonly string[]): string => list.join(',')

interface Fresh {
  raw: Record<ContaminationSensor, boolean>
  oilTempC: number | null
}

function readFresh(): Fresh | null {
  const m = useMachineStateStore.getState()
  const stale = useConnectionStore.getState().staleMs
  if (!m.hasReceivedFirstUpdate || !(stale < FRESH_MS)) return null
  const sf = m.state.safety
  const t = m.state.sensors?.oilTempC
  return {
    raw: { K1: !!sf.contaminationK1, K2: !!sf.contaminationK2, K3: !!sf.contaminationK3 },
    oilTempC: typeof t === 'number' && Number.isFinite(t) ? t : null,
  }
}

/** AlertQueueHost'ta bir kez — kararlı kirli kümeyi hesaplar (oturum açıkken) */
export function useContaminationWatcher(enabled: boolean): void {
  // Sensör başına: ham değer + o değerin kesintisiz başladığı an + kararlı değer
  const track = useRef<Record<ContaminationSensor, { raw: boolean; since: number; stable: boolean | null }> | null>(null)
  const startedAt = useRef(0)
  const cfg = useRef({ dirtyMs: DEFAULT_DIRTY_SEC * 1000, modalMinTempC: DEFAULT_MODAL_MIN_TEMP_C })
  useEffect(() => {
    if (!enabled) {
      track.current = null
      useContaminationStore.setState({ dirty: [], promptedKey: null, decided: false, modalAllowed: true })
      return
    }
    startedAt.current = Date.now()
    // Ayarlar (MachineSettings) — okunamazsa varsayılan 5 sn / 35 °C
    let alive = true
    const loadCfg = async () => {
      try {
        const m = (await window.corventa.settings.getMachine()) as Record<string, unknown>
        if (!alive) return
        const sec = Number(m.contaminationMinDurationSec)
        const temp = Number(m.contaminationModalMinOilTempC)
        cfg.current = {
          dirtyMs: (Number.isFinite(sec) && sec >= 1 ? Math.min(sec, 60) : DEFAULT_DIRTY_SEC) * 1000,
          modalMinTempC: Number.isFinite(temp) && temp >= 0 ? temp : DEFAULT_MODAL_MIN_TEMP_C,
        }
      } catch {
        /* backend yok — varsayılanlar */
      }
    }
    void loadCfg()
    const cfgTimer = setInterval(() => void loadCfg(), SETTINGS_REFRESH_MS)

    const tick = () => {
      const now = Date.now()
      const f = readFresh()
      if (f == null) return // veri yok / bayat — karar verme (son kararlı durum korunur)
      if (track.current == null) {
        track.current = {
          K1: { raw: f.raw.K1, since: now, stable: null },
          K2: { raw: f.raw.K2, since: now, stable: null },
          K3: { raw: f.raw.K3, since: now, stable: null },
        }
      }
      const tr = track.current
      for (const k of SENSORS) {
        const t = tr[k]
        if (t.raw !== f.raw[k]) {
          t.raw = f.raw[k]
          t.since = now // değişti → süre baştan (kesintisiz olmalı)
          continue
        }
        const elapsed = now - t.since
        if (t.raw ? elapsed > cfg.current.dirtyMs : elapsed >= CLEAN_STABLE_MS) t.stable = t.raw
      }
      const list = SENSORS.filter((k) => tr[k].stable === true)
      const key = contaminationKey(list)
      const st = useContaminationStore.getState()
      // Pencere sadece yağ eşikte / üstündeyken (sıcaklık okunamazsa pencere açılır — eski davranış)
      const modalAllowed = cfg.current.modalMinTempC <= 0 || f.oilTempC == null || f.oilTempC >= cfg.current.modalMinTempC
      if (contaminationKey(st.dirty) !== key) {
        // Tamamen temiz → bir sonraki kirlenmede pencere yeniden açılır
        useContaminationStore.setState(list.length === 0 ? { dirty: [], promptedKey: null } : { dirty: list })
      }
      if (st.modalAllowed !== modalAllowed) useContaminationStore.setState({ modalAllowed })
      // İlk karar: kirlilik süresi kadar gözlem yapıldı (kirli bekleniyorsa o süre dolmuş olur)
      if (!st.decided && now - startedAt.current > cfg.current.dirtyMs) useContaminationStore.setState({ decided: true })
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    return () => {
      alive = false
      clearInterval(id)
      clearInterval(cfgTimer)
    }
  }, [enabled])
}

export function markContaminationPrompted(key: string): void {
  useContaminationStore.setState({ promptedKey: key })
}

// Oturum değişince (çıkış → yeni giriş: AppLayout yeniden kurulur) kirlilik kararı ve "gösterildi" bilgisi sıfırlanır —
// yeni kullanıcıya kirli sensör uyarısı yeniden gösterilir, uyarı kuyruğu ilk kararı yeniden bekler.
useSessionStore.subscribe((s, prev) => {
  if (s.username !== prev.username) useContaminationStore.setState({ dirty: [], promptedKey: null, decided: false, modalAllowed: true })
})
