// İnternet erişim durumu (EXCEL 37) — main süreçteki ConnectivityService'ten (Google generate_204, 30 sn) beslenir.
// Sadece bilgi amaçlı gösterim: alt panel şeridindeki ağ ikonu + Big Data sayfasındaki ayrıntı kartı.

import { create } from 'zustand'

import type { InternetStatus } from '@shared/types'

interface InternetStore {
  status: InternetStatus
  setStatus: (status: InternetStatus) => void
  /** Hemen kontrol et — sonuç ayrıca push event ile de gelir */
  checkNow: () => Promise<void>
}

const INITIAL_STATUS: InternetStatus = {
  state: 'unknown',
  checking: false,
  lastCheckedAt: null,
  lastOnlineAt: null,
  latencyMs: null,
  target: null,
  error: null,
  simulated: false,
}

export const useInternetStore = create<InternetStore>((set) => ({
  status: INITIAL_STATUS,
  setStatus: (status) => set({ status }),
  checkNow: async () => {
    try {
      const status = await window.corventa.system.checkInternetNow()
      set({ status })
    } catch {
      // IPC hatası — son bilinen durum kalır
    }
  },
}))
