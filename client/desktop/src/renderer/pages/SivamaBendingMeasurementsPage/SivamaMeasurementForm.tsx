import { useState } from 'react'
import styles from './SivamaMeasurementForm.module.css'
import SivamaInfoModal from './SivamaInfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { SpiralDirection } from '@/store/bendingJobStore'
import profileImage from '@/assets/images/blend4-1-buyuk.png'
import methodImage from '@/assets/images/blend3-4-buyuk.png'

export type SivamaNumericKey = 'A' | 'B' | 'S' | 'R' | 'X' | 'L' | 'H'
export type SivamaFieldKey = SivamaNumericKey | 'Y'

export interface SivamaMeasurementValues {
  A: string
  B: string
  S: string
  R: string
  X: string
  L: string
  H: string
  Y: SpiralDirection | ''
}

interface FieldInfo {
  title: string
  description: string
}

const FIELD_INFO: Record<SivamaFieldKey, FieldInfo> = {
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
      'HEDEF SIVAMA YARIÇAP ÖLÇÜSÜDÜR (mm). MAKİNA PISTON HEDEF POZİSYONUNU VE İLK ROTASYON UZUNLUĞUNU BU DEĞERE GÖRE HESAPLAR (çap = R × 2).',
  },
  X: {
    title: 'X :',
    description:
      'KIVIRIM AÇISINI AYARLAMANIZI SAĞLAR. APARATIN BAŞINA KONUMLANDIRDIĞINIZ PROFİLİNİZİ TALEP ETTİĞİNİZ VALS TOPU ÇAPINA, SEÇTİĞİNİZ AÇI KADAR SIVAMA İŞLEMİ GERÇEKLEŞTİRİR.',
  },
  L: {
    title: 'L :',
    description:
      'PARÇANIN TOPLAM UZUNLUĞUDUR (mm). MAKİNE İLK SIVAMA ROTASYONUNDAN SONRA KALAN PARÇAYI (L − GÜVENLİK PAYI − İLK ROTASYON) KADAR DAHA DÖNDÜRÜR.',
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

const LEFT_FIELDS:  SivamaNumericKey[] = ['A', 'B', 'S', 'L']
const RIGHT_FIELDS: SivamaFieldKey[]   = ['R', 'X', 'H', 'Y']

interface Props {
  values: SivamaMeasurementValues
  onChange: (values: SivamaMeasurementValues) => void
  onReset: () => void
}

export default function SivamaMeasurementForm({ values, onChange, onReset }: Props) {
  const [openInfo, setOpenInfo]       = useState<SivamaFieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<SivamaNumericKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (numpadField) onChange({ ...values, [numpadField]: value })
  }

  function handleDirectionSelect(dir: SpiralDirection) {
    onChange({ ...values, Y: dir })
  }

  function renderNumericField(field: SivamaNumericKey) {
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
            aria-label="Sivama direction left"
            aria-pressed={values.Y === 'left'}
          >
            《
          </button>
          <button
            className={`${styles.dirBtn} ${values.Y === 'right' ? styles.dirBtnActive : ''}`}
            onClick={() => handleDirectionSelect('right')}
            aria-label="Sivama direction right"
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

  function renderRightField(field: SivamaFieldKey) {
    if (field === 'Y') return renderDirectionField()
    return renderNumericField(field as SivamaNumericKey)
  }

  return (
    <div className={styles.wrapper}>

      {/* ── Left: two image tiles ───────────────── */}
      <div className={styles.images}>
        <div className={styles.imageTile}>
          <img src={profileImage} alt="Profile diagram" className={styles.tileImage} />
        </div>
        <div className={styles.imageTile}>
          <img src={methodImage} alt="Sivama method diagram" className={styles.tileImage} />
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
        <SivamaInfoModal
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
