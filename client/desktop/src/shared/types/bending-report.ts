// KIVRIM ADETLERİ RAPORU — DataApi GET /api/reports/bending-count.
// Sayılan işler: başlatılmış büküm işleri (Running / Completed / Failed / Cancelled / Interrupted);
// hiç başlatılmamış (Created / Calculating / Ready) kayıtlar sayılmaz.
// İşin günü = startedAt ?? createdAt, makinenin YEREL saatine göre.

export type BendingReportGroupBy = 'day' | 'week' | 'month'

/** Durum bazlı adetler */
export interface BendingCountRow {
  total: number
  completed: number
  failed: number
  cancelled: number
  interrupted: number
  running: number
}

export interface BendingCountReportQuery {
  /** Yerel gün "yyyy-MM-dd" (dahil). Boşsa to − 29 gün */
  from?: string
  /** Yerel gün "yyyy-MM-dd" (dahil). Boşsa bugün */
  to?: string
  groupBy?: BendingReportGroupBy
  /** BendingMethod 0 TAM DAİRE · 1 ÇOK AÇILI · 2 SERPANTİN · 3 SIVAMA */
  method?: number
  /** ProfileType */
  profileType?: number
}

export interface BendingCountReport {
  from: string
  to: string
  /** Aralıktaki gün sayısı (dahil) */
  days: number
  groupBy: BendingReportGroupBy
  method: number | null
  profileType: number | null
  totals: BendingCountRow & {
    /** Tamamlanan işlerin paso toplamı */
    completedPasos: number
    /** Tamamlanan işlerin parça boyu toplamı (metre) */
    completedPartLengthM: number
    /** Tamamlanan işlerin ortalama süresi (sn) — veri yoksa null */
    avgCompletedDurationSeconds: number | null
  }
  /** Eskiden yeniye, boş kovalar 0. key: day "yyyy-MM-dd", week = pazartesi "yyyy-MM-dd", month "yyyy-MM" */
  series: (BendingCountRow & { key: string; from: string; to: string })[]
  /** 4 metot da her zaman var (0..3) */
  methods: (BendingCountRow & { method: number })[]
  /** Sadece kaydı olan profil tipleri, çoktan aza */
  profileTypes: (BendingCountRow & { profileType: number })[]
}
