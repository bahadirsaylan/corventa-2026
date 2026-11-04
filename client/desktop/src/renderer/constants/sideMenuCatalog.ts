// Sağ hızlı menü kataloğu — menüye eklenebilecek seçenekleri BİZ belirleriz.
// Kullanıcı Ayarlar > Hızlı Menü'den bunları açıp kapatır ve sıralar (DataApi'de kullanıcıya özel saklanır).
// Yeni seçenek eklemek: bu listeye bir satır + gerekiyorsa SideMenuIcons'a ikon.
//   fixed: true          → kapatılamaz (her zaman menüde, sadece sırası değişir)
//   defaultEnabled: true → kullanıcının kaydı yoksa menüde görünür
//   lockWhileBending     → otomatik büküm sürerken pasif

export type SideMenuItemId = 'new-bending' | 'home' | 'service' | 'settings' | 'logout'

export type SideMenuAction =
  | { type: 'route'; to: string }
  | { type: 'new-bending' }
  | { type: 'logout' }

export interface SideMenuCatalogItem {
  id: SideMenuItemId
  label: string
  icon: 'plus' | 'home' | 'service' | 'gear' | 'logout'
  action: SideMenuAction
  fixed?: boolean
  defaultEnabled?: boolean
  lockWhileBending?: boolean
}

export const SIDE_MENU_CATALOG: SideMenuCatalogItem[] = [
  { id: 'new-bending', label: 'YENİ BÜKÜM', icon: 'plus', action: { type: 'new-bending' }, defaultEnabled: true, lockWhileBending: true },
  { id: 'home', label: 'ANA EKRAN', icon: 'home', action: { type: 'route', to: '/dashboard' }, fixed: true, defaultEnabled: true },
  { id: 'service', label: 'SERVİS', icon: 'service', action: { type: 'route', to: '/service' }, defaultEnabled: true },
  { id: 'settings', label: 'AYARLAR', icon: 'gear', action: { type: 'route', to: '/settings' } },
  { id: 'logout', label: 'OTURUMU KAPAT', icon: 'logout', action: { type: 'logout' }, fixed: true, defaultEnabled: true, lockWhileBending: true },
]

export const SIDE_MENU_PREF_KEY = 'side-menu'

const byId = new Map(SIDE_MENU_CATALOG.map((i) => [i.id, i]))

export function catalogItem(id: string): SideMenuCatalogItem | undefined {
  return byId.get(id as SideMenuItemId)
}

export function defaultSideMenuOrder(): SideMenuItemId[] {
  return SIDE_MENU_CATALOG.filter((i) => i.defaultEnabled).map((i) => i.id)
}

/** Kayıtlı listeyi doğrula: bilinmeyenleri at, tekrarları at, sabitleri (yoksa) ekle. */
export function normalizeSideMenuOrder(ids: unknown): SideMenuItemId[] {
  if (!Array.isArray(ids)) return defaultSideMenuOrder()
  const out: SideMenuItemId[] = []
  for (const id of ids) {
    if (typeof id === 'string' && byId.has(id as SideMenuItemId) && !out.includes(id as SideMenuItemId)) {
      out.push(id as SideMenuItemId)
    }
  }
  for (const item of SIDE_MENU_CATALOG) {
    if (item.fixed && !out.includes(item.id)) out.push(item.id)
  }
  return out
}

/** DB'de saklanan JSON biçimi */
export interface SideMenuPrefValue {
  version: 1
  items: SideMenuItemId[]
}
