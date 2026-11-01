// Bulut v2 — yönetilen veriler + kalıp kütüphanesi (BULUT_API_V2.md §2, §6). DataApi uçları makine içidir;
// bulut aktive değilken de çalışır (önbellek / yerel). Renderer bu uçlara doğrudan gitmez:
// main → DataApiClient → DataApi (demo'da DemoMachine → demoCloudData.ts).
//
// NOT: §3 `machine_pull_config` warranty / maintenancePolicy / checklistTemplate / servicePoints alt şekilleri
// sözleşmede açık değil — aşağıdaki şekiller UI'ın beklediği şekildir (DataApi tarafı bunlara uymalı).
// Hepsi toleranslı okunur: alan yoksa / null ise yerel davranış sürer.

/** `cloud` = az önce buluttan, `cache` = yerel önbellek, `local` = bulut verisi yok (eski yerel davranış) */
export type CloudDataSource = 'cloud' | 'cache' | 'local'

// ── Kalıp (§2, §6 MoldDto) ───────────────────────────────────────────────────

/** UI BendingProfileId ile aynı değerler + 'custom' (makine akışında desteklenmez) */
export type MoldProfileType =
  | 'square-out' | 'square-in' | 'circle' | 'circle-filled' | 'square-filled' | 'i-single'
  | 'l-right' | 'l-left' | 'i-bar' | 'h-bar' | 'c-channel' | 't-bar' | 'custom'

export interface MoldDto {
  code: string
  codeVersion: number
  makerCode: string
  makerName: string | null
  profileType: MoldProfileType
  a: number
  b: number
  s: number
  isSolid: boolean
  kind: 'STANDARD' | 'CUSTOM'
  name: string | null
  description: string | null
  requiresLicense: boolean
  active: boolean
  defaultParams: { stepDistanceMm?: number | null; notes?: string | null } | null
}

export interface MoldActivation {
  /** Maskeli (ör. KL-****-****-4TXR) */
  licenseKey: string
  activatedAt: string | null
  /** null = süresiz */
  expiresAt: string | null
  /** Bulutta iptal edilmiş (bir sonraki çekmede yerelde de pasif) — DataApi gönderirse */
  revoked?: boolean
}

/** GET /api/molds/{code} ve POST /api/molds/{code}/activate cevabı */
export interface MoldLookupResult {
  mold: MoldDto
  /** Bu makinede etkin lisans var mı (lisans gerektirmeyen kalıpta anlamsız) */
  licensed: boolean
  activation: MoldActivation | null
  source: CloudDataSource
}

/** GET /api/molds?q=&profileType=&licensed= — `licensed` = bu makinede kullanılabilir (lisans gerekmez ya da etkin) */
export interface MoldListResponse {
  items: (MoldDto & { licensed?: boolean })[]
  syncedAt: string | null
}

export interface MoldListQuery {
  q?: string
  profileType?: MoldProfileType | ''
  /** true = kullanılabilir (lisanssız + lisansı etkin) · false = lisans gerekli ve etkin değil */
  licensed?: boolean | null
}

// ── Bulut yapılandırması (GET /api/cloud/config) ─────────────────────────────

export interface CloudWarrantyCategory {
  key: string
  /** Türkçe etiket (ör. MEKANİK ÜNİTE) — t() ile çevrilir, sözlükte yoksa olduğu gibi */
  label: string
  days: number
}

export interface CloudWarranty {
  /** Garanti başlangıcı (ISO). null → MachineIdentity.warrantyStartDate kullanılır */
  startDate: string | null
  categories: CloudWarrantyCategory[]
  /** Garanti dışı haller — yoksa yerel liste */
  exclusions?: string[] | null
  notes?: string | null
  /** true = makineye özel (admin belirledi), false = üretici varsayılanı */
  isMachineSpecific?: boolean
  updatedAt?: string | null
}

export interface CloudMaintenancePolicy {
  rules: { periodKey: string; minDurationMinutes: number }[]
  reminderAfterMinutes?: number | null
  autoCloseAfterMinutes?: number | null
  name?: string | null
  updatedAt?: string | null
}

export interface CloudChecklistItem {
  id: string
  text: string
  category?: string | null
}

export interface CloudChecklistTemplate {
  id: string
  version: number
  name: string
  items: CloudChecklistItem[]
}

export interface CloudServicePoint {
  name: string
  city: string
  phone: string
  /** Bulutta yok (DataApi null gönderir) — yerel listede var */
  web?: string | null
  email?: string | null
  /** Bulut: açık adres */
  address?: string | null
  lat: number
  /** DataApi bulutun `lng` alanını `lon` olarak da verir */
  lon: number
}

/** Bulutta servis talebinin durumu / ataması (localId = yerel ServiceRequest.id) */
export interface CloudServiceRequestState {
  localId: string
  /** Bulut durum kodu (OPEN | ASSIGNED | IN_PROGRESS | DONE | CANCELLED …) */
  status: string | null
  assignedTo: string | null
  assignedOrg: string | null
  updatedAt: string | null
  note: string | null
}

export interface CloudConfig {
  warranty: CloudWarranty | null
  maintenancePolicy: CloudMaintenancePolicy | null
  checklistTemplate: CloudChecklistTemplate | null
  welcomeMessage: string | null
  servicePoints: CloudServicePoint[]
  serviceRequests: CloudServiceRequestState[]
  syncedAt: string | null
  source: CloudDataSource
}

/** POST /api/checklist/results */
export interface ChecklistResultBody {
  templateId: string
  templateVersion: number
  inspectorName: string
  items: { id: string; checked: boolean; note: string | null }[]
}
