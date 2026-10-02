// Büküm monitörü sahnesi — 4 vals topu + aradan geçen profil parçası (SEKIL-14-F).
//
// Tüm koordinatlar SEKIL-14-F.jpg (1000×750) üzerinden piksel ölçümüyle çıkarıldı:
//   profil bandı  : merkez (500, 25.5), iç R 346.4, dış R 385.5 (kalınlık 39), renk #FFE87E
//   uçlar         : zikzak kırılma çizgisi (profilin devam ettiğini gösterir), bant zikzakta kesilir
//   kırmızı oklar : bant uçlarına bakan çerçeve oklar (uçların yukarı kıvrılma yönü)
//   küçük daireler: yan dayama makaraları
//   toplar        : üst (500,265) alt (500,519) sol (257,456) sağ (743,456), çap 208
// Sahne, referans koordinatlarını tek bir ölçekle (top 208px → 180px) dönüştürür; böylece
// SVG çizim ile HTML toplar birebir hizalı kalır.

import BendingBall from './BendingBall'
import styles from './ProfileArcStage.module.css'

// Referansta sahnenin kapsadığı bölge
const REGION = { x: 120, y: 180, w: 760, h: 460 }
const REF_BALL_D = 208
const BALL_D = 180
const S = BALL_D / REF_BALL_D

const ARC = { cx: 500, cy: 25.5, rIn: 346.4, rOut: 385.5, deg: 64 }

const BALLS = {
  top: { x: 500, y: 265 },
  bottom: { x: 500, y: 519 },
  left: { x: 257, y: 456 },
  right: { x: 743, y: 456 },
}

// Sol ok (çerçeve) — sağ ok x' = 1000 − x aynası
const LEFT_ARROW: [number, number][] = [[219, 262], [258, 252], [293, 284], [252, 293], [246, 335], [212, 303]]
const RIGHT_ARROW = LEFT_ARROW.map(([x, y]) => [1000 - x, y] as [number, number])

// Zikzak kırılma çizgileri (ölçülen)
const LEFT_ZIG: [number, number][] = [[173, 259], [194, 222], [214, 240], [228, 213]]
const RIGHT_ZIG: [number, number][] = [[773, 214], [804, 233], [787, 252], [820, 270]]

// Bandı zikzaklarda kesen kırpma alanı: sol zikzak (uzatılmış) → üstten → sağ zikzak (uzatılmış) → alttan
const CLIP: [number, number][] = [
  [131, 333], ...LEFT_ZIG, [256, 159],
  [742, 195], ...RIGHT_ZIG, [853, 288],
  [900, 700], [100, 700],
]

const SIDE_ROLLERS = [{ x: 199, y: 311 }, { x: 801, y: 311 }]

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  // 0° = tam aşağı, + = sağa
  return [ARC.cx + r * Math.sin(a), ARC.cy + r * Math.cos(a)]
}

function bandPath(): string {
  const [ox1, oy1] = polar(ARC.rOut, -ARC.deg)
  const [ox2, oy2] = polar(ARC.rOut, ARC.deg)
  const [ix2, iy2] = polar(ARC.rIn, ARC.deg)
  const [ix1, iy1] = polar(ARC.rIn, -ARC.deg)
  return [
    `M ${ox1} ${oy1}`,
    `A ${ARC.rOut} ${ARC.rOut} 0 0 0 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${ARC.rIn} ${ARC.rIn} 0 0 1 ${ix1} ${iy1}`,
    'Z',
  ].join(' ')
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ')

function ballStyle(c: { x: number; y: number }) {
  return {
    left: (c.x - REF_BALL_D / 2 - REGION.x) * S,
    top: (c.y - REF_BALL_D / 2 - REGION.y) * S,
  }
}

interface BallState {
  positionMm: number
  moving: boolean
  inPosition: boolean
}

interface Props {
  top: BallState
  bottom: BallState
  left: BallState
  right: BallState
  /** Band üstünde gösterilecek yarıçap etiketi, ör. "R 1500" */
  radiusLabel: string
}

export default function ProfileArcStage({ top, bottom, left, right, radiusLabel }: Props) {
  const [labelX, labelY] = polar((ARC.rIn + ARC.rOut) / 2, 0)

  return (
    <div className={styles.stage} style={{ width: REGION.w * S, height: REGION.h * S }}>
      <svg
        className={styles.svg}
        viewBox={`${REGION.x} ${REGION.y} ${REGION.w} ${REGION.h}`}
        width={REGION.w * S}
        height={REGION.h * S}
        aria-hidden
      >
        <defs>
          <clipPath id="profileArcClip">
            <polygon points={pts(CLIP)} />
          </clipPath>
        </defs>

        {/* Profil parçası */}
        <path d={bandPath()} className={styles.band} clipPath="url(#profileArcClip)" />

        {/* Yarıçap etiketi */}
        <text x={labelX} y={labelY} className={styles.label} textAnchor="middle" dominantBaseline="central">
          {radiusLabel}
        </text>

        {/* Kırılma çizgileri */}
        <polyline points={pts(LEFT_ZIG)} className={styles.zig} />
        <polyline points={pts(RIGHT_ZIG)} className={styles.zig} />

        {/* Yan dayama makaraları */}
        {SIDE_ROLLERS.map((c) => (
          <circle key={c.x} cx={c.x} cy={c.y} r={29} className={styles.roller} />
        ))}

        {/* Uç yön okları */}
        <polygon points={pts(LEFT_ARROW)} className={styles.arrow} />
        <polygon points={pts(RIGHT_ARROW)} className={styles.arrow} />
      </svg>

      {/* Vals topları (salt-okunur) */}
      <div className={styles.ball} style={ballStyle(BALLS.top)}>
        <BendingBall id="top" value={top.positionMm} active={top.moving || top.inPosition} disabled />
      </div>
      <div className={styles.ball} style={ballStyle(BALLS.left)}>
        <BendingBall id="left" value={left.positionMm} active={left.moving || left.inPosition} disabled />
      </div>
      <div className={styles.ball} style={ballStyle(BALLS.right)}>
        <BendingBall id="right" value={right.positionMm} active={right.moving || right.inPosition} disabled />
      </div>
      <div className={styles.ball} style={ballStyle(BALLS.bottom)}>
        <BendingBall id="bottom" value={bottom.positionMm} active={bottom.moving || bottom.inPosition} disabled />
      </div>
    </div>
  )
}
