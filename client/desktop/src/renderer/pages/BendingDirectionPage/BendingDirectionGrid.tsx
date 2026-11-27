// Kıvrım yönü kutuları — seçenekler profile göre (constants/profileDirections).
// Görselli kutuda altta yön adı (YATAY / DİKİNE / DİK / YAN / TERS); görselsiz kutu sadece etiket.
// Boş boruda aynı ızgara DİKİŞLİ / ETLİ boru tipini gösterir (id = PipeTypeId).

import type { DirectionOption } from '@/constants/profileDirections'
import { useT } from '@/i18n'
import styles from './BendingDirectionGrid.module.css'

interface Props<Id extends string> {
  options: DirectionOption<Id>[]
  selected: Id | null
  onSelect: (id: Id) => void
}

export default function BendingDirectionGrid<Id extends string>({ options, selected, onSelect }: Props<Id>) {
  const t = useT()
  return (
    <div
      className={styles.grid}
      // 2026-11-17: tek seçenek (ör. Standart sürümde DİĞER yok) yarım genişlikte ortada — sağ taraf boş kalmasın
      style={options.length === 1
        ? { gridTemplateColumns: 'minmax(0, 50%)', justifyContent: 'center' }
        : { gridTemplateColumns: `repeat(${Math.max(options.length, 2)}, 1fr)` }}
    >
      {options.map((d) => (
        <button
          key={d.id}
          className={`${styles.tile} ${selected === d.id ? styles.tileSelected : ''}`}
          onClick={() => onSelect(d.id)}
        >
          {d.image ? (
            <>
              <img src={d.image} alt={t(d.label)} className={styles.image} />
              <span className={styles.caption}>{t(d.label)}</span>
            </>
          ) : (
            <span className={styles.label}>{t(d.label)}</span>
          )}
        </button>
      ))}
    </div>
  )
}
