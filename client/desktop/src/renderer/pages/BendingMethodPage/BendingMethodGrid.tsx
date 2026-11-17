import { BendingMethodId } from '@/store/bendingJobStore'
import styles from './BendingMethodGrid.module.css'
import { FEATURES } from '@shared/edition'
import { useT } from '@/i18n'
import ring from '@/assets/images/blend3-1-buyuk.png'
import arc from '@/assets/images/blend3-2-buyuk.png'
import spiral from '@/assets/images/blend3-3-buyuk.png'
import sivama from '@/assets/images/blend3-4-buyuk.png'
// Seçili hali: görseldeki pembe kare tema pastel yeşiline (#b8e6c5) çevrilmiş kopyalar
import ringSelected from '@/assets/images/blend3-1-buyuk-secili.png'
import arcSelected from '@/assets/images/blend3-2-buyuk-secili.png'
import spiralSelected from '@/assets/images/blend3-3-buyuk-secili.png'
import sivamaSelected from '@/assets/images/blend3-4-buyuk-secili.png'

interface Method {
  id: BendingMethodId
  image: string
  imageSelected: string
  label?: string
}

// STANDART SÜRÜM (2026-11-17): sadece ÇEMBER açık — diğerleri soluk + "YAKINDA" (FEATURES ile tek tek açılır)
const METHOD_ENABLED: Record<BendingMethodId, boolean> = {
  ring: true,
  arc: FEATURES.arcBending,
  spiral: FEATURES.spiralBending,
  sivama: FEATURES.sivamaBending,
}

/** Bu sürümde seçilebilen metot mu (sayfa önceki seçimi temizlemek için de kullanır) */
export function isMethodEnabled(id: BendingMethodId | null): boolean {
  return id != null && METHOD_ENABLED[id]
}

const methods: Method[] = [
  { id: 'ring',   image: ring,   imageSelected: ringSelected },
  { id: 'arc',    image: arc,    imageSelected: arcSelected },
  { id: 'spiral', image: spiral, imageSelected: spiralSelected },
  { id: 'sivama', image: sivama, imageSelected: sivamaSelected, label: 'SIVAMA' },
]

interface Props {
  selected: BendingMethodId | null
  onSelect: (id: BendingMethodId) => void
}

export default function BendingMethodGrid({ selected, onSelect }: Props) {
  const t = useT()
  return (
    <div className={styles.grid}>
      {methods.map((m) => {
        const enabled = METHOD_ENABLED[m.id]
        return (
          <button
            key={m.id}
            className={`${styles.tile} ${selected === m.id ? styles.tileSelected : ''} ${enabled ? '' : styles.tileDisabled}`}
            onClick={() => enabled && onSelect(m.id)}
            disabled={!enabled}
            aria-disabled={!enabled || undefined}
          >
            <img src={selected === m.id ? m.imageSelected : m.image} alt={m.id} className={styles.image} />
            {!enabled && <span className={styles.soonTag}>{t('YAKINDA')}</span>}
          </button>
        )
      })}
    </div>
  )
}
