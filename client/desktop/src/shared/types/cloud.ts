// Bulut bağlantısı (BULUT_API.md §4–5) — DataApi /api/cloud/* sözleşmesi.
// DataApi CloudSyncService: heartbeat / push / reçete çekme + güncelleme indirme.
// Renderer bu uçlara doğrudan gitmez: main → DataApiClient → DataApi (demo'da DemoMachine).

/** DataApi GET /api/cloud/status → update alanı (yeni sürüm varsa) */
export interface CloudUpdateInfo {
  version: string
  notes: string | null
  sizeBytes: number | null
  /** İndirme tamamlandı (sha256 doğrulandı) */
  downloaded: boolean
  /** İndirilen setup'ın tam yolu (…\Corventa\updates\Corventa Setup <v>.exe) — indirilmediyse null */
  downloadPath: string | null
  downloading: boolean
  /** 0..100 — indirme sürerken */
  progress: number | null
}

/** DataApi GET /api/cloud/status */
export interface CloudStatus {
  /** Bulut Url + anahtar yapılandırılmış mı (boşsa bulut KAPALI) */
  configured: boolean
  /** machine.json var mı (aktivasyon yapılmış) */
  activated: boolean
  machineId: string | null
  serialNumber: string | null
  name: string | null
  /** Son heartbeat başarılı mı */
  online: boolean
  lastHeartbeatAt: string | null
  lastPushAt: string | null
  lastRecipePullAt: string | null
  /** Buluta henüz gönderilmemiş kayıt sayısı (aktive değilse null) */
  pendingCount: number | null
  lastError: string | null
  /** MachineSettings.CloudShareRecipes — Big Data reçete paylaşımı */
  shareRecipes: boolean
  /** Yerel CloudRecipes satır sayısı (diğer makinelerden çekilen reçeteler) */
  recipeCount: number
  update: CloudUpdateInfo | null
  /** Bulut v2: önbellekteki aktif kalıp sayısı */
  moldCount?: number
  /** Bulut v2: son başarılı machine_pull_config (ISO) */
  configSyncedAt?: string | null
}

/** Bulut IPC sonucu — DataApi hata metni (400 { error }) renderer'a taşınır. status 0 = DataApi'ye ulaşılamadı */
export type CloudResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

/** Güncelleme kurulumunu engelleyen yerel durumlar (main hesaplar) */
export interface CloudInstallBlockers {
  /** DataApi'de Running iş var ve büküm ilerlemesi taze */
  bendingActive: boolean
  /** Tahliye isteği sürüyor */
  unloadActive: boolean
  /** Piston / rotasyon hareket halinde */
  machineMoving: boolean
}

/** cloud:install-update sonucu — ok:true ise uygulama birazdan kapanır */
export interface CloudInstallResult {
  ok: boolean
  error?: string
}
