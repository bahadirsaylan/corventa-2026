// YETKİ MATRİSİ — rol sistemi (2026-11-01; 6 rol 2026-11-16). Tek kaynak: hangi işlem hangi en düşük rolü ister.
// Rol sırası OPERATOR (KULLANICI) < SUPERVISOR (ATÖLYE SORUMLUSU) < SERVICEMAN (SERVİS TEKNİSYENİ) < DEALER (BAYİ)
// < ADMIN (MAKİNE ÜRETİCİSİ) < SUPERADMIN (YAZILIM ÜRETİCİSİ); üst rol alttakinin her şeyini yapabilir.
// Kullanıldığı yerler: Ayarlar ızgarası (SettingsMenuGrid), rota koruması (RequireRole / App.tsx),
// sağ hızlı menü (SideMenu), kiosk çıkışı (KioskExitCorner), Kullanıcı Yönetimi rol seçimi.
// Yetkisiz düğmeler / menü öğeleri HİÇ GÖRÜNMEZ (2026-11-19, kullanıcı); rotaya doğrudan gidilirse RequireRole uyarır.
// Kullanıcı yönetimi: herkes SADECE kendi rolünden KESİN DÜŞÜK rolleri yönetir (canManageRole, @shared/types);
// SUPERADMIN herkesi. Aynı kural DataApi UsersController'da da uygulanır.
// DİKKAT: Backend'de şimdilik SADECE /api/users (SUPERVISOR+), /api/auth/*, PUT /api/maintenance/rules (ADMIN),
// PUT /api/maintenance (SUPERADMIN) ve /api/macros yazma uçları (POST/PUT OPERATOR, DELETE SERVICEMAN) [RequireRole]
// ile korunuyor. Main süreç ayrıca bulut (big-data: SERVICEMAN, cloud-deactivate: SUPERADMIN), checklist sonucu (ADMIN)
// ve kiosk çıkışını (SUPERADMIN) kontrol eder. Admin ayarları, cetvel/encoder sıfırlama (Bending API), müşteri
// değişikliği, garanti, karşılama mesajı vb. için kilit ŞİMDİLİK SADECE UI'da
// (servis token'ı tasarlanınca backend'e taşınacak — YAPILACAKLAR "Rol sistemi — bilinen açıklar").

import { ROLE_RANK, type UserRole } from '@shared/types'

export const PERMISSIONS = {
  // ── OPERATOR (KULLANICI) ──
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
  // ── SUPERVISOR (ATÖLYE SORUMLUSU) ──
  'user-management': 'SUPERVISOR',  // Kullanıcı Yönetimi (sadece kendinden düşük roller — SUPERVISOR → KULLANICI)
  'welcome-message': 'SUPERVISOR',
  'saved-bend-delete': 'SUPERVISOR', // STANDART SÜRÜM (2026-11-17) kayıtlı büküm silme (DataApi DELETE /api/saved-bends/{id})
  // ── SERVICEMAN (SERVİS TEKNİSYENİ) ──
  'admin-settings': 'SERVICEMAN',   // Admin Ayarları (cetvel sıfırlama dahil) + sıkıştırma kayıtları
  'encoder-reset': 'SERVICEMAN',
  'macro-delete': 'SERVICEMAN',     // makro silme (DataApi DELETE /api/macros/{id} [RequireRole(Serviceman)])
  'big-data': 'SERVICEMAN',         // Bulut Bağlantısı sayfası: durum, aktivasyon, reçete paylaşımı, güncelleme (main de kontrol eder)
  // ── DEALER (BAYİ) ──
  'customer-change': 'DEALER',
  'warranty': 'DEALER',
  // ── ADMIN (MAKİNE ÜRETİCİSİ) ──
  'checklist': 'ADMIN',             // (main de kontrol eder: checklist sonucu gönderme)
  'maintenance-rules': 'ADMIN',     // bakım kuralları (min süre / hatırlatma / otomatik kapanma) düzenleme
  'one-time-setup-user': 'ADMIN',   // EXCEL 40: tek seferlik KURULUM KULLANICISI oluşturma (DataApi de kontrol eder)
  // ── SUPERADMIN (YAZILIM ÜRETİCİSİ) ──
  'cloud-deactivate': 'SUPERADMIN', // BULUT BAĞLANTISINI KALDIR (main de kontrol eder)
  'kiosk-exit': 'SUPERADMIN',       // Excel madde 37: kiosk'tan sadece süperadmin çıkar (main de kontrol eder)
  'machine-values': 'SUPERADMIN',   // MAKİNE DEĞERLERİ (2026-11-19): tüm canlı makine değerleri + motor / fan / alarm aç-kapat (kilit SADECE UI'da)
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
  ['/settings/clamp-logs', 'admin-settings'],
  ['/settings/encoder-reset', 'encoder-reset'],
  ['/settings/customer-change', 'customer-change'],
  ['/settings/machine-transfer', 'customer-change'],
  ['/settings/machine-values', 'machine-values'],
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
  OPERATOR: 'KULLANICI',
  SUPERVISOR: 'ATÖLYE SORUMLUSU',
  SERVICEMAN: 'SERVİS TEKNİSYENİ',
  DEALER: 'BAYİ',
  ADMIN: 'ADMİN — MAKİNE ÜRETİCİSİ',
  SUPERADMIN: 'SÜPERADMİN — YAZILIM ÜRETİCİSİ',
}

/** Rozetlerde / dar alanlarda kısa rol adı (t() ile çevrilir) */
export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  OPERATOR: 'KULLANICI',
  SUPERVISOR: 'ATÖLYE SORUMLUSU',
  SERVICEMAN: 'SERVİS TEKNİSYENİ',
  DEALER: 'BAYİ',
  ADMIN: 'ADMİN',
  SUPERADMIN: 'SÜPERADMİN',
}

/** Rol rengi (rozet / kullanıcı listesi) — düşükten yükseğe: mavi → camgöbeği → yeşil → mor → turuncu → kırmızı */
export const ROLE_COLORS: Record<UserRole, string> = {
  OPERATOR: '#1a6fd4',
  SUPERVISOR: '#0e7490',
  SERVICEMAN: '#15803d',
  DEALER: '#7c3aed',
  ADMIN: '#d97706',
  SUPERADMIN: '#c93235',
}
