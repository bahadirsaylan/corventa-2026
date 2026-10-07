// Çok açılı (Arc) büküm sırasında alt panelde parça şeridi — o an yapılan düzlük/radyus yeşil.
//
// Aktif parça backend ilerleme mesajından okunur (ExecuteArcBendingHandler):
//   "Seg{n} düzlük"  → n. radyusun önündeki düzlük boyunca ilerleniyor
//   "Seg{n} paso…"   → n. radyus bükülüyor (ölçüm/düzeltme sırasında da mesaj aynı kalır)
//   "…sıfırlanıyor…" → Zero, 1. düzlüğü de kapsar
// Segment numaraları BÜKÜM SIRASINDADIR. Ters sıralı işte DataApi orijinal sırayı tutar;
// backend BuildReversedSegments ile çevirir — burada aynı dönüşüm uygulanır.

import type { BendingJob, BendingProgress } from '@shared/types'
import ArcProfileDiagram, {
  buildPieces,
  type ActivePiece,
  type DiagramSegment,
} from '@/pages/ArcBendingMeasurementsPage/ArcProfileDiagram'
import styles from './ArcBendingStrip.module.css'

interface Props {
  job: BendingJob
  progress: BendingProgress | null
}

const arcLength = (r: number, alpha: number) => (2 * Math.PI * r * (180 - alpha)) / 360

/** DataApi segmentleri (orijinal sıra) → büküm sırası + kalan düz parça */
export function arcBendingOrder(job: BendingJob): { segments: DiagramSegment[]; trailing: number } {
  const orig = [...(job.segments ?? [])]
    .sort((a, b) => a.segmentOrder - b.segmentOrder)
    .map((s) => ({ L: s.straightAfterMm, R: s.radiusMm, alpha: s.angleDeg, arc: arcLength(s.radiusMm, s.angleDeg) }))
  const n = orig.length
  const sum = orig.reduce((t, s) => t + s.L + s.arc, 0)
  const trailing = Math.max(0, job.partLengthMm - sum)
  const reversed = (job as { isReversedArcOrder?: boolean | null }).isReversedArcOrder === true
  if (!reversed || n === 0) return { segments: orig, trailing }

  //   Backend BuildReversedSegments ile aynı:
  //     yeni[0] = { yay: orig[N-1], L: kalan },  yeni[i] = { yay: orig[N-1-i], L: orig[N-i].L },  yeni kalan = orig[0].L
  const segments: DiagramSegment[] = [{ ...orig[n - 1], L: trailing }]
  for (let i = 1; i < n; i++) segments.push({ ...orig[n - 1 - i], L: orig[n - i].L })
  return { segments, trailing: orig[0].L }
}

export function activePieceFromMessage(message: string | null | undefined): ActivePiece {
  const m = message ?? ''
  let r = /^seg(\d+)\s+düzlük/i.exec(m)
  if (r) return { kind: 'straight', seg: Number(r[1]) }
  r = /^seg(\d+)\s+paso/i.exec(m)
  if (r) return { kind: 'arc', seg: Number(r[1]) }
  if (/sıfırlan/i.test(m)) return { kind: 'straight', seg: 1 }
  return null
}

export default function ArcBendingStrip({ job, progress }: Props) {
  const { segments, trailing } = arcBendingOrder(job)
  const active = activePieceFromMessage(progress?.message)

  const pieces = buildPieces(segments, trailing)
  const idx = active ? pieces.findIndex((p) => p.kind === active.kind && p.seg === active.seg) : -1
  let status = progress?.message ?? 'BÜKÜM BAŞLATILIYOR…'
  if (idx >= 0 && active) {
    const seg = segments[active.seg - 1]
    status =
      active.kind === 'straight'
        ? `${idx + 1} · DÜZLÜK — PARÇA İLERLETİLİYOR`
        : `${idx + 1} · RADYUS R ${seg ? seg.R.toFixed(0) : ''} BÜKÜLÜYOR`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>ÇOK AÇILI BÜKÜM</span>
        <span className={styles.status} data-active={idx >= 0 || undefined}>{status}</span>
      </div>
      <div className={styles.diagram}>
        <ArcProfileDiagram segments={segments} trailing={trailing} active={active} />
      </div>
    </div>
  )
}
