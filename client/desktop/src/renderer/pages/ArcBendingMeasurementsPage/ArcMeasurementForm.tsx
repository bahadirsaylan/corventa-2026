import { useEffect, useMemo, useState } from 'react'
import { filterProfileFieldList, isMoldLockedField, MOLD_LOCKED_FIELD_STYLE, useMoldLock, useVisibleProfileFields } from '@/constants/profileFields'
import styles from './ArcMeasurementForm.module.css'
import ArcInfoModal from './ArcInfoModal'
import { normalizeMeasureHInput } from '@/services/operatorPrefs'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useProfileDimensionImage } from '@/hooks/useProfileDimensionImage'
import defaultMethodImage from '@/assets/images/blend4-3-buyuk.png'
import { useMethodTileImage } from '@/hooks/useMethodTileImage'
import { useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import FormActionRow from '@/components/FormActionRow/FormActionRow'
import { planArc, type PlanResult } from '@shared/arcPlanner'
import type { StageInfo } from '@shared/types'

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
      'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.',
  },
  R: {
    title: 'R :',
    description:
      'KIVRIMIN YARIÇAPIDIR (mm). HER KIVRIMIN KENDİ YARIÇAPI OLABİLİR.',
  },
  Alpha: {
    title: 'α :',
    description:
      'KIVRIMIN AÇISIDIR (derece, 0 ile 180 arası). AÇI YERİNE YAY UZUNLUĞU DA GİREBİLİRSİNİZ; DİĞERİ OTOMATİK HESAPLANIR.',
  },
  ArcLen: {
    title: 'Yay :',
    description:
      'KIVRIMIN YAY UZUNLUĞUDUR (mm). AÇI YERİNE YAY UZUNLUĞU GİRMEK İÇİN KULLANIN; AÇI OTOMATİK HESAPLANIR. YAY, YARIM ÇEMBERDEN (π·R) KISA OLMALIDIR.',
  },
  P: {
    title: 'P :',
    description:
      'PARÇADAKİ KIVRIM SAYISIDIR. GİRDİĞİNİZ SAYI KADAR KIVRIM KARTI AÇILIR (1. KIVRIM, 2. KIVRIM ...); HER BİRİNİ AYRI DOLDURURSUNUZ.',
  },
  L: {
    title: 'L :',
    description:
      'BU KIVRIMDAN ÖNCEKİ DÜZ KISIMDIR (mm). 1. KIVRIMDA PARÇA BAŞINDAN KIVRIMA KADAR OLAN DÜZLÜK; DİĞERLERİNDE BİR ÖNCEKİ KIVRIMIN BİTİŞİNDEN BU KIVRIMA KADAR. ARA DÜZLÜK YOKSA 0 YAZIN. SON KIVRIMDAN SONRAKİ DÜZ KISIM PARÇA BOYUNDAN OTOMATİK HESAPLANIR.',
  },
  H: {
    title: 'H :',
    description:
      'KIVRIM HIZINI YÜZDE (%) OLARAK BELİRLER. %100 MAKİNENİN AYARLARDA TANIMLI EN YÜKSEK HIZIDIR.',
  },
  G: {
    title: 'G :',
    description:
      'MAKİNE KIVRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMI EN KISA SÜREDE YAPAR.',
  },
  LT: {
    title: 'LT :',
    description:
      'PROFİLİN TOPLAM UZUNLUĞUDUR (mm). TÜM KIVRIM VE DÜZLÜKLERİN TOPLAMI, GÜVENLİK PAYI KADAR EKSİK OLMALIDIR. MAKİNE KIVRIMI BU UZUNLUĞA GÖRE PLANLAR.',
  },
}

// Alan düzeni tüm ölçü formlarında aynı: sol A, B, S + uzunluk (LT);
// sağ yönteme özel alan (P) → H (hız) → G (adım) en sonda.
const MAIN_LEFT: ArcMainFieldKey[] = ['A', 'B', 'S', 'LT']
const MAIN_RIGHT: ArcMainFieldKey[] = ['P', 'H', 'G']

export type ArcFormStage = 'main' | 'segments' | 'summary'

interface Props {
  values: ArcMeasurementValues
  onChange: (values: ArcMeasurementValues) => void
  onReset: () => void
  /** Ana aşamadaki ONAYLA — sayfanın StatusBar (touch) onayıyla aynı fonksiyon */
  onConfirm?: () => void
  confirmDisabled?: boolean
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
// sabit tutuldu; sadece bütçe göstergesindeki "seg1 min=safety" ve "son yay -safety"
// notları için kullanılır. Backend planner XA1/T gerçek DB değerleriyle son kararı verir.
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

// 2026-09-08: Per-segment XA1/T feasibility ARTIK YOK. Bunun yerine tüm plan
// (bükülebilirlik, ölçülebilirlik, parça uzatma, sıralama) ONAYLA butonuna basınca
// backend'in ArcExtensionPlanner'ına gönderiliyor (POST /api/bending/arc/validate-plan).
// UI'da sadece hafif validasyonlar kalır:
//   - R/α/L numeric ve geçerli
//   - yay ≥ 250mm (SLPIS min ölçüm mesafesi — erken uyarı, backend zaten reject eder)
//   - Toplam bütçe LT'yi aşmasın
export const MIN_ARC_LENGTH_MM = 250
// 2026-09-10 v2: yay < 250 kesin reddet. Arc'ı 1 ondalığa yuvarla — 250.0 kabul, 249.9 reddet.
// α 4-decimal precision yay=250 için arc'ı ~250.0001 üretir → round(1dec) = 250.0 → geçer.
// Kullanıcı 249.9 girse → round = 249.9 → reddedilir.
export function isArcBelowMin(arc: number): boolean {
  return Math.round(arc * 10) / 10 < MIN_ARC_LENGTH_MM
}

// Canlı plan uyarısı (ONAYLA öncesi): ONAYLA'daki backend validate-plan ile aynı girdiler.
//   Bükülebilirlik |XA1| = backend varsayılanı (sayfa xa1AbsMm: 0 gönderiyor → 465).
//   Ölçüm mesafesi T = profil A'ya önerilen stage'in |XA1|'i (backend StageSelector ile aynı kural), yoksa |XA1|.
//   ONAYLA davranışı değişmez — burası sadece operatöre erken bilgi verir.
const PLANNER_DEFAULT_XA1_ABS_MM = 465

function measurementDistanceFor(stages: StageInfo[] | null, profileA: number): number {
  if (!stages || !(profileA > 0)) return PLANNER_DEFAULT_XA1_ABS_MM
  const stage = stages
    .filter((s) => s.isActive !== false && s.maxProfileAMm != null && profileA <= s.maxProfileAMm)
    .sort((a, b) => (a.maxProfileAMm as number) - (b.maxProfileAMm as number))[0]
  const xa1 = stage?.xA1Mm
  return xa1 != null && Math.abs(xa1) > 0 ? Math.abs(xa1) : PLANNER_DEFAULT_XA1_ABS_MM
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
  onConfirm,
  confirmDisabled,
  inputMode,
  onInputModeChange,
  stage,
}: Props) {
  const t = useT()
  const profileImage = useProfileDimensionImage()
  const visibleFields = useVisibleProfileFields()
  // Kalıp kodu seçiliyse A/B/S kalıptan gelir ve değiştirilemez (BULUT_API_V2.md §2.4)
  const moldLock = useMoldLock()
  const methodImage = useMethodTileImage('arc', defaultMethodImage)
  const [openInfo, setOpenInfo] = useState<ArcMainFieldKey | ArcSegmentFieldKey | null>(null)
  const [numpadTarget, setNumpadTarget] = useState<NumpadTarget | null>(null)
  // Stage listesi — canlı plan uyarısındaki ölçüm mesafesi için (okunamazsa varsayılan |XA1|)
  const [stages, setStages] = useState<StageInfo[] | null>(null)

  useEffect(() => {
    let alive = true
    window.corventa.settings
      .getStages()
      .then((list) => { if (alive && Array.isArray(list)) setStages(list) })
      .catch(() => { /* varsayılan |XA1| kullanılır */ })
    return () => { alive = false }
  }, [])

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
          //   2026-09-10: α precision 2 → 4 ondalık. Aksi halde yay=500 → α=151.35 saklandığında
          //   ters formülden arc yeniden hesaplanınca 500.031 çıkıyor, 3 segmentte cumulative ~0.1mm
          //   hata → trailing "199.9" görünüyor. 4 ondalık ile arc precision <0.001mm.
          const aStr = computeAngleFromArc(r, l).toFixed(4)
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
      // H = kıvrım hızı YÜZDE: tam sayı %1..%100 (dışı sınıra çekilir)
      onChange({ ...values, [numpadTarget.field]: numpadTarget.field === 'H' ? normalizeMeasureHInput(value) : value })
    } else {
      const nextSegments = values.segments.map((seg, i) =>
        i === numpadTarget.index ? { ...seg, [numpadTarget.field]: value } : seg,
      )
      onChange({ ...values, segments: nextSegments })
    }
  }

  function renderMainField(field: ArcMainFieldKey) {
    const locked = isMoldLockedField(field, moldLock)
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>
        <div
          className={`${styles.fieldInput} ${values[field] ? styles.fieldInputFilled : ''}`}
          style={locked ? MOLD_LOCKED_FIELD_STYLE : undefined}
          aria-disabled={locked || undefined}
          onClick={() => { if (!locked) setNumpadTarget({ kind: 'main', field }) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (!locked && e.key === 'Enter') setNumpadTarget({ kind: 'main', field }) }}
          aria-label={`Enter value for ${field}`}
        >
          {field === 'H'
            ? (values.H ? `%${values.H}` : <span className={styles.placeholder}>%</span>)
            : (values[field] || <span className={styles.placeholder}>0</span>)}
          {locked && <span style={{ marginLeft: 6, display: 'inline-flex' }}><Icon name="lock" size={16} /></span>}
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setOpenInfo(field)}
          aria-label={`Info for ${field}`}
        >
          <Icon name="help" size={28} />
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
    //   2026-09-10: α saklamada 4 ondalık (precision için) ama gösterimde 2 ondalık yeter.
    //   Diğer alanlar (R, ArcLen, L) ham gösterilir — kullanıcı numpad'den ne girdiyse.
    const displayVal = field === 'Alpha' && val !== ''
      ? (() => {
          const n = parseFloat(val)
          return Number.isFinite(n) ? n.toFixed(2) : val
        })()
      : val
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
          {displayVal || <span className={styles.placeholder}>0</span>}
        </div>
        <button
          className={styles.segmentInfoBtn}
          onClick={() => setOpenInfo(field)}
          aria-label={`Info for ${field}`}
        >
          <Icon name="help" size={22} />
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

  //   2026-09-08: Per-segment feasibility (T + XA1) UI'dan kaldırıldı.
  //   Sadece min-yay (< 250) erken uyarı olarak per-segment kartta gösterilir;
  //   asıl bükülebilirlik/ölçülebilirlik/uzatma kararı ONAYLA sonrası backend'de
  //   (ArcExtensionPlanner → /api/bending/arc/validate-plan).
  const anyMinArcViolation = budgets.some((b) => b.valid && isArcBelowMin(b.arc))

  // Canlı plan: tüm kıvrımlar geçerli, LT girilmiş ve aşım/min-yay yoksa ONAYLA'daki planlayıcıyı çalıştır.
  const allSegmentsValid = values.segments.length > 0 && budgets.every((b) => b.valid)
  const livePlan: PlanResult | null = useMemo(() => {
    if (!allSegmentsValid || !ltValid || remainingOverflow || anyMinArcViolation) return null
    return planArc({
      segments: values.segments.map((seg, i) => ({
        segmentOrder: i + 1,
        radiusMm: parseFloat(seg.R),
        angleDeg: parseFloat(seg.Alpha),
        straightAfterMm: parseFloat(seg.L),
      })),
      partLengthMm: ltMm,
      xa1AbsMm: PLANNER_DEFAULT_XA1_ABS_MM,
      measurementDistanceMm: measurementDistanceFor(stages, parseFloat(values.A) || 0),
    })
  }, [allSegmentsValid, ltValid, remainingOverflow, anyMinArcViolation, values.segments, values.A, ltMm, stages])
  const livePlanBlocked = livePlan != null && !livePlan.canBend
  const livePlanExtension = livePlan != null && livePlan.canBend && livePlan.extensionMm > 0
  const livePlanReversed = livePlan != null && livePlan.canBend && livePlan.extensionMm === 0 && livePlan.isReversed

  const currentNumpadValue = (() => {
    if (!numpadTarget) return ''
    if (numpadTarget.kind === 'main') return values[numpadTarget.field] ?? ''
    return values.segments[numpadTarget.index]?.[numpadTarget.field] ?? ''
  })()

  const isHTarget = numpadTarget?.kind === 'main' && numpadTarget.field === 'H'
  const numpadLabel = (() => {
    if (!numpadTarget) return ''
    if (numpadTarget.kind === 'main') return numpadTarget.field
    const disp =
      numpadTarget.field === 'Alpha'
        ? t('AÇI (α)')
        : numpadTarget.field === 'ArcLen'
          ? t('YAY UZUNLUĞU')
          : numpadTarget.field === 'R'
            ? t('YARIÇAP (R)')
            : t('ÖNCEKİ DÜZ KISIM (L)')
    return `${t('{n}. KIVRIM', { n: numpadTarget.index + 1 })} · ${disp}`
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
              <div className={styles.inputCol}>{filterProfileFieldList(MAIN_LEFT, visibleFields).map(renderMainField)}</div>
              <div className={styles.inputCol}>{MAIN_RIGHT.map(renderMainField)}</div>
            </div>

            <FormActionRow onReset={onReset} onConfirm={onConfirm} confirmDisabled={confirmDisabled} />
          </>
        ) : (
          <>
            {/* AŞAMA 2: Kompakt özet bant */}
            <div className={styles.summaryBar}>
              <span><b>A</b>={values.A || '—'}</span>
              {visibleFields.includes('B') && <span><b>B</b>={values.B || '—'}</span>}
              {visibleFields.includes('S') && <span><b>S</b>={values.S || '—'}</span>}
              <span><b>H</b>={values.H ? `%${values.H}` : '—'}</span>
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
                {t('R + α (Açı)')}
              </button>
              <button
                type="button"
                className={inputMode === 'arcLen' ? styles.modeActive : styles.modeInactive}
                onClick={() => onInputModeChange('arcLen')}
              >
                {t('R + Yay (mm)')}
              </button>
            </div>

            {/* Segment kartları — P adet dinamik. */}
            <div className={styles.segmentsList}>
              {values.segments.length === 0 && (
                <div className={styles.segmentsHint}>
                  <IconLabel icon="warning">{t('Önce P (kıvrım sayısı) giriniz — kartlar otomatik açılır.')}</IconLabel>
                </div>
              )}
              {values.segments.map((_, i) => {
                const b = budgets[i]
                const minArcViolation = b?.valid && isArcBelowMin(b.arc)
                return (
                  <div
                    key={i}
                    className={`${styles.segmentCard} ${
                      minArcViolation ? styles.segmentCardInfeasible : ''
                    }`}
                  >
                    <div className={styles.segmentHeader}>{t('{n}. KIVRIM', { n: i + 1 })}</div>
                    <div className={styles.segmentFields}>
                      {renderSegmentField(i, 'L', 'L')}
                      {inputMode === 'angle'
                        ? renderSegmentField(i, 'Alpha', 'α')
                        : renderSegmentField(i, 'ArcLen', t('Yay'))}
                      {renderSegmentField(i, 'R', 'R')}
                    </div>
                    {b?.valid && (
                      <div className={styles.segmentBudgetInfo}>
                        {t('Yay')}: <b>{b.arc.toFixed(1)}mm</b>
                        {' · '}{t('Bütçe')}: <b>{b.total.toFixed(1)}mm</b>
                        {i + 1 === totalP && b.effArc !== b.arc && (
                          <span className={styles.budgetNote}>
                            {' '}{t('(son seg yay −{n}mm safety)', { n: DEFAULT_SAFETY_MM })}
                          </span>
                        )}
                        {i === 0 && b.effStraight !== parseFloat(values.segments[0].L || '0') && (
                          <span className={styles.budgetNote}>
                            {' '}{t('(seg1 düzlük min={n}mm safety)', { n: DEFAULT_SAFETY_MM })}
                          </span>
                        )}
                      </div>
                    )}
                    {minArcViolation && (
                      <div className={styles.segmentInfeasibleWarn}>
                        <div className={styles.warnHead}>
                          <IconLabel icon="warning">
                            {t('Yay uzunluğu minimum sınırın altında ({arc}mm < {min}mm)', { arc: b.arc.toFixed(1), min: MIN_ARC_LENGTH_MM })}
                          </IconLabel>
                        </div>
                        <div className={styles.warnDetail}>{t('Yay uzunluğunu veya Açı değerini arttırın')}</div>
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
                  remainingOverflow || anyMinArcViolation || livePlanBlocked
                    ? styles.budgetOver
                    : livePlanExtension ? styles.budgetWarn : styles.budgetOk
                }`}
              >
                <span>
                  {t('Toplam mesafe')}: <b>{cumulativeRaw.toFixed(1)}mm</b>
                  {ltValid && (
                    <>
                      {' '}/ LT <b>{ltMm.toFixed(1)}mm</b>
                    </>
                  )}
                </span>
                {ltValid && (
                  <span>
                    {t('Kalan')}: <b>{remaining.toFixed(1)}mm</b>
                    {remainingOverflow && (
                      <>
                        {' '}
                        <IconLabel icon="warning">{t('AŞIM')}</IconLabel>
                      </>
                    )}
                    {!remainingOverflow && anyMinArcViolation && (
                      <>
                        {' '}
                        <IconLabel icon="warning">{t('YAY MİNİMUM ALTINDA')}</IconLabel>
                      </>
                    )}
                  </span>
                )}
                {!ltValid && <span className={styles.budgetNote}>{t('LT giriniz')}</span>}
              </div>
            )}

            {/* Canlı plan uyarısı — ONAYLA'da çıkacak uzatma / ters sıra / ret bilgisini önceden gösterir */}
            {livePlanExtension && livePlan && (
              <div className={styles.livePlanWarn}>
                <IconLabel icon="warning">
                  {livePlan.side === 'Leading'
                    ? t("İlk kıvrımdan önce yeterli düz parça yok — ONAYLA'da parçayı {n} mm uzatmanız istenecek", { n: livePlan.extensionMm.toFixed(0) })
                    : t("Son kıvrımdan sonra yeterli düz parça yok — ONAYLA'da parçayı {n} mm uzatmanız istenecek", { n: livePlan.extensionMm.toFixed(0) })}
                </IconLabel>
              </div>
            )}
            {livePlanReversed && (
              <div className={styles.livePlanWarn}>
                <IconLabel icon="warning">{t("ONAYLA'da kıvrımların ters sırada bükülmesi istenecek")}</IconLabel>
              </div>
            )}
            {livePlanBlocked && livePlan && (
              <div className={styles.livePlanError}>
                <IconLabel icon="warning">{t("Bu kıvrım düzeni ONAYLA'da kabul edilmeyecek")}</IconLabel>
                {livePlan.errorMessage && <div className={styles.warnDetail}>{livePlan.errorMessage}</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <ArcInfoModal
          title={t(FIELD_INFO[openInfo].title)}
          description={t(FIELD_INFO[openInfo].description)}
          onClose={() => setOpenInfo(null)}
        />
      )}

      {/* ── Numpad modal ────────────────────────── */}
      {numpadTarget && (
        <NumpadModal
          fieldLabel={isHTarget ? 'H (%)' : numpadLabel}
          initialValue={currentNumpadValue}
          digitsOnly={isHTarget}
          maxLength={isHTarget ? 3 : undefined}
          onConfirm={handleNumpadConfirm}
          onClose={() => setNumpadTarget(null)}
        />
      )}
    </div>
  )
}
