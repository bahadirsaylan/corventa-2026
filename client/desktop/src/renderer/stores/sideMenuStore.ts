// Sağ hızlı menü düzeni — kullanıcıya özel, DataApi'de (UserPreferences, prefKey "side-menu").
// Okunamazsa varsayılan düzen kullanılır; menü hiçbir zaman boş kalmaz (sabit seçenekler hep var).

import { create } from 'zustand'
import {
  SIDE_MENU_PREF_KEY,
  defaultSideMenuOrder,
  normalizeSideMenuOrder,
  type SideMenuItemId,
  type SideMenuPrefValue,
} from '@/constants/sideMenuCatalog'

interface SideMenuStore {
  userKey: string | null
  items: SideMenuItemId[]
  load: (userKey: string) => Promise<void>
  save: (userKey: string, items: SideMenuItemId[]) => Promise<void>
}

export const useSideMenuStore = create<SideMenuStore>((set, get) => ({
  userKey: null,
  items: defaultSideMenuOrder(),

  load: async (userKey) => {
    set({ userKey, items: defaultSideMenuOrder() })
    try {
      const pref = await window.corventa.settings.getUserPreference(userKey, SIDE_MENU_PREF_KEY)
      if (get().userKey !== userKey) return // bu arada kullanıcı değişti
      if (!pref) return
      const parsed = JSON.parse(pref.valueJson) as Partial<SideMenuPrefValue>
      set({ items: normalizeSideMenuOrder(parsed.items) })
    } catch (e) {
      console.warn('[side-menu] tercih okunamadı, varsayılan kullanılıyor', e)
    }
  },

  save: async (userKey, items) => {
    const normalized = normalizeSideMenuOrder(items)
    const value: SideMenuPrefValue = { version: 1, items: normalized }
    await window.corventa.settings.putUserPreference(userKey, SIDE_MENU_PREF_KEY, JSON.stringify(value))
    if (get().userKey === userKey) set({ items: normalized })
  },
}))
