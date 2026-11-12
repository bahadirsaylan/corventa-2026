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

export type FieldKey = 'A' | 'B' | 'S' | 'R' | 'H' | 'G' | 'L'

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
}

export default function MeasurementForm({ values, onChange, onReset, onConfirm, confirmDisabled, capacityIssues }: Props) {
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
          </div>
        </div>

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
