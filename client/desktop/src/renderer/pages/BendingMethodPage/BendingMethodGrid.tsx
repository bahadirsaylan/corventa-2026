import { BendingMethodId } from '@/store/bendingJobStore'
import styles from './BendingMethodGrid.module.css'
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
  return (
    <div className={styles.grid}>
      {methods.map((m) => (
        <button
          key={m.id}
          className={`${styles.tile} ${selected === m.id ? styles.tileSelected : ''}`}
          onClick={() => onSelect(m.id)}
        >
          <img src={selected === m.id ? m.imageSelected : m.image} alt={m.id} className={styles.image} />
        </button>
      ))}
    </div>
  )
}
