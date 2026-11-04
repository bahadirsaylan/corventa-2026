// Bulut v2 yönetilen veriler (GET /api/cloud/config, BULUT_API_V2.md §6) — garanti, bakım politikası, checklist
// şablonu, karşılama mesajı, servis noktaları, servis taleplerinin bulut durumu.
// DataApi önbelleğinden okunur; bulut aktive değilse alanlar boş (source 'local') → sayfalar eski yerel davranışta
// kalır. DataApi yoksa / eski sürümse config null kalır (yine yerel davranış). Sayfalar useCloudConfig() ile okur;
// 30 sn'den eskiyse açılışta tazelenir.

import { useEffect } from 'react'
import { create } from 'zustand'
import type { CloudConfig } from '@shared/types'

const STALE_MS = 30_000

interface CloudConfigState {
  config: CloudConfig | null
  loaded: boolean
  error: string | null
  loadedAt: number
  load: (force?: boolean) => Promise<CloudConfig | null>
}

let inflight: Promise<CloudConfig | null> | null = null

export const useCloudConfigStore = create<CloudConfigState>((set, get) => ({
  config: null,
  loaded: false,
  error: null,
  loadedAt: 0,
  load: (force = false) => {
    const s = get()
    if (!force && s.loaded && Date.now() - s.loadedAt < STALE_MS) return Promise.resolve(s.config)
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const r = await window.corventa.cloud.getConfig()
        if (r.ok) {
          set({ config: r.data, loaded: true, error: null, loadedAt: Date.now() })
          return r.data
        }
        // Hata → son bilinen config korunur (yoksa null = yerel davranış)
        set({ loaded: true, error: r.error, loadedAt: Date.now() })
        return get().config
      } catch (e) {
        set({ loaded: true, error: e instanceof Error ? e.message : String(e), loadedAt: Date.now() })
        return get().config
      } finally {
        inflight = null
      }
    })()
    return inflight
  },
}))

/** Sayfa açılınca (bayatsa) tazeler ve güncel config'i döner (yoksa null) */
export function useCloudConfig(): CloudConfig | null {
  const config = useCloudConfigStore((s) => s.config)
  const load = useCloudConfigStore((s) => s.load)
  useEffect(() => {
    void load()
  }, [load])
  return config
}

/** Kaynak etiketi: cloud → BULUT, cache → ÖNBELLEK, local → YEREL (t() anahtarları) */
export function cloudSourceLabel(source: string | null | undefined): string | null {
  if (source === 'cloud') return 'BULUT'
  if (source === 'cache') return 'ÖNBELLEK'
  if (source === 'local') return 'YEREL'
  return null
}
