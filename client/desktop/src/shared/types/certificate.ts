// Sertifika sorgulama (DataApi GET /api/certificates/{code}) — UI madde 16.
// DataApi Certificate DTO'su ile birebir (camelCase). Tarihler UTC ISO 8601 ("Z" ile biter).

export interface Certificate {
  id: number
  /** Büyük harfe normalize edilmiş kod (backend Trim + ToUpperInvariant) */
  code: string
  ownerName: string
  ownerCompany: string | null
  courseName: string
  certifiedBy: string
  issuedAt: string
  /** null = süresiz sertifika (isExpired her zaman false) */
  validUntil: string | null
  isExpired: boolean
  createdAt: string
}

/** Sorgu kodu normalizasyonu — backend ile aynı kural (trim + büyük harf, kültürden bağımsız) */
export function normalizeCertificateCode(code: string): string {
  return code.trim().toUpperCase()
}
