// Müşteri değişikliği (satış / takas / hibe) — OTP onaylı (UI madde 17).
// DataApi POST /api/customer-change/request + /confirm sözleşmesiyle birebir (camelCase).
// Tarihler UTC ISO 8601 ("Z" ile biter).

import type { MachineIdentity } from './settings'

/** Değişiklik nedeni — backend → OwnershipType eşlemesi: SALE→SATIS, TRADE→TAKAS, GRANT→HIBE */
export type CustomerChangeReason = 'SALE' | 'TRADE' | 'GRANT'

export interface CustomerChangeRequestBody {
  reason: CustomerChangeReason
  /** Zorunlu, max 200 */
  newCustomerName: string
  newCustomerCompany?: string | null
  newCustomerTaxNo?: string | null
  newCustomerPhone?: string | null
  newCustomerEmail?: string | null
  newCustomerAddress?: string | null
  note?: string | null
}

export interface CustomerChangeRequestResponse {
  /** 32 hex — confirm'de geri gönderilir */
  requestId: string
  /** OTP son geçerlilik (UTC) — 10 dk */
  expiresAt: string
  /** Maskeli alıcı adresi, ör. "on***@corventa.com" */
  sentTo: string
}

export interface CustomerChangeLog {
  id: number
  requestId: string
  reason: CustomerChangeReason
  oldCustomerName: string
  oldCustomerCompany: string | null
  oldCustomerTaxNo: string | null
  oldCustomerPhone: string | null
  oldCustomerEmail: string | null
  oldCustomerAddress: string | null
  oldOwnershipType: string
  newCustomerName: string
  newCustomerCompany: string | null
  newCustomerTaxNo: string | null
  newCustomerPhone: string | null
  newCustomerEmail: string | null
  newCustomerAddress: string | null
  newOwnershipType: string
  note: string | null
  otpSentTo: string | null
  changedAt: string
}

export interface CustomerChangeConfirmResponse {
  machineIdentity: MachineIdentity
  change: CustomerChangeLog
}

/**
 * IPC sonucu — HTTP durum kodu renderer'a kaybolmadan taşınır (Electron IPC fırlatılan hatanın
 * yalnızca mesajını geçirir). status 0 = DataApi'ye ulaşılamadı (ağ / zaman aşımı).
 */
export type CustomerChangeResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; remainingAttempts?: number }
