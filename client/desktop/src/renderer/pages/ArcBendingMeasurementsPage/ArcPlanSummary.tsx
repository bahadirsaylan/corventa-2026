import styles from './ArcPlanSummary.module.css'
import type { ArcMeasurementValues } from './ArcMeasurementForm'
import type { ValidateArcPlanResponse } from '@shared/types'

interface Props {
  values: ArcMeasurementValues
  plan: ValidateArcPlanResponse
}

//   Yay uzunluğu: L_yay = 2π·R·(180-α)/360
function computeArcLength(radiusMm: number, angleDeg: number): number {
  return (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360
}

// 2026-09-08: ONAYLA sonrası aşama 3 (summary). Segmentleri kompakt 2×2 mini kart
// halinde yan yana gösterir. Kart yapısı:
//   ┌────────┬──────────┐
//   │  1.    │  L 100   │
//   │  R 500 │  Y 300   │
//   └────────┴──────────┘
// Reversal veya uzatma varsa üstte info banner. Segmentler orijinal user-input
// sırasında; reversal bilgisi banner'da.
export default function ArcPlanSummary({ values, plan }: Props) {
  const p = parseInt(values.P, 10) || values.segments.length
  const ltAdjusted = plan.adjustedPartLengthMm ?? parseFloat(values.LT)
  const extension = plan.extensionMm ?? 0
  const isReversed = plan.isReversed === true

  // Orijinal (user-input) segmentler.
  interface SumSeg { R: number; alpha: number; L: number; arc: number; origOrder: number }
  const origSegs: SumSeg[] =
    plan.adjustedSegments && plan.adjustedSegments.length === p
      ? plan.adjustedSegments.map((s, i) => ({
          R: s.radiusMm,
          alpha: s.angleDeg,
          L: s.straightAfterMm,
          arc: computeArcLength(s.radiusMm, s.angleDeg),
          origOrder: i + 1,
        }))
      : values.segments.map((s, i) => {
          const R = parseFloat(s.R)
          const alpha = parseFloat(s.Alpha)
          return {
            R,
            alpha,
            L: parseFloat(s.L),
            arc: computeArcLength(R, alpha),
            origOrder: i + 1,
          }
        })

  const origSumArcs = origSegs.reduce((sum, s) => sum + s.arc, 0)
  const origSumLs = origSegs.reduce((sum, s) => sum + s.L, 0)
  const trailing = Math.max(0, ltAdjusted - origSumArcs - origSumLs)

  //   2026-09-08: Reversal durumunda kartlar BÜKÜM SIRASINDA gösterilir (parça sonundan
  //   parça başına). Backend BuildReversedSegments transform'unun aynısı:
  //     new[0] = { arc: orig[N-1].arc, L: trailing }
  //     new[i] = { arc: orig[N-1-i].arc, L: orig[N-i].L }  (i >= 1)
  //   Böylece UI operatöre kartları FİZİKSEL BÜKÜM SIRASINDA gösterir (1. bükülen sol,
  //   son bükülen sağ). origOrder alanı orijinal input sırasını tutar (kartın altında).
  const displaySegs: SumSeg[] = isReversed
    ? [
        // reversed[0]: arc from last orig, L = trailing
        {
          R: origSegs[p - 1].R,
          alpha: origSegs[p - 1].alpha,
          L: trailing,
          arc: origSegs[p - 1].arc,
          origOrder: p,
        },
        // reversed[1..N-1]
        ...Array.from({ length: p - 1 }, (_, k) => {
          const i = k + 1
          return {
            R: origSegs[p - 1 - i].R,
            alpha: origSegs[p - 1 - i].alpha,
            L: origSegs[p - i].L,
            arc: origSegs[p - 1 - i].arc,
            origOrder: p - i,
          }
        }),
      ]
    : origSegs

  const totalArc = displaySegs.reduce((sum, s) => sum + s.arc, 0)
  const totalStraight = displaySegs.reduce((sum, s) => sum + s.L, 0)

  return (
    <div className={styles.wrapper}>
      {/* ── Info banner'lar ───────────────────────────── */}
      {isReversed && (
        <div className={styles.banner + ' ' + styles.bannerReverse}>
          <span className={styles.bannerIcon}>🔄</span>
          <span>
            <b>TERS SIRA</b> — Bükümler parça sonundan başlayıp parça başına doğru yapılacak
            (Seg{p} → Seg1).
          </span>
        </div>
      )}
      {extension > 0 && (
        <div className={styles.banner + ' ' + styles.bannerExtend}>
          <span className={styles.bannerIcon}>⚠</span>
          <span>
            <b>PARÇA UZATILDI</b> — {plan.side === 'Leading' ? 'PARÇA BAŞINA' : 'PARÇA SONUNA'}{' '}
            <b>+{extension.toFixed(0)}mm</b> eklendi ({plan.isMeasurementOnly ? 'ölçüm için' : 'büküm için'}).
          </span>
        </div>
      )}

      {/* ── Toplam özet ───────────────────────────────── */}
      <div className={styles.stats}>
        <span><b>Parça</b> {ltAdjusted.toFixed(0)}mm</span>
        <span className={styles.sep}>·</span>
        <span><b>Toplam yay</b> {totalArc.toFixed(0)}mm</span>
        <span className={styles.sep}>·</span>
        <span><b>Toplam düz</b> {totalStraight.toFixed(0)}mm</span>
        <span className={styles.sep}>·</span>
        <span><b>Kalan</b> {trailing.toFixed(0)}mm</span>
      </div>

      {/* ── Segment strip (2×2 mini kartlar yan yana, büküm sırasında) ── */}
      <div className={styles.strip}>
        {displaySegs.map((s, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cell + ' ' + styles.cellLeftTop}>
              <span className={styles.value}>{i + 1}.</span>
              {isReversed && (
                <span className={styles.origBadge}>Seg{s.origOrder}</span>
              )}
            </div>
            <div className={styles.cell + ' ' + styles.cellRightTop}>
              <span className={styles.label}>L</span>
              <span className={styles.value}>{s.L.toFixed(0)}<span className={styles.unit}>mm</span></span>
            </div>
            <div className={styles.cell + ' ' + styles.cellLeftBot}>
              <span className={styles.label}>R</span>
              <span className={styles.value}>{s.R.toFixed(0)}<span className={styles.unit}>mm</span></span>
            </div>
            <div className={styles.cell + ' ' + styles.cellRightBot}>
              <span className={styles.label}>Y</span>
              <span className={styles.value}>{s.arc.toFixed(0)}<span className={styles.unit}>mm</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
