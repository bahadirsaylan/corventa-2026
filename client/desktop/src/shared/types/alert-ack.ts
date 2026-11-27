// UYARI KAYITLARI (2026-11-19) — DataApi /api/alert-acks. Uyarı penceresinde basılan düğme (kullanıcı satırı) +
// durumun algılandığı / düzeldiği an (sistem satırı: Bending API AlertConditionWatcher, bakım mark-completed).
// Amaç ispat: "kirlilik uyarısını 3 kez kapattınız, düzeltilmedi". Kullanıcı / rol DataApi'de oturumdan yazılır.

/** Backend AlertKinds sabitleri (bilinmeyen değer metin olarak gösterilir) */
export type AlertAckKind =
  | 'Contamination'
  | 'MaintenanceOverdue'
  | 'MaintenanceLock'
  | 'MaintenanceReminder'
  | 'MaintenanceAutoClosed'
  | 'SafetyCheck'
  | 'EncoderStall'

export const ALERT_ACK_KINDS: readonly AlertAckKind[] = [
  'Contamination',
  'MaintenanceOverdue',
  'MaintenanceLock',
  'MaintenanceReminder',
  'MaintenanceAutoClosed',
  'SafetyCheck',
  'EncoderStall',
] as const

/** Backend AlertActions sabitleri. DETECTED / RESOLVED sadece sistem yazar. */
export type AlertAckAction =
  | 'DISMISSED'
  | 'CONTINUED'
  | 'ACKNOWLEDGED'
  | 'OPENED_MAINTENANCE'
  | 'FINISHED_MAINTENANCE'
  | 'OPENED_SERVICE_REQUEST'
  | 'DETECTED'
  | 'RESOLVED'

export type AlertAckSeverity = 'info' | 'warning' | 'error'

/** POST /api/alert-acks — alertKey virgüllü olabilir ("K1,K3") → anahtar başına bir satır */
export interface AlertAckCreateBody {
  alertKind: AlertAckKind | string
  alertKey?: string
  /** Ekranda gösterilen metin (TÜRKÇE — dil seçiminden bağımsız) */
  message: string
  severity?: AlertAckSeverity
  /** ISO-8601 — uyarının ekranda göründüğü an */
  shownAt?: string | null
  action: Exclude<AlertAckAction, 'DETECTED' | 'RESOLVED'>
  sessionId?: string | null
  /** Küçük JSON (≤ 4000): kirlilik bitleri, yağ sıcaklığı / seviyesi */
  machineStateJson?: string | null
}

export interface AlertAckCreateResult {
  items: { id: number; alertKey: string; occurrenceIndex: number }[]
}

export interface AlertAck {
  id: number
  alertKind: AlertAckKind | string
  alertKey: string
  message: string
  severity: AlertAckSeverity
  shownAt: string | null
  acknowledgedAt: string
  username: string | null
  displayName: string | null
  role: string | null
  action: AlertAckAction | string
  /** 'UI' | 'SYSTEM' */
  source: string
  sessionId: string | null
  /** Kullanıcı satırı: düzelmeden bu yana kaçıncı kapatma · RESOLVED: düzelmeden önce kaç kez kapatıldı · DETECTED: 0 */
  occurrenceIndex: number
  machineStateJson: string | null
}

export interface AlertAckListQuery {
  kind?: string
  key?: string
  action?: string
  /** ISO-8601 */
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface AlertAckPage {
  total: number
  page: number
  pageSize: number
  items: AlertAck[]
}

export interface AlertAckSummaryItem {
  alertKind: AlertAckKind | string
  alertKey: string
  /** Tüm zamanlar kullanıcı kapatma sayısı */
  ackCount: number
  /** Son düzelmeden (RESOLVED) bu yana kapatma sayısı */
  openAckCount: number
  /** Durum düzelmedi (son RESOLVED'dan sonra satır var) */
  isOpen: boolean
  lastAckAt: string | null
  lastAckBy: string | null
  lastAckByDisplayName: string | null
  lastDetectedAt: string | null
  lastResolvedAt: string | null
  byUser: { username: string; displayName: string | null; count: number }[]
}

export interface AlertAckSummary {
  items: AlertAckSummaryItem[]
}
