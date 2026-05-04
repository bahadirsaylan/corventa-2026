import { BendingMethodId } from '@/store/bendingJobStore'
import styles from './BendingMethodGrid.module.css'
import ring from '@/assets/images/blend3-1-buyuk.png'
import arc from '@/assets/images/blend3-2-buyuk.png'
import spiral from '@/assets/images/blend3-3-buyuk.png'
import sivama from '@/assets/images/blend3-4-buyuk.png'

interface Method {
  id: BendingMethodId
  image: string
  label?: string
}

const methods: Method[] = [
  { id: 'ring',   image: ring },
  { id: 'arc',    image: arc },
  { id: 'spiral', image: spiral },
  { id: 'sivama', image: sivama, label: 'SIVAMA' },
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
          <img src={m.image} alt={m.id} className={styles.image} />
        </button>
      ))}
    </div>
  )
}
