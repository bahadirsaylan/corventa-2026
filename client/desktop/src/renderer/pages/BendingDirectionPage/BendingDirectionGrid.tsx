import { BendingDirectionId } from '@/store/bendingJobStore'
import styles from './BendingDirectionGrid.module.css'
import blend1 from '@/assets/images/blend2-1.png'
import blend2 from '@/assets/images/blend2-2.png'

interface Direction {
  id: BendingDirectionId
  image?: string
  label?: string
}

const directions: Direction[] = [
  { id: 'left',  image: blend1 },
  { id: 'right', image: blend2 },
  { id: 'other', label: 'DİĞER\nKIVRIM YÖNLERİ' },
]

interface Props {
  selected: BendingDirectionId | null
  onSelect: (id: BendingDirectionId) => void
}

export default function BendingDirectionGrid({ selected, onSelect }: Props) {
  return (
    <div className={styles.grid}>
      {directions.map((d) => (
        <button
          key={d.id}
          className={`${styles.tile} ${selected === d.id ? styles.tileSelected : ''}`}
          onClick={() => onSelect(d.id)}
        >
          {d.image ? (
            <img src={d.image} alt={d.id} className={styles.image} />
          ) : (
            <span className={styles.label}>{d.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}
