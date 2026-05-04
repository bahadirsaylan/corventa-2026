import { useState } from 'react'
import styles from './MeasurementForm.module.css'
import InfoModal from './InfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import profileImage from '@/assets/images/blend4-1-buyuk.png'
import methodImage from '@/assets/images/blend4-2-buyuk.png'

export type FieldKey = 'A' | 'B' | 'S' | 'R' | 'H' | 'G'

export interface MeasurementValues {
  A: string
  B: string
  S: string
  R: string
  H: string
  G: string
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
      'PROFİLE AİT KALINLIK ÖLÇÜSÜDÜR. VALS TOPLARININ DOĞRULUĞUNU VE KIVIRIM KAPASİTESİNİ DEĞERLENDİREREK, YAPAY ZEKANIN DOĞRU ÇALIŞMASINI SAĞLAR.',
  },
  R: {
    title: 'R :',
    description:
      'KIVIRIM ÇAP ÖLÇÜSÜDÜR. GERÇEKLEŞMESİNİ İSTEDİĞİNİZ (Ø) ÇAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA GEOMETRİSEL OLARAK GİRDİĞİNİZ (Ø) ÇAP DEĞERİNİ DİKKATE ALARAK KIVIRIM YAPAR VE BİTİRİŞ İÇİN DE BU DEĞERİ DİKKATE ALIR.',
  },
  H: {
    title: 'H:',
    description:
      'MAKİNE HIZINI METRE/DAKİKA PARAMETRESİNDE BELİRLENEN SINIRLAR İÇERİSİNDE AYARLAMANIZA OLANAK SAĞLAMAKTADIR.',
  },
  G: {
    title: 'G:',
    description:
      'MAKİNE KIVIRIM GEOMETRİSİNE ULAŞANA KADAR GİRDİĞİNİZ ADIM DEĞERLERİNİ İFADE EDER VE MAKİNE KIVRIMINI BU DEĞERLER DOĞRULTUSUNDA YÖNETİR VE EN İYİ KIVRIMNI EN KISA SÜREDE YAPAR.',
  },
}

const LEFT_FIELDS:  FieldKey[] = ['A', 'B', 'S']
const RIGHT_FIELDS: FieldKey[] = ['R', 'H', 'G']

interface Props {
  values: MeasurementValues
  onChange: (values: MeasurementValues) => void
  onReset: () => void
}

export default function MeasurementForm({ values, onChange, onReset }: Props) {
  const [openInfo, setOpenInfo]     = useState<FieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<FieldKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (numpadField) onChange({ ...values, [numpadField]: value })
  }

  function renderField(field: FieldKey) {
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{field}:</span>

        {/* Tapping this div opens the numpad */}
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
            {LEFT_FIELDS.map(renderField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderField)}
          </div>
        </div>

        <button className={styles.resetBtn} onClick={onReset}>
          ↺ SIFIRLA
        </button>
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <InfoModal
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
