import { useState } from 'react'
import FormActionRow from '@/components/FormActionRow/FormActionRow'
import { filterProfileFieldList, isMoldLockedField, MOLD_LOCKED_FIELD_STYLE, useMoldLock, useVisibleProfileFields } from '@/constants/profileFields'
import styles from './MeasurementForm.module.css'
import InfoModal from './InfoModal'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import { normalizeMeasureHInput } from '@/services/operatorPrefs'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useProfileDimensionImage } from '@/hooks/useProfileDimensionImage'
import defaultMethodImage from '@/assets/images/blend4-2-buyuk.png'
import { useMethodTileImage } from '@/hooks/useMethodTileImage'
import type { CapacityIssue } from '@/constants/capacityCatalog'
import StageChoiceField from '@/components/StageChoice/StageChoiceField'

export type FieldKey = 'A' | 'B' | 'S' | 'R' | 'H' | 'G' | 'L'

/** Çap girilince hesaplanan hedef konum + adım sayısı (sadece gösterim, 2026-11-16) */
export interface PlanPreview {
  state: 'idle' | 'loading' | 'ok' | 'error'
  targetMm?: number
  totalSteps?: number | null
}

export interface MeasurementValues {
  A: string
  B: string
  S: string
  R: string
  H: string
  G: string
  L: string
}

interface FieldInfo {
  title: string
  description: string
}

const FIELD_INFO: Record<FieldKey, FieldInfo> = {
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
      'KIVRIM ÇAP ÖLÇÜSÜDÜR. GERÇEKLEŞMESİNİ İSTEDİĞİNİZ (Ø) ÇAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA GEOMETRİSEL OLARAK GİRDİĞİNİZ (Ø) ÇAP DEĞERİNİ DİKKATE ALARAK KIVRIM YAPAR VE BİTİRİŞ İÇİN DE BU DEĞERİ DİKKATE ALIR.',
  },
  H: {
    title: 'H:',
    description:
      'KIVRIM HIZI (%). DEĞER AYARLARDAKİ KIVRIM HIZI AYARINDAN OTOMATİK GELİR.',
  },
  G: {
    title: 'G:',
    description:
      'MAKİNE KIVRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMNI EN KISA SÜREDE YAPAR.',
  },
  L: {
    title: 'L:',
    description: 'PROFİLE AİT UZUNLUK ÖLÇÜSÜDÜR.',
  },
}

// Alan düzeni tüm ölçü formlarında aynı: sol A, B, S + uzunluk (L); sağ yönteme özel (R) → H (hız) → G (adım)
const LEFT_FIELDS:  FieldKey[] = ['A', 'B', 'S', 'L']
const RIGHT_FIELDS: FieldKey[] = ['R', 'H', 'G']

interface Props {
  values: MeasurementValues
  onChange: (values: MeasurementValues) => void
  onReset: () => void
  /** Formdaki ONAYLA — sayfanın StatusBar (touch) onayıyla aynı fonksiyon */
  onConfirm?: () => void
  confirmDisabled?: boolean
  /** Canlı kapasite kontrolü sonucu (A/B/R/G girilince) — sadece bilgi, ONAYLA'yı engellemez */
  capacityIssues?: CapacityIssue[]
  /** Hedef konum + adım sayısı önizlemesi — verilirse giriş ızgarasının altında tam genişlik şerit olarak gösterilir */
  plan?: PlanPreview
  /** Elle hedefin (kayıtlı büküm) stage'i — STAGE alanı bunu gösterir, değiştirilemez */
  lockedStage?: number | null
}

export default function MeasurementForm({ values, onChange, onReset, onConfirm, confirmDisabled, capacityIssues, plan, lockedStage }: Props) {
  const t = useT()
  const profileImage = useProfileDimensionImage()
  const visibleFields = useVisibleProfileFields()
  // Kalıp kodu seçiliyse A/B/S kalıptan gelir ve değiştirilemez (BULUT_API_V2.md §2.4)
  const moldLock = useMoldLock()
  const methodImage = useMethodTileImage('ring', defaultMethodImage)
  const [openInfo, setOpenInfo]     = useState<FieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<FieldKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (!numpadField) return
    // H = kıvrım hızı YÜZDE: tam sayı %1..%100 (dışı sınıra çekilir)
    onChange({ ...values, [numpadField]: numpadField === 'H' ? normalizeMeasureHInput(value) : value })
  }

  function renderField(field: FieldKey) {
    const locked = isMoldLockedField(field, moldLock)
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>

        {/* Tapping this div opens the numpad */}
        <div
          className={`${styles.fieldInput} ${values[field] ? styles.fieldInputFilled : ''}`}
          style={locked ? MOLD_LOCKED_FIELD_STYLE : undefined}
          aria-disabled={locked || undefined}
          onClick={() => { if (!locked) setNumpadField(field) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (!locked && e.key === 'Enter') setNumpadField(field) }}
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

  return (
    <div className={styles.wrapper}>

      {/* ── Left: two image tiles ───────────────── */}
      <div className={styles.images}>
        <div className={styles.imageTile}>
          <img src={profileImage} alt="Profile diagram" className={styles.tileImage} />
        </div>
        <div className={styles.imageTile}>
          <img src={methodImage} alt="Method diagram" className={styles.tileImage} />
        </div>
      </div>

      {/* ── Right: 2-column input grid + reset ──── */}
      <div className={styles.inputSection}>
        <div className={styles.inputGrid}>
          <div className={styles.inputCol}>
            {filterProfileFieldList(LEFT_FIELDS, visibleFields).map(renderField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderField)}
            {/* 2026-11-26 — STAGE: varsayılan önerilen; birden çok uygunsa operatör seçer */}
            <StageChoiceField profileA={parseFloat(values.A) || 0} styles={styles} lockedStage={lockedStage} />
          </div>
        </div>

        {/* 2026-11-17: HEDEF KONUM + ADIM SAYISI artık sağ sütunda değil — ızgara ile eylem satırı arasında
            tek, tam genişlik bilgi şeridi (sütun yüksekliklerini bozmaz, SIFIRLA / ONAYLA'yı itmez/sıkıştırmaz) */}
        {plan && <PlanStrip plan={plan} />}

        {capacityIssues && capacityIssues.length > 0 && (
          <ul className={styles.capacityNotice}>
            {capacityIssues.map((issue, i) => (
              <li key={i} data-severity={issue.severity}>{issue.message}</li>
            ))}
          </ul>
        )}

        <FormActionRow onReset={onReset} onConfirm={onConfirm} confirmDisabled={confirmDisabled} />
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <InfoModal
          title={FIELD_INFO[openInfo].title}
          description={t(FIELD_INFO[openInfo].description)}
          onClose={() => setOpenInfo(null)}
        />
      )}

      {/* ── Numpad modal ────────────────────────── */}
      {numpadField && (
        <NumpadModal
          fieldLabel={numpadField === 'H' ? 'H (%)' : numpadField}
          initialValue={values[numpadField]}
          digitsOnly={numpadField === 'H'}
          maxLength={numpadField === 'H' ? 3 : undefined}
          onConfirm={handleNumpadConfirm}
          onClose={() => setNumpadField(null)}
        />
      )}
    </div>
  )
}

/**
 * Giriş ızgarasının altındaki bilgi şeridi (2026-11-17): HEDEF KONUM (aktif top, mm) + ADIM SAYISI (G ile).
 * A ve çap (R) girilmeden "—" + kısa ipucu; hesap / adım sayısı alınamazsa ipucu. Sadece gösterim.
 */
function PlanStrip({ plan }: { plan: PlanPreview }) {
  const t = useT()
  const loading = plan.state === 'loading'
  const ok = plan.state === 'ok'
  const target = ok && plan.targetMm != null ? plan.targetMm.toFixed(1) : null
  const steps = ok && plan.totalSteps != null ? String(plan.totalSteps) : null
  const hint =
    plan.state === 'idle'
      ? t('A VE R GİRİLİNCE HESAPLANIR')
      : plan.state === 'error'
        ? t('HESAPLANAMADI — ÖLÇÜLERİ KONTROL EDİN')
        : ok && steps == null
          ? t('ADIM SAYISI HESAPLANAMADI')
          : null
  return (
    <div className={styles.planStrip} data-state={plan.state} aria-live="polite">
      <div className={styles.planCell}>
        <span className={styles.planLabel}>{t('HEDEF KONUM')}</span>
        <span className={styles.planValue}>
          {loading ? '…' : target != null ? <>{target}<small> mm</small></> : '—'}
        </span>
      </div>
      <div className={styles.planCell}>
        <span className={styles.planLabel}>{t('ADIM SAYISI')}</span>
        <span className={styles.planValue}>{loading ? '…' : steps ?? '—'}</span>
      </div>
      {hint && <span className={styles.planHint}>{hint}</span>}
    </div>
  )
}
