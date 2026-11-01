import { useState } from 'react'
import { filterProfileFieldList, isMoldLockedField, MOLD_LOCKED_FIELD_STYLE, useMoldLock, useVisibleProfileFields } from '@/constants/profileFields'
import styles from './SivamaMeasurementForm.module.css'
import SivamaInfoModal from './SivamaInfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import { SpiralDirection } from '@/store/bendingJobStore'
import { useProfileDimensionImage } from '@/hooks/useProfileDimensionImage'
import defaultMethodImage from '@/assets/images/blend3-4-buyuk.png'
import { useMethodTileImage } from '@/hooks/useMethodTileImage'

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
  const t = useT()
  const profileImage = useProfileDimensionImage()
  const visibleFields = useVisibleProfileFields()
  // Kalıp kodu seçiliyse A/B/S kalıptan gelir ve değiştirilemez (BULUT_API_V2.md §2.4)
  const moldLock = useMoldLock()
  const methodImage = useMethodTileImage('sivama', defaultMethodImage)
  const [openInfo, setOpenInfo]       = useState<SivamaFieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<SivamaNumericKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (numpadField) onChange({ ...values, [numpadField]: value })
  }

  function handleDirectionSelect(dir: SpiralDirection) {
    onChange({ ...values, Y: dir })
  }

  function renderNumericField(field: SivamaNumericKey) {
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
          {values[field] || <span className={styles.placeholder}>0</span>}
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
            aria-label="Sivama direction left"
            aria-pressed={values.Y === 'left'}
          >
            <Icon name="chevronLeft" size="lg" />
          </button>
          <button
            className={`${styles.dirBtn} ${values.Y === 'right' ? styles.dirBtnActive : ''}`}
            onClick={() => handleDirectionSelect('right')}
            aria-label="Sivama direction right"
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
            {filterProfileFieldList(LEFT_FIELDS, visibleFields).map(renderNumericField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderRightField)}
          </div>
        </div>

        <button className={styles.resetBtn} onClick={onReset}>
          <IconLabel icon="reset">{t('SIFIRLA')}</IconLabel>
        </button>
      </div>

      {/* ── Info modal ──────────────────────────── */}
      {openInfo && (
        <SivamaInfoModal
          title={FIELD_INFO[openInfo].title}
          description={t(FIELD_INFO[openInfo].description)}
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
