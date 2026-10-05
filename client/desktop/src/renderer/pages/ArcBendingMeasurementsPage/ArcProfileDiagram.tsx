// Arc özet ekranı — segment kartlarının altında parçanın şematik şeridi.
// Büküm sırasında soldan sağa: düzlük (düz çizgi) → radyus (yay) → düzlük → … → kalan parça.
// Ölçekli değil: yaylar sabit genişlikte, düzlükler uzunluklarıyla orantılı paylaşır (min genişlikli).
// Yay yüksekliği büküm açısıyla (180 − α) artar — operatör hangisi daha çok kıvrılıyor görür.

import styles from './ArcProfileDiagram.module.css'

export interface DiagramSegment {
  /** Yaydan önceki düzlük (büküm sırasına göre) */
  L: number
  R: number
  alpha: number
  arc: number
}

interface Props {
  segments: DiagramSegment[]
  /** Son yaydan sonra kalan düz parça */
  trailing: number
}

const H = 96
const BASE = 74
const ARC_W = 132

type Piece =
  | { kind: 'straight'; length: number; label: string }
  | { kind: 'arc'; order: number; seg: DiagramSegment }

export default function ArcProfileDiagram({ segments, trailing }: Props) {
  const pieces: Piece[] = []
  segments.forEach((s, i) => {
    if (s.L > 0.5) pieces.push({ kind: 'straight', length: s.L, label: i === 0 ? 'BAŞ DÜZLÜK' : 'DÜZLÜK' })
    pieces.push({ kind: 'arc', order: i + 1, seg: s })
  })
  if (trailing > 0.5) pieces.push({ kind: 'straight', length: trailing, label: 'KALAN' })

  return (
    <div className={styles.diagram}>
      <span className={styles.endCap} data-side="start">BAŞ</span>
      <div className={styles.row}>
        {pieces.map((p, i) =>
          p.kind === 'straight' ? (
            <div key={i} className={styles.straight} style={{ flexGrow: p.length }}>
              <svg className={styles.svg} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1={BASE} x2="100" y2={BASE} className={styles.lineStraight} vectorEffect="non-scaling-stroke" />
              </svg>
              <span className={styles.label}>{p.label}</span>
              <span className={styles.value}>{p.length.toFixed(0)} mm</span>
            </div>
          ) : (
            <div key={i} className={styles.arcPiece}>
              <ArcShape order={p.order} bendDeg={180 - p.seg.alpha} />
              <span className={styles.labelArc}>R {p.seg.R.toFixed(0)}</span>
              <span className={styles.value}>YAY {p.seg.arc.toFixed(0)} mm</span>
            </div>
          ),
        )}
      </div>
      <span className={styles.endCap} data-side="end">SON</span>
    </div>
  )
}

function ArcShape({ order, bendDeg }: { order: number; bendDeg: number }) {
  // Sagitta: 14..52 px arası, büküm açısıyla orantılı
  const bend = Math.max(0, Math.min(180, bendDeg))
  const h = 14 + (bend / 180) * 38
  const half = ARC_W / 2
  const r = (half * half + h * h) / (2 * h)
  const topY = BASE - h

  return (
    <svg className={styles.svgArc} viewBox={`0 0 ${ARC_W} ${H}`} width={ARC_W} height={H} aria-hidden>
      <path d={`M 0 ${BASE} A ${r} ${r} 0 0 1 ${ARC_W} ${BASE}`} className={styles.lineArc} />
      <circle cx={half} cy={Math.max(14, topY - 14)} r="12" className={styles.badge} />
      <text x={half} y={Math.max(14, topY - 14)} className={styles.badgeText} textAnchor="middle" dominantBaseline="central">
        {order}
      </text>
    </svg>
  )
}
