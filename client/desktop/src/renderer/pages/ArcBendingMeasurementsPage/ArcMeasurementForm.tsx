import { useState } from 'react'
import styles from './ArcMeasurementForm.module.css'
import ArcInfoModal from './ArcInfoModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import profileImage from '@/assets/images/blend4-1-buyuk.png'
import methodImage from '@/assets/images/blend4-3-buyuk.png'

export type ArcFieldKey = 'A' | 'B' | 'S' | 'H' | 'R' | 'Alpha' | 'P' | 'L' | 'G' | 'LT'

export interface ArcMeasurementValues {
  A: string
  B: string
  S: string
  H: string
  R: string
  Alpha: string
  P: string
  L: string
  G: string
  LT: string
}

interface FieldInfo {
  title: string
  description: string
}

const FIELD_INFO: Record<ArcFieldKey, FieldInfo> = {
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
      'KIVIRIM YARICAP ÖLÇÜSÜDÜR. GERÇEKLEŞMESİNİ İSTEDİĞİNİZ YARİÇAP DEĞERİNİ GİRMELİSİNİZ. MAKİNA GEOMETRİK OLARAK GİRDİĞİNİZ YARICAP DEĞERİNİ DİKKATE ALARAK KIVIRIM YAPAR.',
  },
  Alpha: {
    title: 'α :',
    description:
      'KIVIRIM AÇI ÖLÇÜSÜDÜR (derece). KAÇ DERECELİK BİR KIVRIM İSTEDİĞİNİZİ GİRİN (0 < α < 180). YAY UZUNLUĞU L = 2π·R·(180-α)/360 FORMÜLÜYLE HESAPLANIR. HER RADİUSUN BİTİŞİNDE YENİDEN SORULACAKTIR.',
  },
  P: {
    title: 'P :',
    description:
      'KIVIRIM ÇAP ADEDİDİR. PARÇANIZDAKİ KAÇ ADET ÇAP KIVRIMI VARSA GİRMELİSİNİZ. AKSİ HALDE MAKİNA KIVIRIM BİTİNCE PROGRAMI SONLANDIRACAKTIR.',
  },
  L: {
    title: 'L :',
    description:
      'SONRAKİ RADİUSA OLAN DÜZLÜKTİR. HESAPLAMA RADİUSLARIN SONUNDAN YAPILIR. ART ARDA GELEN RADİUSLARDA "0" OLARAK YAZILMALIDIR. HER RADİUSUN BİTİŞİNDE YENİDEN SORULACAKTIR.',
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

const LEFT_FIELDS:   ArcFieldKey[] = ['A', 'B', 'S', 'H']
const RIGHT_FIELDS:  ArcFieldKey[] = ['R', 'Alpha', 'P', 'L']
const BOTTOM_FIELDS: ArcFieldKey[] = ['G', 'LT']

interface Props {
  values: ArcMeasurementValues
  onChange: (values: ArcMeasurementValues) => void
  onReset: () => void
}

export default function ArcMeasurementForm({ values, onChange, onReset }: Props) {
  const [openInfo, setOpenInfo]       = useState<ArcFieldKey | null>(null)
  const [numpadField, setNumpadField] = useState<ArcFieldKey | null>(null)

  function handleNumpadConfirm(value: string) {
    if (numpadField) onChange({ ...values, [numpadField]: value })
  }

  function renderField(field: ArcFieldKey) {
    const displayLabel = field === 'Alpha' ? 'α' : field
    return (
      <div key={field} className={styles.inputRow}>
        <span className={styles.fieldLabel}>{displayLabel}:</span>

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
          <img src={methodImage} alt="Arc method diagram" className={styles.tileImage} />
        </div>
      </div>

      {/* ── Right: 2-column input grid + bottom LT row + reset ──── */}
      <div className={styles.inputSection}>
        <div className={styles.inputGrid}>
          <div className={styles.inputCol}>
            {LEFT_FIELDS.map(renderField)}
          </div>
          <div className={styles.inputCol}>
            {RIGHT_FIELDS.map(renderField)}
          </div>
        </div>

        {/* Alt satır: G (adım) + LT (toplam parça boyu) yan yana */}
        <div className={styles.bottomRow}>
          {BOTTOM_FIELDS.map(renderField)}
        </div>

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
