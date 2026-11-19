// YAĞ KİRLİLİK UYARISI (2026-11-19) — K1–K3 kirlilik sensörlerinin KARARLI durumu (anlık titreşim değil).
// Kaynak: MachineState.safety.contaminationK1..3 (true = KİRLİ veya sensör / kablo arızalı — ModbusPlcDriver çevirir).
// Kural: makine verisi taze (ilk durum geldi + son güncelleme < 2 sn) olmalı; kirli küme 3 sn değişmeden sürmeli,
// temiz 10 sn sürmeli. Bu store'u AlertQueueHost'taki useContaminationWatcher günceller; uyarı penceresi ve alt
// şerit buradan okur. Sadece uyarı — hiçbir hareketi engellemez.

import { useEffect, useRef } from 'react'
import { create } from 'zustand'

import { useConnectionStore } from './connectionStore'
import { useMachineStateStore } from './machineStateStore'
import { useSessionStore } from './sessionStore'

export type ContaminationSensor = 'K1' | 'K2' | 'K3'

const DIRTY_STABLE_MS = 3_000
const CLEAN_STABLE_MS = 10_000
const FRESH_MS = 2_000
const TICK_MS = 500

interface ContaminationState {
  /** Kararlı kirli sensörler (sıralı); boş = temiz / bilinmiyor */
  dirty: ContaminationSensor[]
  /** Bu oturumda penceresi gösterilip kapatılmış kirli küme anahtarı ("K1,K3"); temiz kalınca sıfırlanır */
  promptedKey: string | null
  /** Oturum açıldıktan sonra ilk karar verildi mi (durum 3 sn değişmeden sürdü) — uyarı kuyruğu ilk seçimi bunu bekler */
  decided: boolean
}

export const useContaminationStore = create<ContaminationState>(() => ({ dirty: [], promptedKey: null, decided: false }))

export const contaminationKey = (list: readonly string[]): string => list.join(',')

function readDirty(): ContaminationSensor[] | null {
  const m = useMachineStateStore.getState()
  const stale = useConnectionStore.getState().staleMs
  if (!m.hasReceivedFirstUpdate || !(stale < FRESH_MS)) return null
  const sf = m.state.safety
  const out: ContaminationSensor[] = []
  if (sf.contaminationK1) out.push('K1')
  if (sf.contaminationK2) out.push('K2')
  if (sf.contaminationK3) out.push('K3')
  return out
}

/** AlertQueueHost'ta bir kez — kararlı kirli kümeyi hesaplar (oturum açıkken) */
export function useContaminationWatcher(enabled: boolean): void {
  const candidate = useRef<{ key: string; since: number } | null>(null)
  useEffect(() => {
    if (!enabled) {
      candidate.current = null
      useContaminationStore.setState({ dirty: [], promptedKey: null, decided: false })
      return
    }
    const tick = () => {
      const now = Date.now()
      const list = readDirty()
      if (list == null) return // veri yok / bayat — karar verme (son kararlı durum korunur)
      const key = contaminationKey(list)
      if (candidate.current?.key !== key) {
        candidate.current = { key, since: now }
        return
      }
      const elapsed = now - candidate.current.since
      const need = list.length > 0 ? DIRTY_STABLE_MS : CLEAN_STABLE_MS
      if (elapsed >= need && contaminationKey(useContaminationStore.getState().dirty) !== key) {
        // Temiz kaldı → bir sonraki kirlenmede pencere yeniden açılır
        useContaminationStore.setState(list.length === 0 ? { dirty: [], promptedKey: null } : { dirty: list })
      }
      // İlk karar (kirli kümeden SONRA): hangi değer olursa olsun 3 sn değişmeden sürdü (temizde 10 sn beklenmez)
      if (!useContaminationStore.getState().decided && elapsed >= DIRTY_STABLE_MS) useContaminationStore.setState({ decided: true })
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [enabled])
}

export function markContaminationPrompted(key: string): void {
  useContaminationStore.setState({ promptedKey: key })
}

// Oturum değişince (çıkış → yeni giriş: AppLayout yeniden kurulur) kirlilik kararı ve "gösterildi" bilgisi sıfırlanır —
// yeni kullanıcıya kirli sensör uyarısı yeniden gösterilir, uyarı kuyruğu ilk kararı yeniden bekler.
useSessionStore.subscribe((s, prev) => {
  if (s.username !== prev.username) useContaminationStore.setState({ dirty: [], promptedKey: null, decided: false })
})
