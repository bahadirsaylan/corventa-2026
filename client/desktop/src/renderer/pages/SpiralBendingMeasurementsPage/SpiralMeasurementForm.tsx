import { useState } from 'react'
import { filterProfileFieldList, isMoldLockedField, MOLD_LOCKED_FIELD_STYLE, useMoldLock, useVisibleProfileFields } from '@/constants/profileFields'
import styles from './SpiralMeasurementForm.module.css'
import SpiralInfoModal from './SpiralInfoModal'
import { normalizeMeasureHInput } from '@/services/operatorPrefs'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import FormActionRow from '@/components/FormActionRow/FormActionRow'
import { SpiralDirection } from '@/store/bendingJobStore'
import { useProfileDimensionImage } from '@/hooks/useProfileDimensionImage'
import defaultMethodImage from '@/assets/images/blend4-4-buyuk.png'
import { useMethodTileImage } from '@/hooks/useMethodTileImage'

export type SpiralNumericKey = 'A' | 'B' | 'S' | 'R' | 'L' | 'H'
export type SpiralFieldKey = SpiralNumericKey | 'Y'

export interface SpiralMeasurementValues {
  A: string
  B: string
  S: string
  R: string
  L: string
  H: string
  Y: SpiralDirection | ''
}

interface FieldInfo {
  title: string
  description: string
}

const FIELD_INFO: Record<SpiralFieldKey, FieldInfo> = {
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
      'KIVRIM YARICAP ÖLÇÜSÜDÜR. SERPANTİN KIVRIMININ BAŞLANGIÇ YARICAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA BU DEĞERİ ESAS ALARAK GEOMETRİK KIVRIM YAPAR.',
  },
  L: {
    title: 'L :',
    description:
      'PARÇANIN TOPLAM UZUNLUĞUDUR (mm). MAKİNE BU DEĞERİ ESAS ALARAK ROTASYONU HESAPLAR. GÜVENLİK PAYI ÇIKARILDIKTAN SONRA KALAN MESAFE KADAR DÖNER.',
  },
  H: {
    title: 'H :',
    description:
      'KIVRIM HIZINI YÜZDE (%) OLARAK BELİRLER. %100 MAKİNENİN AYARLARDA TANIMLI EN YÜKSEK HIZIDIR.',
  },
  Y: {
    title: 'Y :',
    description:
      'MAKİNENİN SERPANTİNE YÖNÜNÜ SEÇMEMİZİ SAĞLAR. MAKİNE YAPILAN SEÇİM DOĞRULTUSUNDA GEOMETRİSEL KIVRIMINI GERÇEKLEŞTİRİR.',
  },
}

const LEFT_FIELDS:  SpiralNumericKey[] = ['A', 'B', 'S', 'L']
// Sağ sütun: yönteme özel alanlar (R, Y) → H (hız) en sonda — tüm formlarda aynı yerde
const RIGHT_FIELDS: SpiralFieldKey[]   = ['R', 'Y', 'H']

interface Props {
  values: SpiralMeasurementValues
  onChange: (values: SpiralMeasurementValues) => void
  onReset: () => void
  /** Formdaki ONAYLA — sayfanın StatusBar (touch) onayıyla aynı fonksiyon */
  onConfirm?: () => void
  confirmDisabled?: boolean
}

export default function SpiralMeasurementForm({ values, onChange, onReset, onConfirm, confirmDisabled }: Props) {
  const t = useT()
  const profileImage = useProfileDimensionImage()
  const visibleFields = useVisibleProfileFields()
  // Kalıp kodu seçiliyse A/B/S kalıptan gelir ve değiştirilemez (BULUT_API_V2.md §2.4)
  const moldLock = useMoldLock()
  const methodImage = useMethodTileImage('spiral', defaultMethodImage)
  const [openInfo, setOpenInfo]       = useState<SpiralFieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<SpiralNumericKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (!numpadField) return
    // H = kıvrım hızı YÜZDE: tam sayı %1..%100 (dışı sınıra çekilir)
    onChange({ ...values, [numpadField]: numpadField === 'H' ? normalizeMeasureHInput(value) : value })
  }

  function handleDirectionSelect(dir: SpiralDirection) {
    onChange({ ...values, Y: dir })
  }

  function renderNumericField(field: SpiralNumericKey) {
    const locked = isMoldLockedField(field, moldLock)
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>
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

  function renderDirectionField() {
    return (
      <div key="Y" className={styles.inputRow}>
        <span className={styles.fieldLabel}>Y:</span>
        <div className={styles.directionGroup}>
          <button
            className={`${styles.dirBtn} ${values.Y === 'left' ? styles.dirBtnActive : ''}`}
            onClick={() => handleDirectionSelect('left')}
            aria-label="Spiral direction left"
            aria-pressed={values.Y === 'left'}
          >
            <Icon name="chevronLeft" size="lg" />
          </button>
          <button
            className={`${styles.dirBtn} ${values.Y === 'right' ? styles.dirBtnActive : ''}`}
            onClick={() => handleDirectionSelect('right')}
            aria-label="Spiral direction right"
            aria-pressed={values.Y === 'right'}
          >
            <Icon name="chevronRight" size="lg" />
          </button>
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setOpenInfo('Y')}
          aria-label="Info for Y"
        >
          <Icon name="help" size={28} />
        </button>
      </div>
    )
  }

  function renderRightField(field: SpiralFieldKey) {
    if (field === 'Y') return renderDirectionField()
    return renderNumericField(field as SpiralNumericKey)
  }

  return (
    <div className={styles.wrapper}>

      {/* ── Left: two image tiles ───────────────── */}
      <div className={styles.images}>
        <div className={styles.imageTile}>
          <img src={profileImage} alt="Profile diagram" className={styles.tileImage} />
        </div>
        <div className={styles.imageTile}>
          <img src={methodImage} alt="Spiral method diagram" className={styles.tileImage} />
        </div>
      </div>

      {/* ── Right: 2-column input grid + reset ──── */}
      <div className={styles.inputSection}>
        <div className={styles.inputGrid}>
          <div className={styles.inputCol}>
            {filterProfileFieldList(LEFT_FIELDS, visibleFields).map(renderNumericField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderRightField)}
          </div>
        </div>

        <FormActionRow onReset={onReset} onConfirm={onConfirm} confirmDisabled={confirmDisabled} />
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <SpiralInfoModal
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
