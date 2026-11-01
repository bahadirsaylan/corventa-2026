// Bulut bağlantı durumu (BULUT_API.md §4) — DataApi GET /api/cloud/status, IPC üzerinden.
// Hafif yoklama: uygulama genelinde 60 sn (alt paneldeki "GÜNCELLEME VAR" çipi), Bulut Bağlantısı
// sayfası açıkken 5 sn. Birden fazla abone → en kısa aralık geçerli (useCloudStatusPolling).

import { useEffect } from 'react'
import { create } from 'zustand'

import type { CloudStatus } from '@shared/types'

interface CloudStore {
  status: CloudStatus | null
  /** Son yoklama hatası (DataApi'ye ulaşılamadı vb.) — başarılı yoklamada temizlenir */
  error: string | null
  loaded: boolean
  refresh: () => Promise<void>
  /** Aksiyon cevabı yeni durumu getirdiyse doğrudan yaz */
  setStatus: (status: CloudStatus) => void
}

export const useCloudStore = create<CloudStore>((set) => ({
  status: null,
  error: null,
  loaded: false,
  refresh: async () => {
    try {
      const r = await window.corventa.cloud.getStatus()
      if (r.ok) set({ status: r.data, error: null, loaded: true })
      else set({ error: r.error, loaded: true })
    } catch (err) {
      set({ error: (err as Error).message, loaded: true })
    }
  },
  setStatus: (status) => set({ status, error: null, loaded: true }),
}))

// ── Ref-sayımlı yoklayıcı ──
const intervals = new Map<number, number>() // abone id → aralık ms
let nextId = 1
let timer: ReturnType<typeof setInterval> | null = null
let currentMs = 0

function reschedule(): void {
  const ms = intervals.size ? Math.min(...intervals.values()) : 0
  if (ms === currentMs) return
  if (timer) clearInterval(timer)
  timer = null
  currentMs = ms
  if (ms > 0) timer = setInterval(() => { void useCloudStore.getState().refresh() }, ms)
}

/** Bileşen açık kaldıkça bulut durumunu intervalMs aralıkla yoklar (ilk yoklama hemen) */
export function useCloudStatusPolling(intervalMs: number): void {
  useEffect(() => {
    const id = nextId++
    intervals.set(id, intervalMs)
    reschedule()
    void useCloudStore.getState().refresh()
    return () => {
      intervals.delete(id)
      reschedule()
    }
  }, [intervalMs])
}
