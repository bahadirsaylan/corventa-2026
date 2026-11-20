// Backend C# entity'lerinin (Core/Entities/ServiceTicket.cs, ServiceRequest.cs) TS yansıması.
// Cloud uyumlu: tüm CRUD DataApi üzerinden, hiçbir alan UI-only değil.

export const ServiceTicketType = {
  Question: 0,    // Soru   (kod: S.YY.MM.NNN)
  Suggestion: 1,  // Öneri  (kod: Ö.YY.MM.NNN)
  Complaint: 2,   // Şikayet(kod: Ş.YY.MM.NNN)
} as const
export type ServiceTicketType = (typeof ServiceTicketType)[keyof typeof ServiceTicketType]

export const ServiceTicketStatus = {
  Pending: 0,     // Beklemede
  Answered: 1,    // Cevaplandı
  InProgress: 2,  // Sorunum devam ediyor / Canlı destek
  Resolved: 3,    // Çözüldü / Sonlandırıldı
  Cancelled: 4,   // İptal
} as const
export type ServiceTicketStatus = (typeof ServiceTicketStatus)[keyof typeof ServiceTicketStatus]

export const ServicePurpose = {
  ArizaGiderme: 0,
  GenelBakim: 1,
  AgirBakim: 2,
  Kurulum: 3,
  Egitim: 4,
} as const
export type ServicePurpose = (typeof ServicePurpose)[keyof typeof ServicePurpose]

export const ServiceRequestStatus = {
  Planned: 0,     // Planlandı
  Sent: 1,        // Gönderildi
  InProgress: 2,  // Servis başladı
  Completed: 3,   // Tamamlandı
  Cancelled: 4,
} as const
export type ServiceRequestStatus = (typeof ServiceRequestStatus)[keyof typeof ServiceRequestStatus]

export interface ServiceTicket {
  id: number
  code: string
  type: ServiceTicketType
  status: ServiceTicketStatus
  title: string
  body: string
  response: string | null
  createdAt: string
  answeredAt: string | null
  closedAt: string | null
  createdBy: string | null
}

export interface ServiceTicketCreateRequest {
  type: 'question' | 'suggestion' | 'complaint'
  title: string
  body: string
  createdBy?: string | null
}

export type ServiceTicketAction = 'resolved' | 'in-progress' | 'answered' | 'cancelled'

export interface ServiceRequest {
  id: number
  code: string
  customerName: string
  customerAddress: string
  machineModel: string
  machineProductionYear: string
  machineCode: string
  machineVeAiCode: string
  technicianName: string
  contactInfo: string | null
  purpose: ServicePurpose
  status: ServiceRequestStatus
  problemDescription: string | null
  workDoneCodes: string   // JSON array string (backend tarafı string)
  partsUsedCodes: string
  missingPartsCodes: string
  reportCode: string | null
  confirmCode: string | null
  isConfirmed: boolean
  rating: number | null
  ratingNote: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface ServiceRequestCreateRequest {
  customerName: string
  customerAddress?: string
  machineModel?: string
  machineProductionYear?: string
  machineCode?: string
  machineVeAiCode?: string
  technicianName?: string
  contactInfo?: string | null
  purpose: ServicePurpose
  problemDescription?: string | null
  workDoneCodes?: string
  partsUsedCodes?: string
  missingPartsCodes?: string
}
