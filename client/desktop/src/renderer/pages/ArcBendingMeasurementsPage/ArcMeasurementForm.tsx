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

export type ArcFormStage = 'main' | 'segments'

interface Props {
  values: ArcMeasurementValues
  onChange: (values: ArcMeasurementValues) => void
  onReset: () => void
  inputMode: ArcInputMode
  onInputModeChange: (mode: ArcInputMode) => void
  stage: ArcFormStage
}

/** Aşama 1'den 2'ye geçiş kontrolü — sadece ana required alanların dolu ve P>0 olmasını arar. */
export function mainFieldsValid(v: ArcMeasurementValues): boolean {
  const mainRequired: ArcMainFieldKey[] = ['A', 'B', 'S', 'H', 'P', 'G', 'LT']
  if (!mainRequired.every((k) => v[k].trim() !== '')) return false
  const p = parseInt(v.P, 10)
  return Number.isFinite(p) && p > 0
}

// Backend Core/Models/ArcBudgetCalculator ile birebir formüller
function computeArcLength(radiusMm: number, angleDeg: number): number {
  return (2 * Math.PI * radiusMm * (180 - angleDeg)) / 360
}
function computeAngleFromArc(radiusMm: number, arcMm: number): number {
  return 180 - (arcMm * 180) / (Math.PI * radiusMm)
}

// Backend varsayılanları — MachineSettings alanlarıyla eşleşir. Runtime fetch yerine
// sabit tutuldu; kullanıcı UI erken uyarı için bakar, backend gerçek DB değerleriyle
// son kararı verir (kalibrasyon değişirse UI biraz drift eder ama backend reject/kabul
// mercii her zaman kesindir).
const DEFAULT_SAFETY_MM = 100                    // MachineSettings.DefaultSafetyMarginMm
export const DEFAULT_MEASUREMENT_DISTANCE_MM = 850  // MachineSettings.DefaultMeasurementDistanceMm — "T"
export const DEFAULT_XA1_ABS_MM = 465            // |MachineSettings.DefaultXA1| — Stage 2 default (2026-08-24)

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

// Segment imkân kontrolü (2026-08-24 revize — mod matrisi + min yay):
//   Min yay: L_yay ≥ 250mm (SLPIS prop çubuğu minimum ölçüm mesafesi).
//   Kural 1 (T): yay < T ise (yay + kalan_raw) ≥ T olmalı; aksi halde ölçüm imkânsız.
//   Kural 2 (XA1 matrisi — mod belirleme):
//     Düzlük > XA1 && Kalan > XA1 → Middle mod
//     Düzlük < XA1 && Kalan > XA1 → Normal mod
//     Düzlük > XA1 && Kalan < XA1 → ReverseNormal (ters büküm, yay boyunca geri döner)
//     Düzlük < XA1 && Kalan < XA1 → İmkânsız (hiçbir mod çalışmaz)
export type SegmentMode = 'normal' | 'middle' | 'reverse-normal'

export const MIN_ARC_LENGTH_MM = 250

export interface SegmentFeasibility {
  feasible: boolean          // false = imkânsız (submit block), true = 3 mod'dan biri seçildi
  mode?: SegmentMode         // yalnızca feasible=true iken
  reason?: 'T-measurement' | 'XA1-min' | 'min-arc'
  detail?: string            // imkânsızlık detayı VEYA ReverseNormal bilgisi
}

export function checkSegmentFeasibility(
  arc: number, L: number, remainingAfterSeg: number, partAdvanceBeforeSeg: number,
  tMm: number, xa1AbsMm: number,
): SegmentFeasibility {
  //   Min yay 250mm — SLPIS ölçemez, backend runtime fail
  if (arc < MIN_ARC_LENGTH_MM) {
    return {
      feasible: false,
      reason: 'min-arc',
      detail: `Yay uzunluğunu veya Açı değerini arttırın`,
    }
  }
  //   XA1 mod matrisi ÖNCE — mode belirlensin, T kuralı mode'a göre farklı yön kullanacak.
  const duzlukOk = L > xa1AbsMm
  const kalanOk = remainingAfterSeg > xa1AbsMm
  if (!duzlukOk && !kalanOk) {
    //   Fix: LT'yi (XA1 - kalan + 1)mm arttırırsak kalan XA1'i geçer → Normal mod çalışır.
    const deficit = Math.max(1, Math.ceil(xa1AbsMm - remainingAfterSeg + 1))
    return {
      feasible: false,
      reason: 'XA1-min',
      detail: `Parçayı ${deficit}mm arttırın`,
    }
  }
  let mode: SegmentMode
  let modeDetail: string | undefined
  if (duzlukOk && kalanOk) {
    mode = 'middle'
  } else if (!duzlukOk && kalanOk) {
    mode = 'normal'
  } else {
    //   duzlukOk && !kalanOk → ReverseNormal (ters büküm)
    mode = 'reverse-normal'
    modeDetail = `Kalan parça (${remainingAfterSeg.toFixed(1)}mm) |XA1|'den küçük — normal yönde yetmez, ` +
                 `ters yönde bükülecek (yay boyunca geri döner, ölçüm karşı sensor tarafında).`
  }

  //   T kuralı — ölçüm için parça yeterli mi (MOD-AWARE):
  //     Normal + Middle: ölçüm ekstra rot İLERİ yönde → kalan_raw ≥ needed olmalı
  //     ReverseNormal:   ölçüm ekstra rot GERİ yönde → partAdvance ≥ needed olmalı
  if (arc < tMm) {
    const needed = tMm - arc
    const availableForMeasurement = mode === 'reverse-normal' ? partAdvanceBeforeSeg : remainingAfterSeg
    const dirLabel = mode === 'reverse-normal' ? 'öndeki parça (partAdvance)' : 'kalan parça'
    if (availableForMeasurement < needed) {
      return {
        feasible: false,
        reason: 'T-measurement',
        detail: `Yay ${arc.toFixed(1)}mm < T=${tMm.toFixed(0)}mm; ${mode === 'reverse-normal' ? 'ters' : 'normal'} yönde ` +
                `ölçüm için ekstra ${needed.toFixed(1)}mm rotasyon lazım ama ${dirLabel} ${availableForMeasurement.toFixed(1)}mm yetersiz.`,
      }
    }
  }

  return { feasible: true, mode, detail: modeDetail }
}

// Segments listesinin feasibility'sini toplu hesap — Page'in isComplete'ında kullanılır.
// kalan_seg_sonu = FIZIKSEL RAW kalan (yay + düzlük toplamı, safety uygulanmaz) — kullanıcı
// bakış açısıyla parçanın seg sonrasında arkada duran uzunluğu.
export function computeAllFeasibilities(
  segments: ArcSegmentValues[], totalP: number, ltMm: number, safety: number,
  tMm: number, xa1AbsMm: number,
): SegmentFeasibility[] {
  const result: SegmentFeasibility[] = []
  let cumRaw = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const R = parseFloat(seg.R)
    const alpha = parseFloat(seg.Alpha)
    const L = parseFloat(seg.L)
    const b = calcSegmentBudget(
      i + 1, totalP,
      Number.isFinite(R) ? R : 0,
      Number.isFinite(alpha) ? alpha : 0,
      Number.isFinite(L) ? L : 0,
      safety,
    )
    //   partAdvanceBeforeSeg: seg dahil edilmeden önceki kümülatif raw (ters bükümde
    //   ölçüm ekstra rot için parça öncesi tarafta yer var mı diye kullanılır).
    const partAdvanceBeforeSeg = cumRaw
    cumRaw += b.arc + (Number.isFinite(L) ? L : 0)   // RAW fiziksel
    //   Feasibility check yapılabilmesi için: LT girilmiş VE segment geçerli olmalı.
    //   Aksi halde 'feasible' varsayarız (kullanıcı henüz veri girmedi).
    if (!b.valid || ltMm <= 0) {
      result.push({ feasible: true })
      continue
    }
    const remainingRaw = ltMm - cumRaw
    result.push(
      checkSegmentFeasibility(
        b.arc, Number.isFinite(L) ? L : 0,
        remainingRaw, partAdvanceBeforeSeg,
        tMm, xa1AbsMm,
      ),
    )
  }
  return result
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
  stage,
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

  // Bütçe + imkân hesaplaması — her render'da (segments/LT/P değişince)
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
  //   RAW toplam (kullanıcı bakış açısı: yay + düzlük fiziksel, safety uygulanmadan).
  //   cumulativeBudget (safety uygulanmış) sadece internal check için — UI'da göstermez,
  //   backend zaten DataApi validation'da bütçe check yapar.
  const cumulativeRaw = values.segments.reduce((sum, seg, i) => {
    const b = budgets[i]
    const L = parseFloat(seg.L)
    if (!b.valid) return sum
    return sum + b.arc + (Number.isFinite(L) ? L : 0)
  }, 0)
  const ltValid = ltMm > 0
  const remaining = ltValid ? ltMm - cumulativeRaw : 0
  const remainingOverflow = ltValid && remaining < 0
  const anyBudgetValid = budgets.some((b) => b.valid)

  //   Feasibility: T + XA1 imkân kontrolleri (her segment için).
  //   LT girilmemişse hesap yapılmaz (kullanıcı henüz yeterli veri girmemiş).
  const feasibilities = computeAllFeasibilities(
    values.segments, totalP, ltMm, DEFAULT_SAFETY_MM,
    DEFAULT_MEASUREMENT_DISTANCE_MM, DEFAULT_XA1_ABS_MM,
  )
  const anyInfeasible = feasibilities.some((f) => !f.feasible)

  //   MEKANİKÇİ KURALI (2026-09-07):
  //   - leading ≥ 500 → FORWARD, extension yok, Seg1 Middle
  //   - trailing ≥ 500 (leading kısa) → REVERSE, extension yok, parça sonundan başla
  //   - her ikisi < 500 → HANGİSİ BÜYÜKSE 500'e tamamla:
  //       leading > trailing: leading'e fire (kesilecek), FORWARD
  //       trailing ≥ leading: trailing'e material (kalır), REVERSE
  //   Backend aynı kural ArcBudgetCalculator.DecideExtension'da.
  const MIDDLE_THRESHOLD_MM = 500
  const firstSegDuz = values.segments.length > 0 ? parseFloat(values.segments[0].L) : NaN
  const validFirstDuz = Number.isFinite(firstSegDuz) && firstSegDuz >= 0
  const trailingMm = ltValid ? Math.max(0, ltMm - cumulativeRaw) : 0
  const leadingOk = validFirstDuz && firstSegDuz >= MIDDLE_THRESHOLD_MM
  const trailingOk = ltValid && trailingMm >= MIDDLE_THRESHOLD_MM

  let leadingFireMm = 0
  let trailingExtMm = 0
  let executionDirection: 'Forward' | 'Reverse' = 'Forward'

  if (validFirstDuz) {
    if (leadingOk) {
      executionDirection = 'Forward'
    } else if (trailingOk) {
      executionDirection = 'Reverse'
    } else if (ltValid) {
      // Her ikisi de eşik altı — hangisi büyükse onu tamamla
      if (firstSegDuz >= trailingMm) {
        executionDirection = 'Forward'
        leadingFireMm = MIDDLE_THRESHOLD_MM - firstSegDuz
      } else {
        executionDirection = 'Reverse'
        trailingExtMm = MIDDLE_THRESHOLD_MM - trailingMm
      }
    }
  }
  const totalExtensionMm = leadingFireMm + trailingExtMm
  const requiredLTMm = ltMm + totalExtensionMm
  const partLengthInsufficientForFire = totalExtensionMm > 0 && ltValid && ltMm < requiredLTMm - 1

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

  // 2026-09-03: 2-aşamalı wizard. Aşama 1'de görseller + ana parametreler; aşama 2'de
  // özet bant + tam genişlik segmentler + mode toggle + toplam bütçe.
  const isMainStage = stage === 'main'

  return (
    <div className={`${styles.wrapper} ${isMainStage ? styles.wrapperMain : styles.wrapperSegments}`}>
      {/* ── AŞAMA 1: Sol görseller ─────────────── */}
      {isMainStage && (
        <div className={styles.images}>
          <div className={styles.imageTile}>
            <img src={profileImage} alt="Profile diagram" className={styles.tileImage} />
          </div>
          <div className={styles.imageTile}>
            <img src={methodImage} alt="Arc method diagram" className={styles.tileImage} />
          </div>
        </div>
      )}

      {/* ── Sağ / Ana bölüm ─────────────────────── */}
      <div className={styles.inputSection}>
        {isMainStage ? (
          <>
            {/* AŞAMA 1: A/B/S/H + P/G/LT (2-col grid) */}
            <div className={styles.inputGrid}>
              <div className={styles.inputCol}>{MAIN_LEFT.map(renderMainField)}</div>
              <div className={styles.inputCol}>{MAIN_RIGHT.map(renderMainField)}</div>
            </div>

            <button className={styles.resetBtn} onClick={onReset}>
              ↺ SIFIRLA
            </button>
          </>
        ) : (
          <>
            {/* AŞAMA 2: Kompakt özet bant */}
            <div className={styles.summaryBar}>
              <span><b>A</b>={values.A || '—'}</span>
              <span><b>B</b>={values.B || '—'}</span>
              <span><b>S</b>={values.S || '—'}</span>
              <span><b>H</b>={values.H || '—'}</span>
              <span><b>P</b>={values.P || '—'}</span>
              <span><b>G</b>={values.G || '—'}</span>
              <span><b>LT</b>={values.LT || '—'}mm</span>
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

            {/* Segment kartları — P adet dinamik. */}
            <div className={styles.segmentsList}>
              {values.segments.length === 0 && (
                <div className={styles.segmentsHint}>
                  ⚠ Önce P (segment sayısı) giriniz — kartlar otomatik açılır.
                </div>
              )}
              {values.segments.map((_, i) => {
                const b = budgets[i]
                const f = feasibilities[i]
                return (
                  <div
                    key={i}
                    className={`${styles.segmentCard} ${
                      f && !f.feasible ? styles.segmentCardInfeasible : ''
                    }`}
                  >
                    <div className={styles.segmentHeader}>SEGMENT {i + 1}</div>
                    <div className={styles.segmentFields}>
                      {/* 2026-09-03: sıra L → α/Yay → R (Düzlük, Yay, Radyus) */}
                      {renderSegmentField(i, 'L', 'L')}
                      {inputMode === 'angle'
                        ? renderSegmentField(i, 'Alpha', 'α')
                        : renderSegmentField(i, 'ArcLen', 'Yay')}
                      {renderSegmentField(i, 'R', 'R')}
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
                    {f && !f.feasible && (
                      <div className={styles.segmentInfeasibleWarn}>
                        <div className={styles.warnHead}>
                          {f.reason === 'min-arc'
                            ? '⚠ Yay uzunluğu minimum sınırın altında'
                            : '⚠ Bu kıvrım mümkün değil, parça uzunluğunu arttırın ya da manuel bükün!'}
                        </div>
                        <div className={styles.warnDetail}>{f.detail}</div>
                      </div>
                    )}
                    {f && f.feasible && f.mode === 'reverse-normal' && (
                      <div className={styles.segmentReverseInfo}>
                        <div className={styles.reverseHead}>🔄 TERS BÜKÜM</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* MEKANİKÇİ KURALI uyarı bandı (2026-09-07 revize) */}
            {anyBudgetValid && validFirstDuz && ltValid && (
              <>
                {/* Extension gerekli — parça yetersiz (turuncu, kalın) */}
                {partLengthInsufficientForFire && leadingFireMm > 0 && (
                  <div className={styles.fireWarnBad}>
                    <div className={styles.fireWarnHead}>
                      ⚠ Parçanızı <b>{leadingFireMm.toFixed(0)} mm</b> uzatın (başına fire)
                    </div>
                    <div className={styles.fireWarnBody}>
                      Yeni parça boyu (LT): <b>{requiredLTMm.toFixed(0)} mm</b> olmalı
                      &nbsp;(şu an <b>{ltMm.toFixed(0)} mm</b>).
                      Uzatılan {leadingFireMm.toFixed(0)} mm büküm sonrası kesilecek.
                    </div>
                  </div>
                )}
                {partLengthInsufficientForFire && trailingExtMm > 0 && (
                  <div className={styles.fireWarnBad}>
                    <div className={styles.fireWarnHead}>
                      ⚠ Parçanızı <b>{trailingExtMm.toFixed(0)} mm</b> uzatın (sonuna güvenlik payı)
                    </div>
                    <div className={styles.fireWarnBody}>
                      Yeni parça boyu (LT): <b>{requiredLTMm.toFixed(0)} mm</b> olmalı
                      &nbsp;(şu an <b>{ltMm.toFixed(0)} mm</b>).
                      Ek parça ucunda kalır (kesilmez). Büküm parçanın SONUNDAN başlar.
                    </div>
                  </div>
                )}
                {/* Extension gerekmez ama Reverse mode aktif (info) */}
                {!partLengthInsufficientForFire && executionDirection === 'Reverse' && totalExtensionMm === 0 && (
                  <div className={styles.fireWarnOk}>
                    <div className={styles.fireWarnHead}>
                      ℹ Büküm parçanın SONUNDAN başlayacak
                    </div>
                    <div className={styles.fireWarnBody}>
                      Parça sonu ({trailingMm.toFixed(0)} mm) yeterli, ilk düzlük ({firstSegDuz.toFixed(0)} mm) kısa.
                      Ek malzeme gerekmez. Bükümün sonu operatör Seg 1 pozisyonunda biter.
                    </div>
                  </div>
                )}
                {/* Extension yapıldı, parça yeterli (info) */}
                {!partLengthInsufficientForFire && totalExtensionMm > 0 && (
                  <div className={styles.fireWarnOk}>
                    <div className={styles.fireWarnHead}>
                      {leadingFireMm > 0
                        ? `ℹ İlk düzlüğe ${leadingFireMm.toFixed(0)} mm fire eklenecek`
                        : `ℹ Parça sonuna ${trailingExtMm.toFixed(0)} mm güvenlik payı eklenecek`}
                    </div>
                    <div className={styles.fireWarnBody}>
                      Parça boyu ({ltMm.toFixed(0)} mm) yeterli.
                      {leadingFireMm > 0
                        ? ' Fire büküm sonrası kesilecek.'
                        : ' Ek parça ucunda kalır. Büküm parçanın SONUNDAN başlar.'}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Toplam bütçe + kalan gösterge */}
            {anyBudgetValid && (
              <div
                className={`${styles.totalBudgetInfo} ${
                  remainingOverflow || anyInfeasible || partLengthInsufficientForFire
                    ? styles.budgetOver
                    : styles.budgetOk
                }`}
              >
                <span>
                  Toplam mesafe: <b>{cumulativeRaw.toFixed(1)}mm</b>
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
                    {!remainingOverflow && anyInfeasible && ' ⚠ İMKÂNSIZ SEGMENT VAR'}
                  </span>
                )}
                {!ltValid && <span className={styles.budgetNote}>LT giriniz</span>}
              </div>
            )}
          </>
        )}
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
