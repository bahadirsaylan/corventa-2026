import { useState } from 'react'
import styles from './SpiralMeasurementForm.module.css'
import SpiralInfoModal from './SpiralInfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { SpiralDirection } from '@/store/bendingJobStore'
import profileImage from '@/assets/images/blend4-1-buyuk.png'
import methodImage from '@/assets/images/blend4-4-buyuk.png'

export type SpiralNumericKey = 'A' | 'B' | 'S' | 'R' | 'H'
export type SpiralFieldKey = SpiralNumericKey | 'Y'

export interface SpiralMeasurementValues {
  A: string
  B: string
  S: string
  R: string
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
      'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVIRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.',
  },
  R: {
    title: 'R :',
    description:
      'KIVIRIM YARICAP ÖLÇÜSÜDÜR. SERPANTİN KIVRIMININ BAŞLANGIÇ YARICAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA BU DEĞERİ ESAS ALARAK GEOMETRİK KIVIRIM YAPAR.',
  },
  H: {
    title: 'H :',
    description:
      'MAKİNE HIZINI METRE/DAKİKA PARAMETRESİNDE BELİRLENEN SINIRLAR İÇERİSİNDE AYARLAMANIZA OLANAK SAĞLAMAKTADIR.',
  },
  Y: {
    title: 'Y :',
    description:
      'MAKİNENİN SERPANTİNE YÖNÜNÜ SEÇMEMİZİ SAĞLAR. MAKİNE YAPILAN SEÇİM DOĞRULTUSUNDA GEOMETRİSEL KIVRIMINI GERÇEKLEŞTİRİR.',
  },
}

const LEFT_FIELDS:  SpiralNumericKey[] = ['A', 'B', 'S']
const RIGHT_FIELDS: SpiralFieldKey[]   = ['R', 'H', 'Y']

interface Props {
  values: SpiralMeasurementValues
  onChange: (values: SpiralMeasurementValues) => void
  onReset: () => void
}

export default function SpiralMeasurementForm({ values, onChange, onReset }: Props) {
  const [openInfo, setOpenInfo]       = useState<SpiralFieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<SpiralNumericKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (numpadField) onChange({ ...values, [numpadField]: value })
  }

  function handleDirectionSelect(dir: SpiralDirection) {
    onChange({ ...values, Y: dir })
  }

  function renderNumericField(field: SpiralNumericKey) {
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>
        <div
          className={`${styles.fieldInput} ${values[field] ? styles.fieldInputFilled : ''}`}
          onClick={() => setNumpadField(field)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setNumpadField(field)}
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
            《
          </button>
          <button
            className={`${styles.dirBtn} ${values.Y === 'right' ? styles.dirBtnActive : ''}`}
            onClick={() => handleDirectionSelect('right')}
            aria-label="Spiral direction right"
            aria-pressed={values.Y === 'right'}
          >
            》
          </button>
        </div>
        <button
          className={styles.infoBtn}
          onClick={() => setOpenInfo('Y')}
          aria-label="Info for Y"
        >
          ?
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
            {LEFT_FIELDS.map(renderNumericField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderRightField)}
          </div>
        </div>

        <button className={styles.resetBtn} onClick={onReset}>
          ↺ SIFIRLA
        </button>
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <SpiralInfoModal
          title={FIELD_INFO[openInfo].title}
          description={FIELD_INFO[openInfo].description}
          onClose={() => setOpenInfo(null)}
        />
      )}

      {/* ── Numpad modal ────────────────────────── */}
      {numpadField && (
        <NumpadModal
          fieldLabel={numpadField}
          initialValue={values[numpadField]}
          onConfirm={handleNumpadConfirm}
          onClose={() => setNumpadField(null)}
        />
      )}
    </div>
  )
}
