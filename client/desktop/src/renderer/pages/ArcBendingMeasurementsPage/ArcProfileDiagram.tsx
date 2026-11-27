// Arc parça şeridi — özet ekranında (segment kartlarının altı) ve büküm sırasında alt panelde.
// Büküm sırasında soldan sağa: düzlük (düz çizgi) → radyus (yay) → düzlük → … → kalan parça.
// Ölçekli değil: yaylar sabit genişlikte, düzlükler uzunluklarıyla orantılı paylaşır (min genişlikli).
// Yaylar AŞAĞI doğru kıvrılır; derinlik büküm açısıyla (180 − α) artar.
// Tüm parçalar siyah; büküm sırasında o an yapılan parça (düzlük veya radyus) yeşil.
// Numaralar düzlükleri de kapsar: 1 düzlük, 2 radyus, 3 düzlük, …

import styles from './ArcProfileDiagram.module.css'
import { useT } from '@/i18n'

export interface DiagramSegment {
  /** Yaydan önceki düzlük (büküm sırasına göre) */
  L: number
  R: number
  alpha: number
  arc: number
}

/** O an yapılan parça: segment numarası büküm sırasında 1'den başlar */
export type ActivePiece = { kind: 'straight' | 'arc'; seg: number } | null

interface Props {
  segments: DiagramSegment[]
  /** Son yaydan sonra kalan düz parça */
  trailing: number
  active?: ActivePiece
}

const H = 100
const BASE = 22
const ARC_W = 132
const ARC_W_MIN = 72

type Piece =
  | { kind: 'straight'; seg: number; length: number; label: string }
  | { kind: 'arc'; seg: number; data: DiagramSegment }

export function buildPieces(segments: DiagramSegment[], trailing: number): Piece[] {
  const pieces: Piece[] = []
  segments.forEach((s, i) => {
    if (s.L > 0.5) pieces.push({ kind: 'straight', seg: i + 1, length: s.L, label: i === 0 ? 'BAŞ DÜZLÜK' : 'DÜZLÜK' })
    pieces.push({ kind: 'arc', seg: i + 1, data: s })
  })
  if (trailing > 0.5) pieces.push({ kind: 'straight', seg: segments.length + 1, length: trailing, label: 'KALAN' })
  return pieces
}

export default function ArcProfileDiagram({ segments, trailing, active = null }: Props) {
  const t = useT()
  const pieces = buildPieces(segments, trailing)
  const isActive = (p: Piece) => !!active && active.kind === p.kind && active.seg === p.seg
  // 2026-11-17 (QA): çok kıvrımda (5+) şerit sağdan taşıyordu (son parça / KALAN / SON kırpılıyordu) —
  // yay genişliği kıvrım sayısına göre daralır, sıkışık düzende yazılar küçülür (~960 px kullanılabilir genişlik)
  const nArc = pieces.filter((p) => p.kind === 'arc').length
  const nStraight = pieces.length - nArc
  const compact = nArc > 0 && nArc * ARC_W + nStraight * 64 > 960
  const arcW = compact
    ? Math.max(ARC_W_MIN, Math.min(ARC_W, Math.floor((960 - nStraight * 52) / nArc)))
    : ARC_W

  return (
    <div className={styles.diagram} data-compact={compact || undefined}>
      <span className={styles.endCap} data-side="start">{t('BAŞ')}</span>
      <div className={styles.row}>
        {pieces.map((p, i) =>
          p.kind === 'straight' ? (
            <div key={i} className={styles.straight} data-active={isActive(p) || undefined} style={{ flexGrow: p.length }}>
              <div className={styles.straightDraw}>
                <svg className={styles.svg} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
                  <line x1="0" y1={BASE} x2="100" y2={BASE} className={styles.line} vectorEffect="non-scaling-stroke" />
                </svg>
                <span className={styles.badgeHtml} style={{ top: BASE + 16 }}>{i + 1}</span>
              </div>
              <span className={styles.label}>{t(p.label)}</span>
              <span className={styles.value}>{p.length.toFixed(0)} mm</span>
            </div>
          ) : (
            <div key={i} className={styles.arcPiece} data-active={isActive(p) || undefined}>
              <ArcShape order={i + 1} bendDeg={180 - p.data.alpha} width={arcW} />
              <span className={styles.label}>R {p.data.R.toFixed(0)}</span>
              <span className={styles.value}>{t('YAY')} {p.data.arc.toFixed(0)} mm</span>
            </div>
          ),
        )}
      </div>
      <span className={styles.endCap} data-side="end">{t('SON')}</span>
    </div>
  )
}

function ArcShape({ order, bendDeg, width = ARC_W }: { order: number; bendDeg: number; width?: number }) {
  // Sagitta: 14..52 px arası, büküm açısıyla orantılı (dar yayda genişlikle orantılı küçülür)
  const bend = Math.max(0, Math.min(180, bendDeg))
  const h = (14 + (bend / 180) * 38) * Math.min(1, width / ARC_W)
  const half = width / 2
  const r = (half * half + h * h) / (2 * h)
  const bottomY = BASE + h
  const badgeY = Math.min(H - 13, bottomY + 16)

  return (
    <svg className={styles.svgArc} viewBox={`0 0 ${width} ${H}`} width={width} height={H} aria-hidden>
      <path d={`M 0 ${BASE} A ${r} ${r} 0 0 0 ${width} ${BASE}`} className={styles.line} />
      <circle cx={half} cy={badgeY} r="12" className={styles.badge} />
      <text x={half} y={badgeY} className={styles.badgeText} textAnchor="middle" dominantBaseline="central">
        {order}
      </text>
    </svg>
  )
}
