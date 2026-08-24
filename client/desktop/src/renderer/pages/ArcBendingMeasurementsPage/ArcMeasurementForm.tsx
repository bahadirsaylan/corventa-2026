import { useEffect, useState } from 'react'
import styles from './ArcMeasurementForm.module.css'
import ArcInfoModal from './ArcInfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import profileImage from '@/assets/images/blend4-1-buyuk.png'
import methodImage from '@/assets/images/blend4-3-buyuk.png'

// 2026-08-18: Alpha ile ArcLen arasında toggle. Backend her durumda α bekler,
// ArcLen modunda α otomatik hesaplanır (α = 180 − L·180/(π·R)).
// 2026-08-24: Eski akışta tek segment vardı, artık P adet segment ana ekranda
// alınıyor (arcBending.segments[]). Her segment kendi R/α/L değerlerine sahip;
// mode toggle (angle/arcLen) tüm segmentler için ortak.
export type ArcInputMode = 'angle' | 'arcLen'

export type ArcMainFieldKey = 'A' | 'B' | 'S' | 'H' | 'P' | 'G' | 'LT'
export type ArcSegmentFieldKey = 'R' | 'Alpha' | 'ArcLen' | 'L'

export interface ArcSegmentValues {
  R: string
  Alpha: string
  ArcLen: string
  L: string
}

export interface ArcMeasurementValues {
  A: string
  B: string
  S: string
  H: string
  P: string
  G: string
  LT: string
  segments: ArcSegmentValues[]
}

type NumpadTarget =
  | { kind: 'main'; field: ArcMainFieldKey }
  | { kind: 'segment'; index: number; field: ArcSegmentFieldKey }

interface FieldInfo {
  title: string
  description: string
}

const FIELD_INFO: Record<ArcMainFieldKey | ArcSegmentFieldKey, FieldInfo> = {
  A: {
    title: 'A :',
    description:
      'PROFİLE AİT 1.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.',
  },
  B: {
    title: 'B :',
    description:
      'PROFİLE AİT 2.KENAR ÖLÇÜSÜDÜR. MAKİNANIN DOĞRU BİR SIKIŞTIRMA YAPMASI İÇİN ÖNEM TAŞIR.',
  },
  S: {
    title: 'S :',
    description:
      'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVIRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.',
  },
  R: {
    title: 'R :',
    description:
      'KIVIRIM YARIÇAP ÖLÇÜSÜDÜR (mm). BU SEGMENTİN HEDEF YARIÇAP DEĞERİDİR. HER SEGMENT KENDİ R DEĞERİNE SAHİPTİR.',
  },
  Alpha: {
    title: 'α :',
    description:
      'KIVIRIM AÇI ÖLÇÜSÜDÜR (derece). BU SEGMENTİN AÇISI (0 < α < 180). YAY UZUNLUĞU L = 2π·R·(180-α)/360 FORMÜLÜYLE HESAPLANIR.',
  },
  ArcLen: {
    title: 'Yay :',
    description:
      'KIVIRIM YAY UZUNLUĞU (mm). AÇI YERİNE DOĞRUDAN YAY UZUNLUĞU GİRMEK İÇİN KULLANIN (0 < Yay < π·R). BACKEND α = 180 − (Yay·180)/(π·R) İLE α HESAPLAR.',
  },
  P: {
    title: 'P :',
    description:
      'KIVIRIM ÇAP ADEDİDİR. PARÇANIZDAKİ KAÇ ADET ÇAP KIVRIMI VARSA GİRMELİSİNİZ. GİRDİĞİNİZ SAYI KADAR SEGMENT KARTI OTOMATİK AÇILIR VE HER BİRİNİ AYRI DOLDURURSUNUZ.',
  },
  L: {
    title: 'L :',
    description:
      'BU SEGMENTİN SONRAKİ RADİUSA OLAN DÜZLÜĞÜDÜR (mm). ART ARDA GELEN RADİUSLARDA "0" OLARAK YAZILMALIDIR. SON SEGMENTTE 0 OLABİLİR.',
  },
  H: {
    title: 'H :',
    description:
      'MAKİNE HIZINI METRE/DAKİKA PARAMETRESİNDE BELİRLENEN SINIRLAR İÇERİSİNDE AYARLAMANIZA OLANAK SAĞLAMAKTADIR.',
  },
  G: {
    title: 'G :',
    description:
      'MAKİNE KIVIRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMI EN KISA SÜREDE YAPAR.',
  },
  LT: {
    title: 'LT :',
    description:
      'PROFİLİN TOPLAM UZUNLUĞUDUR (mm). TÜM KIVRIM VE DÜZLÜKLERİN TOPLAMI, GÜVENLİK PAYI KADAR EKSİK OLMALIDIR. MAKİNE KIVIRIMI BU UZUNLUĞA GÖRE PLANLAR.',
  },
}

const MAIN_LEFT: ArcMainFieldKey[] = ['A', 'B', 'S', 'H']
const MAIN_RIGHT: ArcMainFieldKey[] = ['P', 'G', 'LT']

interface Props {
  values: ArcMeasurementValues
  onChange: (values: ArcMeasurementValues) => void
  onReset: () => void
  inputMode: ArcInputMode
  onInputModeChange: (mode: ArcInputMode) => void
}

// Backend Core/Models/ArcBudgetCalculator ile birebir formüller
function computeArcLength(radiusMm: number, angleDeg: number): number {
  return (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360
}
function computeAngleFromArc(radiusMm: number, arcMm: number): number {
  return 180 - (arcMm * 180) / (Math.PI * radiusMm)
}

// Backend safetyMarginMm varsayılanı — MachineSettings.DefaultSafetyMarginMm eşleşmesi
// Backend DataApi ile UI arasında runtime pull yerine sabit tutuldu; kullanıcı LT'ye buna
// göre bakar. Değişirse UI hala backend'in gerçek reject/kabul kararına güvenir.
const DEFAULT_SAFETY_MM = 100

interface SegmentBudget {
  arc: number         // ham yay (mm)
  effArc: number      // bütçedeki yay (son seg -safety)
  effStraight: number // bütçedeki düzlük (seg1 min=safety)
  total: number       // segment bütçe toplamı
  valid: boolean      // R+α+L tam ve geçerli mi
}

function calcSegmentBudget(
  order: number, totalP: number, R: number, alpha: number, L: number, safety: number,
): SegmentBudget {
  const valid = R > 0 && alpha > 0 && alpha < 180 && L >= 0
  if (!valid) return { arc: 0, effArc: 0, effStraight: 0, total: 0, valid: false }
  const arc = computeArcLength(R, alpha)
  const effArc = (totalP > 0 && order === totalP) ? Math.max(0, arc - safety) : arc
  const effStraight = order === 1 ? Math.max(L, safety) : L
  return { arc, effArc, effStraight, total: effArc + effStraight, valid: true }
}

export function makeEmptySegment(): ArcSegmentValues {
  return { R: '', Alpha: '', ArcLen: '', L: '' }
}

/** P input'una göre segments dizisini yeniden boyutlandır — mevcut verileri korur */
export function resizeSegments(
  current: ArcSegmentValues[],
  targetCount: number,
): ArcSegmentValues[] {
  if (targetCount <= 0) return []
  if (current.length === targetCount) return current
  if (current.length > targetCount) return current.slice(0, targetCount)
  const extra = Array.from({ length: targetCount - current.length }, makeEmptySegment)
  return [...current, ...extra]
}

export default function ArcMeasurementForm({
  values,
  onChange,
  onReset,
  inputMode,
  onInputModeChange,
}: Props) {
  const [openInfo, setOpenInfo] = useState<ArcMainFieldKey | ArcSegmentFieldKey | null>(null)
  const [numpadTarget, setNumpadTarget] = useState<NumpadTarget | null>(null)

  // P input değişince segments dizisini otomatik boyutlandır (append/pop, verileri korur)
  useEffect(() => {
    const p = parseInt(values.P, 10)
    if (!Number.isFinite(p) || p <= 0) return
    const resized = resizeSegments(values.segments, p)
    if (resized !== values.segments) {
      onChange({ ...values, segments: resized })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.P])

  // Segment içi otomatik α ↔ Yay sync — R + kaynak alan varsa diğerini otomatik doldur.
  useEffect(() => {
    let changed = false
    const nextSegments = values.segments.map((seg) => {
      const r = parseFloat(seg.R)
      if (!Number.isFinite(r) || r <= 0) return seg
      if (inputMode === 'angle') {
        const a = parseFloat(seg.Alpha)
        if (Number.isFinite(a) && a > 0 && a < 180) {
          const arcStr = computeArcLength(r, a).toFixed(1)
          if (seg.ArcLen !== arcStr) {
            changed = true
            return { ...seg, ArcLen: arcStr }
          }
        }
      } else {
        const l = parseFloat(seg.ArcLen)
        if (Number.isFinite(l) && l > 0 && l < Math.PI * r) {
          const aStr = computeAngleFromArc(r, l).toFixed(2)
          if (seg.Alpha !== aStr) {
            changed = true
            return { ...seg, Alpha: aStr }
          }
        }
      }
      return seg
    })
    if (changed) onChange({ ...values, segments: nextSegments })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.segments, inputMode])

  function handleNumpadConfirm(value: string) {
    if (!numpadTarget) return
    if (numpadTarget.kind === 'main') {
      onChange({ ...values, [numpadTarget.field]: value })
    } else {
      const nextSegments = values.segments.map((seg, i) =>
        i === numpadTarget.index ? { ...seg, [numpadTarget.field]: value } : seg,
      )
      onChange({ ...values, segments: nextSegments })
    }
  }

  function renderMainField(field: ArcMainFieldKey) {
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>
        <div
          className={`${styles.fieldInput} ${values[field] ? styles.fieldInputFilled : ''}`}
          onClick={() => setNumpadTarget({ kind: 'main', field })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setNumpadTarget({ kind: 'main', field })}
          aria-label={`Enter value for ${field}`}
        >
          {values[field] || <span className={styles.placeholder}>0</span>}
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setOpenInfo(field)}
          aria-label={`Info for ${field}`}
        >
          ?
        </button>
      </div>
    )
  }

  function renderSegmentField(
    segIndex: number,
    field: ArcSegmentFieldKey,
    displayLabel: string,
  ) {
    const seg = values.segments[segIndex]
    const val = seg?.[field] ?? ''
    return (
      <div key={field} className={styles.segmentFieldRow}>
        <span className={styles.segmentFieldLabel}>{displayLabel}:</span>
        <div
          className={`${styles.segmentFieldInput} ${val ? styles.fieldInputFilled : ''}`}
          onClick={() => setNumpadTarget({ kind: 'segment', index: segIndex, field })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === 'Enter' && setNumpadTarget({ kind: 'segment', index: segIndex, field })
          }
          aria-label={`Segment ${segIndex + 1} value for ${field}`}
        >
          {val || <span className={styles.placeholder}>0</span>}
        </div>
        <button
          className={styles.segmentInfoBtn}
          onClick={() => setOpenInfo(field)}
          aria-label={`Info for ${field}`}
        >
          ?
        </button>
      </div>
    )
  }

  // Bütçe hesaplaması — her render'da (segments/LT/P değişince)
  const totalP = parseInt(values.P, 10) || values.segments.length
  const ltMm = parseFloat(values.LT) || 0
  const budgets: SegmentBudget[] = values.segments.map((seg, i) => {
    const R = parseFloat(seg.R)
    const alpha = parseFloat(seg.Alpha)
    const L = parseFloat(seg.L)
    return calcSegmentBudget(
      i + 1, totalP,
      Number.isFinite(R) ? R : 0,
      Number.isFinite(alpha) ? alpha : 0,
      Number.isFinite(L) ? L : 0,
      DEFAULT_SAFETY_MM,
    )
  })
  const cumulativeBudget = budgets.reduce((sum, b) => sum + b.total, 0)
  const ltValid = ltMm > 0
  const remaining = ltValid ? ltMm - cumulativeBudget : 0
  const remainingOverflow = ltValid && remaining < 0
  const anyBudgetValid = budgets.some((b) => b.valid)

  const currentNumpadValue = (() => {
    if (!numpadTarget) return ''
    if (numpadTarget.kind === 'main') return values[numpadTarget.field] ?? ''
    return values.segments[numpadTarget.index]?.[numpadTarget.field] ?? ''
  })()

  const numpadLabel = (() => {
    if (!numpadTarget) return ''
    if (numpadTarget.kind === 'main') return numpadTarget.field
    const disp =
      numpadTarget.field === 'Alpha' ? 'α' : numpadTarget.field === 'ArcLen' ? 'Yay' : numpadTarget.field
    return `Seg ${numpadTarget.index + 1} · ${disp}`
  })()

  return (
    <div className={styles.wrapper}>
      {/* ── Left: two image tiles ───────────────── */}
      <div className={styles.images}>
        <div className={styles.imageTile}>
          <img src={profileImage} alt="Profile diagram" className={styles.tileImage} />
        </div>
        <div className={styles.imageTile}>
          <img src={methodImage} alt="Arc method diagram" className={styles.tileImage} />
        </div>
      </div>

      {/* ── Right: main info + segments list + reset ──── */}
      <div className={styles.inputSection}>
        {/* Üst: A/B/S/H + P/G/LT (2-col grid) */}
        <div className={styles.inputGrid}>
          <div className={styles.inputCol}>{MAIN_LEFT.map(renderMainField)}</div>
          <div className={styles.inputCol}>{MAIN_RIGHT.map(renderMainField)}</div>
        </div>

        {/* Mode toggle (tüm segmentler için ortak) */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={inputMode === 'angle' ? styles.modeActive : styles.modeInactive}
            onClick={() => onInputModeChange('angle')}
          >
            R + α (Açı)
          </button>
          <button
            type="button"
            className={inputMode === 'arcLen' ? styles.modeActive : styles.modeInactive}
            onClick={() => onInputModeChange('arcLen')}
          >
            R + Yay (mm)
          </button>
        </div>

        {/* Segment kartları — P adet dinamik. P henüz girilmemişse boş liste. */}
        <div className={styles.segmentsList}>
          {values.segments.length === 0 && (
            <div className={styles.segmentsHint}>
              ⚠ Önce P (segment sayısı) giriniz — kartlar otomatik açılır.
            </div>
          )}
          {values.segments.map((_, i) => {
            const b = budgets[i]
            return (
              <div key={i} className={styles.segmentCard}>
                <div className={styles.segmentHeader}>SEGMENT {i + 1}</div>
                <div className={styles.segmentFields}>
                  {renderSegmentField(i, 'R', 'R')}
                  {inputMode === 'angle'
                    ? renderSegmentField(i, 'Alpha', 'α')
                    : renderSegmentField(i, 'ArcLen', 'Yay')}
                  {renderSegmentField(i, 'L', 'L')}
                </div>
                {b?.valid && (
                  <div className={styles.segmentBudgetInfo}>
                    Yay: <b>{b.arc.toFixed(1)}mm</b>
                    {' · '}Bütçe: <b>{b.total.toFixed(1)}mm</b>
                    {i + 1 === totalP && b.effArc !== b.arc && (
                      <span className={styles.budgetNote}>
                        {' '}(son seg yay −{DEFAULT_SAFETY_MM}mm safety)
                      </span>
                    )}
                    {i === 0 && b.effStraight !== parseFloat(values.segments[0].L || '0') && (
                      <span className={styles.budgetNote}>
                        {' '}(seg1 düzlük min={DEFAULT_SAFETY_MM}mm safety)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Toplam bütçe + kalan gösterge */}
        {anyBudgetValid && (
          <div
            className={`${styles.totalBudgetInfo} ${
              remainingOverflow ? styles.budgetOver : styles.budgetOk
            }`}
          >
            <span>
              Toplam bütçe: <b>{cumulativeBudget.toFixed(1)}mm</b>
              {ltValid && (
                <>
                  {' '}/ LT <b>{ltMm.toFixed(1)}mm</b>
                </>
              )}
            </span>
            {ltValid && (
              <span>
                Kalan: <b>{remaining.toFixed(1)}mm</b>
                {remainingOverflow && ' ⚠ AŞIM'}
              </span>
            )}
            {!ltValid && <span className={styles.budgetNote}>LT giriniz</span>}
          </div>
        )}

        <button className={styles.resetBtn} onClick={onReset}>
          ↺ SIFIRLA
        </button>
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <ArcInfoModal
          title={FIELD_INFO[openInfo].title}
          description={FIELD_INFO[openInfo].description}
          onClose={() => setOpenInfo(null)}
        />
      )}

      {/* ── Numpad modal ────────────────────────── */}
      {numpadTarget && (
        <NumpadModal
          fieldLabel={numpadLabel}
          initialValue={currentNumpadValue}
          onConfirm={handleNumpadConfirm}
          onClose={() => setNumpadTarget(null)}
        />
      )}
    </div>
  )
}
