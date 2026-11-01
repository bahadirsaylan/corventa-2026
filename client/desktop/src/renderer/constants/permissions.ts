// YETKİ MATRİSİ — rol sistemi (2026-11-01). Tek kaynak: hangi işlem hangi en düşük rolü ister.
// Rol sırası OPERATOR < ADMIN < SUPERADMIN; üst rol alttakinin her şeyini yapabilir.
// Kullanıldığı yerler: Ayarlar ızgarası (SettingsMenuGrid), rota koruması (RequireRole / App.tsx),
// sağ hızlı menü (SideMenu), kiosk çıkışı (KioskExitCorner), Kullanıcı Yönetimi rol seçimi.
// Yetkisiz düğmeler gizlenmez: soluk + kilit + dokununca "BU İŞLEM İÇİN {ROL} YETKİSİ GEREKLİ".
// DİKKAT: Backend'de şimdilik SADECE /api/users, /api/auth/logout|me, PUT /api/maintenance/rules,
// PUT /api/maintenance ve /api/macros yazma uçları (POST/PUT OPERATOR, DELETE ADMIN) [RequireRole] ile korunuyor. Admin ayarları, cetvel/encoder sıfırlama (Bending API),
// müşteri değişikliği, garanti, karşılama mesajı, checklist, büyük veri vb. için kilit ŞİMDİLİK SADECE UI'da
// (servis token'ı tasarlanınca backend'e taşınacak — YAPILACAKLAR "Rol sistemi — bilinen açıklar").

import { ROLE_RANK, type UserRole } from '@shared/types'

export const PERMISSIONS = {
  // ── OPERATOR ──
  'bending': 'OPERATOR',            // otomatik / yarı oto büküm akışları
  'manual': 'OPERATOR',             // manuel mod + manuel programlar
  'service': 'OPERATOR',            // servis modülü + servis talebi
  'operator-settings': 'OPERATOR',
  'language': 'OPERATOR',
  'pdf-guide': 'OPERATOR',
  'side-menu': 'OPERATOR',          // Hızlı Menü düzeni
  'machine-hours': 'OPERATOR',      // Kullanma Süreleri
  'bending-count': 'OPERATOR',      // Kıvrım Adetleri raporu
  'error-reports': 'OPERATOR',
  'bending-history': 'OPERATOR',    // Büküm Geçmişi (iş listesi + büküm logları + dışa aktarma)
  'certificate': 'OPERATOR',        // Sertifika Sorgula
  'maintenance': 'OPERATOR',        // Bakım Süresi: görüntüle + bakım modu aç/kapat + tamamlandı
  'macro': 'OPERATOR',              // usta öğrenme programı (EXCEL 28): makro kaydı / düzenleme / oynatma
  'mold-query': 'OPERATOR',         // KALIP KODU SORGULA (bulut v2 §2.4) — lisans etkinleştirme dahil (anahtar gerekir; main de kontrol eder)
  'mold-library': 'OPERATOR',       // KALIP KÜTÜPHANESİ (önbellekteki kalıplar)
  // ── ADMIN ──
  'admin-settings': 'ADMIN',        // Admin Ayarları (cetvel sıfırlama dahil)
  'encoder-reset': 'ADMIN',
  'user-management': 'ADMIN',       // Kullanıcı Yönetimi (ADMIN → sadece operatörler)
  'welcome-message': 'ADMIN',
  'checklist': 'ADMIN',
  'warranty': 'ADMIN',
  'customer-change': 'ADMIN',
  'maintenance-rules': 'ADMIN',     // bakım kuralları (min süre / hatırlatma / otomatik kapanma) düzenleme
  'macro-delete': 'ADMIN',          // makro silme (DataApi DELETE /api/macros/{id} [RequireRole(Admin)])
  'big-data': 'ADMIN',              // Bulut Bağlantısı sayfası: durum, aktivasyon, reçete paylaşımı, güncelleme (main de kontrol eder)
  // ── SUPERADMIN ──
  'cloud-deactivate': 'SUPERADMIN', // BULUT BAĞLANTISINI KALDIR (main de kontrol eder)
  'kiosk-exit': 'SUPERADMIN',     // Excel madde 37: kiosk'tan sadece süperadmin çıkar (main de kontrol eder)
  'manage-admins': 'SUPERADMIN',    // ADMIN / SUPERADMIN kullanıcı ekleme-düzenleme
} as const satisfies Record<string, UserRole>

export type Permission = keyof typeof PERMISSIONS

/** Rota (önek) → yetki. Listede olmayan rotalar OPERATOR'a açıktır. Uzun önek önce eşleşir. */
export const ROUTE_PERMISSIONS: ReadonlyArray<readonly [string, Permission]> = [
  ['/settings/welcome-message', 'welcome-message'],
  ['/settings/warranty', 'warranty'],
  ['/settings/checklist', 'checklist'],
  ['/settings/big-data', 'big-data'],
  ['/settings/users', 'user-management'],
  ['/settings/admin', 'admin-settings'],
  ['/settings/encoder-reset', 'encoder-reset'],
  ['/settings/customer-change', 'customer-change'],
  ['/settings/machine-transfer', 'customer-change'],
]

/** Rol bu yetkiye sahip mi (oturum yoksa hiçbir yetki yok) */
export function roleCan(role: UserRole | null | undefined, permission: Permission): boolean {
  return hasRole(role, PERMISSIONS[permission])
}

/** role ≥ min mi */
export function hasRole(role: UserRole | null | undefined, min: UserRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Rotanın istediği en düşük rol (korumasız rota → null) */
export function requiredRoleForPath(pathname: string): UserRole | null {
  const hit = ROUTE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
  return hit ? PERMISSIONS[hit[1]] : null
}

/** Ekranda gösterilen rol adı (t() ile çevrilir — sözlük en/roles.ts) */
export const ROLE_LABELS: Record<UserRole, string> = {
  OPERATOR: 'OPERATÖR',
  ADMIN: 'ADMİN',
  SUPERADMIN: 'SÜPERADMİN',
}
