// Ölçü ekranı önizlemesi (2026-11-16, kullanıcı: "ÇAP GİRİLDİĞİNDE HEDEF KONUM + HESAPLANAN ADIM SAYISI
// GÖSTERİLECEK — operatör girdiği adım mesafesine göre kaç adımda yapacağını bilsin").
// SADECE GÖSTERİM — iş kaydına / büküme hiçbir şey yazmaz. Büküm akışıyla AYNI uçlar kullanılır:
//   1) POST /api/bending/calculate   → aktif top hedef konumu (gönyeden itme, mm)
//   2) POST /api/bending/geometric/preview → toplam adım (paso) sayısı, G adım mesafesiyle
// Geometri, işin başlarken kullanacağı değerlerle seçilir: alt top çapı + merkez mesafesi + θ makine
// ayarından, XA1/YA1 profil A'ya önerilen stage'den (StartJob PRE-FLIGHT aynı stage XA1/YA1 ile yeniden
// hesaplar). Stage'de XA1 yoksa makine ayarındaki varsayılan.

import { loadLowerBallDiameterMm } from './machineGeometry'

export interface RingPlanInput {
  /** Profil A (mm) — hesaptaki kesit ölçüsü */
  a: number
  /** Hedef çap (mm) */
  diameterMm: number
  /** Adım mesafesi G (mm) */
  stepMm: number
  /** Parça boyu L (mm) — adım sayısı için gerekli */
  partLengthMm: number | null
  /** (2026-11-26) Operatörün seçtiği stage — verilirse önerilen yerine bu stage'in ofset / XA1'i kullanılır */
  stageNumber?: number | null
}

export interface RingPlanResult {
  /** Aktif top hedef konumu — CETVEL değeri (mm): stage ofseti + itme derinliği. Büküm bitince işte
   *  görünen hedef konumla aynı birim (StartJob FullCircle'da stage ofsetini ekleyip işe yazar). */
  targetMm: number
  /** Gönyeden itme derinliği (mm) — hesaptaki ham değer */
  pushDepthMm: number
  /** Toplam adım (paso) sayısı — L yoksa / önizleme başarısızsa null */
  totalSteps: number | null
  stageNumber: number | null
}

function num(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Ayar + stage listesi her tuşta okunmasın — kısa süreli önbellek
let geoCache: { at: number; value: Promise<Geometry> } | null = null
const GEO_TTL_MS = 30_000

interface Geometry {
  ballDiameterMm: number
  centerDistanceMm: number
  thetaDeg: number
  defaultXA1: number
  defaultYA1: number
  stages: { stageNumber: number; leftOffsetMm?: number; xA1Mm?: number | null; yA1Mm?: number | null }[]
}

function loadGeometry(): Promise<Geometry> {
  const now = Date.now()
  if (geoCache && now - geoCache.at < GEO_TTL_MS) return geoCache.value
  const value = (async () => {
    const [ball, machine, stages] = await Promise.all([
      loadLowerBallDiameterMm(),
      window.corventa.settings.getMachine() as Promise<Record<string, unknown>>,
      window.corventa.settings.getStages().catch(() => []),
    ])
    return {
      ballDiameterMm: ball,
      centerDistanceMm: num(machine.defaultCenterDistanceMm, 300.82),
      thetaDeg: num(machine.defaultThetaDeg, 63),
      defaultXA1: num(machine.defaultXA1, -493),
      defaultYA1: num(machine.defaultYA1, 0),
      stages: stages ?? [],
    }
  })()
  geoCache = { at: now, value }
  // Hata önbellekte kalmasın
  value.catch(() => {
    if (geoCache?.value === value) geoCache = null
  })
  return value
}

/** Çember (tam tur) büküm için hedef konum + adım sayısı. Hesap yapılamazsa hata fırlatır. */
export async function computeRingPlan(input: RingPlanInput): Promise<RingPlanResult> {
  const geo = await loadGeometry()

  let stageNumber: number | null = null
  let xA1 = geo.defaultXA1
  let yA1 = geo.defaultYA1
  // StartJob (FullCircle) aktif taraf stage ofsetini > 0,5 mm ise itme derinliğine ekler; akış sensörü sol varsayar
  let stageOffsetMm = 0
  try {
    stageNumber = input.stageNumber != null && input.stageNumber > 0
      ? input.stageNumber
      : (await window.corventa.bending.recommendStage(input.a)).stageNumber
    const st = geo.stages.find((s) => s.stageNumber === stageNumber)
    const off = Number(st?.leftOffsetMm)
    if (Number.isFinite(off) && off > 0.5) stageOffsetMm = off
    if (st?.xA1Mm != null && Number.isFinite(st.xA1Mm)) {
      xA1 = st.xA1Mm
      yA1 = st.yA1Mm != null && Number.isFinite(st.yA1Mm) ? st.yA1Mm : 0
    }
  } catch {
    // Uygun stage yok / ulaşılamadı → makine varsayılanı (ONAYLA'daki akış bunu ayrıca bildirir)
  }

  const calc = await window.corventa.bending.calculate({
    ballDiameter: geo.ballDiameterMm,
    thickness: input.a,
    centerDistance: geo.centerDistanceMm,
    targetBendingDiameter: input.diameterMm,
    xA1,
    yA1,
    theta: geo.thetaDeg,
  })
  if (!calc.success || !(calc.pistonPosition > 0)) {
    throw new Error(calc.error ?? 'HESAP YAPILAMADI')
  }

  // ADIM SAYISI — gerçek büküm gibi (BendingHandlers): 1. paso ADAPTİF, top parçaya değene kadar gider;
  // sonra her paso G kadar ilerler, hedef − 0,5 mm'ye ulaşınca biter (simetri / tekrar pasosu yok —
  // EstimateTotalPasos). Temas konumu düz parçanın (çok büyük çap) itme derinliğiyle tahmin edilir.
  // (Önizleme ucu /geometric/preview 0'dan + tekrar pasosuyla saydığı için gerçek sayıdan fazla çıkar.)
  let totalSteps: number | null = null
  if (input.stepMm > 0) {
    try {
      const flat = await window.corventa.bending.calculate({
        ballDiameter: geo.ballDiameterMm,
        thickness: input.a,
        centerDistance: geo.centerDistanceMm,
        targetBendingDiameter: 1e8,
        xA1,
        yA1,
        theta: geo.thetaDeg,
      })
      if (flat.success && Number.isFinite(flat.pistonPosition)) {
        const remaining = calc.pistonPosition - 0.5 - flat.pistonPosition
        totalSteps = 1 + (remaining > 0 ? Math.ceil(remaining / input.stepMm) : 0)
      }
    } catch {
      /* adım sayısı gösterilmez */
    }
  }

  return { targetMm: stageOffsetMm + calc.pistonPosition, pushDepthMm: calc.pistonPosition, totalSteps, stageNumber }
}
