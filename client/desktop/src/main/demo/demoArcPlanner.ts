// DEMO — çok açılı (arc) plan kontrolü: backend Core/Models/ArcExtensionPlanner.cs'in birebir kopyası (2026-11-04).
// Operatör ONAYLA'ya basınca /api/bending/arc/validate-plan çağrılır: bükülebilirlik (|XA1|), ölçülebilirlik
// (stage |XA1|), ilk segment ORTADAN kuralı → gerekirse parça BAŞINA / SONUNA uzatma (500 / 600 mm hedef)
// veya segmentleri TERS sırada bükme. Backend kuralı değişirse burası da güncellenmeli.

export interface PlannerSegment {
  segmentOrder: number
  radiusMm: number
  angleDeg: number
  straightAfterMm: number
}

export type ExtensionSide = 'None' | 'Leading' | 'Trailing'

export interface PlanResult {
  canBend: boolean
  isReversed: boolean
  extensionMm: number
  side: ExtensionSide
  isMeasurementOnly: boolean
  adjustedPartLengthMm: number
  adjustedSegments: PlannerSegment[]
  warningMessage: string | null
  errorMessage: string | null
}

const DEFAULT_XA1_ABS = 465
const DEFAULT_MIN_ARC = 250
const EXT_SHORT_TARGET = 500
const EXT_LONG_TARGET = 600
const YAY_THRESHOLD = 350

export const arcLength = (radiusMm: number, angleDeg: number): number => (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360

const f0 = (v: number) => v.toFixed(0)

interface Evaluation {
  canBend: boolean
  canMeasure: boolean
  firstIsMiddle: boolean
  middleAfterSqueeze: number
  reason: string
  feasible: boolean
}

function evaluate(arcs: number[], lengths: number[], partLength: number, xa1: number, T: number): Evaluation {
  const N = arcs.length
  let cumulative = 0
  let canBend = true
  let canMeasure = true
  let firstIsMiddle = false
  let bendFail = ''
  let measureFail = ''
  let middleFail = ''
  let middleAfterSqueeze = 0
  let seenSqueeze = false
  for (let i = 0; i < N; i++) {
    cumulative += lengths[i]
    const kalan = partLength - cumulative - arcs[i]
    cumulative += arcs[i]
    const duz = lengths[i]
    const duzOk = duz > xa1
    const kalanOk = kalan > xa1
    const mode = duzOk && kalanOk ? 'Middle' : !duzOk && kalanOk ? 'Normal' : duzOk && !kalanOk ? 'ReverseNormal' : 'Normal'
    if (mode === 'Middle' && seenSqueeze) middleAfterSqueeze++
    if (mode === 'Normal' || mode === 'ReverseNormal') seenSqueeze = true
    if (i === 0) {
      firstIsMiddle = duzOk && kalanOk
      if (!firstIsMiddle)
        middleFail = `1. kıvrımın hem önünde hem arkasında en az ${f0(xa1)} mm düz parça olmalı (önünde ${f0(duz)} mm, arkasında ${f0(Math.max(0, kalan))} mm var)`
    }
    if (!duzOk && !kalanOk) {
      canBend = false
      if (!bendFail) bendFail = `${i + 1}. kıvrımın önünde veya arkasında en az ${f0(xa1)} mm düz parça olmalı (önünde ${f0(duz)} mm, arkasında ${f0(Math.max(0, kalan))} mm var)`
    }
    if (!(duz >= T) && !(kalan >= T)) {
      canMeasure = false
      if (!measureFail)
        measureFail = `${i + 1}. kıvrım ölçülemez — önünde veya arkasında en az ${f0(T)} mm düz parça olmalı (önünde ${f0(duz)} mm, arkasında ${f0(Math.max(0, kalan))} mm var)`
    }
  }
  const reason = !canBend ? bendFail : !firstIsMiddle ? middleFail : !canMeasure ? measureFail : 'OK'
  return { canBend, canMeasure, firstIsMiddle, middleAfterSqueeze, reason, feasible: canBend && canMeasure && firstIsMiddle }
}

function computeExtension(nearestArc: number, currentSide: number): number {
  const target = nearestArc >= YAY_THRESHOLD ? EXT_SHORT_TARGET : EXT_LONG_TARGET
  const delta = target - currentSide
  return delta > 0 ? delta : 0
}

const fail = (msg: string): PlanResult => ({
  canBend: false, isReversed: false, extensionMm: 0, side: 'None', isMeasurementOnly: false,
  adjustedPartLengthMm: 0, adjustedSegments: [], warningMessage: null, errorMessage: msg,
})

export function planArc(input: {
  segments: PlannerSegment[]
  partLengthMm: number
  xa1AbsMm?: number
  measurementDistanceMm?: number
}): PlanResult {
  const segs = input.segments ?? []
  if (segs.length === 0) return fail('En az 1 segment gerekli')
  if (!(input.partLengthMm > 0)) return fail("Parça boyu 0'dan büyük olmalı")
  const xa1 = (input.xa1AbsMm ?? 0) > 0 ? input.xa1AbsMm! : DEFAULT_XA1_ABS
  const T = (input.measurementDistanceMm ?? 0) > 0 ? input.measurementDistanceMm! : xa1
  const N = segs.length
  const arcs: number[] = []
  const lengths: number[] = []
  for (let i = 0; i < N; i++) {
    const s = segs[i]
    if (!(s.radiusMm > 0)) return fail(`${i + 1}. kıvrım: yarıçap 0'dan büyük olmalı`)
    if (!(s.angleDeg > 0) || s.angleDeg >= 180) return fail(`${i + 1}. kıvrım: açı 0 ile 180 derece arasında olmalı`)
    if (s.straightAfterMm < 0) return fail(`${i + 1}. kıvrım: düz kısım negatif olamaz`)
    arcs[i] = arcLength(s.radiusMm, s.angleDeg)
    if (Math.round(arcs[i] * 10) / 10 < DEFAULT_MIN_ARC)
      return fail(`${i + 1}. kıvrım: yay uzunluğu ${f0(arcs[i])} mm, en az ${f0(DEFAULT_MIN_ARC)} mm olmalı — açıyı küçültün veya yarıçapı büyütün`)
    lengths[i] = s.straightAfterMm
  }
  const sumArcs = arcs.reduce((a, b) => a + b, 0)
  const sumLs = lengths.reduce((a, b) => a + b, 0)
  const trailing = input.partLengthMm - sumArcs - sumLs
  if (trailing < 0)
    return fail(`Kıvrımlar ve düz kısımların toplamı (${f0(sumArcs + sumLs)} mm) parça boyunu (${f0(input.partLengthMm)} mm) aşıyor — parça boyunu kontrol edin`)
  const leading = lengths[0]

  const extLeading = computeExtension(arcs[0], leading)
  const extTrailingNormal = computeExtension(arcs[N - 1], trailing)
  const arcsR = arcs.map((_, i) => arcs[N - 1 - i])
  const lengthsR = lengths.map((_, i) => (i === 0 ? trailing : lengths[N - i]))
  const extNewLeadingRev = computeExtension(arcsR[0], lengthsR[0])

  const LT = input.partLengthMm
  const evalA = evaluate(arcs, lengths, LT, xa1, T)
  const lengthsB = [...lengths]
  lengthsB[0] += extLeading
  const evalB = extLeading > 0 ? evaluate(arcs, lengthsB, LT + extLeading, xa1, T) : evalA
  const evalE = extTrailingNormal > 0 ? evaluate(arcs, lengths, LT + extTrailingNormal, xa1, T) : evalA
  const evalC = evaluate(arcsR, lengthsR, LT, xa1, T)
  const lengthsRD = [...lengthsR]
  lengthsRD[0] += extNewLeadingRev
  const evalD = extNewLeadingRev > 0 ? evaluate(arcsR, lengthsRD, LT + extNewLeadingRev, xa1, T) : evalC

  const measurementOnly = evalA.canBend && evalA.firstIsMiddle && !evalA.canMeasure
  type Opt = { isReversed: boolean; ext: number; side: ExtensionSide; measOnly: boolean; mas: number }
  const cands: Opt[] = []
  if (evalA.feasible) cands.push({ isReversed: false, ext: 0, side: 'None', measOnly: false, mas: evalA.middleAfterSqueeze })
  if (evalB.feasible && extLeading > 0)
    cands.push({ isReversed: false, ext: extLeading, side: 'Leading', measOnly: measurementOnly, mas: evalB.middleAfterSqueeze })
  if (evalE.feasible && extTrailingNormal > 0)
    cands.push({ isReversed: false, ext: extTrailingNormal, side: 'Trailing', measOnly: measurementOnly, mas: evalE.middleAfterSqueeze })
  if (!measurementOnly) {
    if (evalC.feasible) cands.push({ isReversed: true, ext: 0, side: 'None', measOnly: false, mas: evalC.middleAfterSqueeze })
    if (evalD.feasible && extNewLeadingRev > 0)
      cands.push({ isReversed: true, ext: extNewLeadingRev, side: 'Trailing', measOnly: false, mas: evalD.middleAfterSqueeze })
  }

  if (cands.length === 0) {
    // Operatöre sadece girdiği sıradaki sebep gösterilir (kıvrım numaraları onun numaraları)
    return fail(`Bu kıvrım düzeni bükülemiyor: ${evalA.reason}. Düz kısımları veya parça boyunu kontrol edin.`)
  }

  let best = cands[0]
  for (const c of cands) {
    if (c.mas < best.mas) best = c
    else if (c.mas === best.mas) {
      if (c.ext < best.ext) best = c
      else if (c.ext === best.ext && !c.isReversed && best.isReversed) best = c
    }
  }

  const adjustedSegments = segs.map((s, i) => ({
    segmentOrder: i + 1, radiusMm: s.radiusMm, angleDeg: s.angleDeg, straightAfterMm: s.straightAfterMm,
  }))
  if (best.side === 'Leading' && best.ext > 0) adjustedSegments[0].straightAfterMm += best.ext

  let warningMessage: string | null = null
  if (best.ext > 0) {
    const sideStr = best.side === 'Leading' ? 'parça BAŞINA (ilk düzlük tarafına)' : best.side === 'Trailing' ? 'parça SONUNA' : '-'
    const reasonStr = best.measOnly ? 'ölçüm için' : 'büküm için'
    const rev = best.isReversed ? ' Segmentler TERS sırada bükülecek.' : ''
    warningMessage = `Parçayı ${f0(best.ext)}mm uzatın (${reasonStr}). Ekleme ${sideStr} yapılacak.${rev}`
  } else if (best.isReversed) {
    warningMessage = 'Segmentler TERS sırada bükülecek (parça sonu ilk sıraya alındı).'
  }

  return {
    canBend: true,
    isReversed: best.isReversed,
    extensionMm: best.ext,
    side: best.side,
    isMeasurementOnly: best.measOnly,
    adjustedPartLengthMm: LT + best.ext,
    adjustedSegments,
    warningMessage,
    errorMessage: null,
  }
}

/** Backend ExecuteArcBendingHandler.BuildReversedSegments: yeni Seg1 = orijinal SegN (L = parça sonu düzlüğü). */
export function buildReversedSegments(orig: PlannerSegment[], partLengthMm: number): PlannerSegment[] {
  const N = orig.length
  if (N === 0) return []
  let sum = 0
  for (const s of orig) sum += arcLength(s.radiusMm, s.angleDeg) + s.straightAfterMm
  const trailing = Math.max(0, partLengthMm - sum)
  const out: PlannerSegment[] = [{ ...orig[N - 1], segmentOrder: 1, straightAfterMm: trailing }]
  for (let i = 1; i < N; i++) out.push({ ...orig[N - 1 - i], segmentOrder: i + 1, straightAfterMm: orig[N - i].straightAfterMm })
  return out
}
