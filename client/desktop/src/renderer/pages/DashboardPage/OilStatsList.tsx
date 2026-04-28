import styles from './OilStatsList.module.css'

interface StatRow {
  label: string
  value: string
  ok: boolean
}

// Static mock — will be driven by DataAPI/WebSocket
const rows: StatRow[] = [
  { label: 'YAĞ SICAKLIĞI',       value: '90°C',     ok: true  },
  { label: 'YAĞ SEVİYESİ',        value: 'NORMAL',   ok: true  },
  { label: 'YAĞLAMA VERİMLİLİĞİ', value: '%82',      ok: true  },
  { label: 'YAĞ BASINCI',         value: '000',      ok: true  },
  { label: 'DÖNÜŞ HIZI',          value: '10M/Dak.', ok: true  },
  { label: 'TEMAS SENSÖRÜ',       value: 'ARIZALI',  ok: false },
  { label: 'YAN DAY. CETVELLER',  value: 'FAAL',     ok: true  },
  { label: 'ANA CETVELLER',       value: 'FAAL',     ok: true  },
]

export default function OilStatsList() {
  return (
    <ul className={styles.grid}>
      {rows.map((row) => (
        <li
          key={row.label}
          className={`${styles.box} ${row.ok ? styles.boxOk : styles.boxFail}`}
        >
          <span className={`${styles.icon} ${row.ok ? styles.iconOk : styles.iconFail}`}>
            {row.ok ? '✓' : '✕'}
          </span>
          <span className={styles.label}>{row.label}</span>
          <span className={`${styles.value} ${row.ok ? '' : styles.valueFail}`}>
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
