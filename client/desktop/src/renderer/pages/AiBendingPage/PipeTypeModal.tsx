// Boş boru seçilince açılan sade pencere — DİKİŞLİ / ETLİ boru (PROFIL_YONLERI çizimleri).
// Seçim job'a ProfileSubType olarak gider. Dolu boru bu pencereyi açmaz.

import type { PipeTypeId } from '@/store/bendingJobStore'
import styles from './PipeTypeModal.module.css'
import dikisliImage from '@/assets/images/pipe-dikisli.png'
import etliImage from '@/assets/images/pipe-etli.png'

interface Props {
  selected: PipeTypeId | null
  onSelect: (type: PipeTypeId) => void
  onClose: () => void
}

const OPTIONS: { id: PipeTypeId; label: string; image: string }[] = [
  { id: 'DIKISLI', label: 'DİKİŞLİ BORU', image: dikisliImage },
  { id: 'ETLI', label: 'ETLİ BORU', image: etliImage },
]

export default function PipeTypeModal({ selected, onSelect, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>BORU TİPİNİ SEÇİNİZ</h3>
        <div className={styles.options}>
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={styles.option}
              data-selected={selected === o.id || undefined}
              onClick={() => onSelect(o.id)}
            >
              <img src={o.image} alt="" className={styles.image} />
              <span className={styles.label}>{o.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.cancel} onClick={onClose}>
          VAZGEÇ
        </button>
      </div>
    </div>
  )
}
