// Kıvrım yönü kutuları — seçenekler profile göre (constants/profileDirections).
// Görselli kutuda altta yön adı (YATAY / DİKİNE / DİK / YAN / TERS); görselsiz kutu sadece etiket.

import { BendingDirectionId } from '@/store/bendingJobStore'
import type { DirectionOption } from '@/constants/profileDirections'
import styles from './BendingDirectionGrid.module.css'

interface Props {
  options: DirectionOption[]
  selected: BendingDirectionId | null
  onSelect: (id: BendingDirectionId) => void
}

export default function BendingDirectionGrid({ options, selected, onSelect }: Props) {
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 2)}, 1fr)` }}>
      {options.map((d) => (
        <button
          key={d.id}
          className={`${styles.tile} ${selected === d.id ? styles.tileSelected : ''}`}
          onClick={() => onSelect(d.id)}
        >
          {d.image ? (
            <>
              <img src={d.image} alt={d.label} className={styles.image} />
              <span className={styles.caption}>{d.label}</span>
            </>
          ) : (
            <span className={styles.label}>{d.label}</span>
          )}
        </button>
      ))}
    </div>
  )
}
