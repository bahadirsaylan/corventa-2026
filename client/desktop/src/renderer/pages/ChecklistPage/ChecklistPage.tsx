import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ChecklistPage.module.css'

interface ChecklistItem {
  id: string
  label: string
  category: 'Güvenlik' | 'Hidrolik' | 'Pnömatik' | 'Sensör' | 'Genel'
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'estop', label: 'Acil stop butonları test edildi', category: 'Güvenlik' },
  { id: 'guards', label: 'Koruma kapakları kapalı ve sabit', category: 'Güvenlik' },
  { id: 'phase', label: 'Faz sırası lambası yeşil', category: 'Güvenlik' },

  { id: 'oilLevel', label: 'Hidrolik yağ seviyesi minimum üstünde', category: 'Hidrolik' },
  { id: 'oilTemp', label: 'Yağ sıcaklığı 50°C altında (ilk çalışmada)', category: 'Hidrolik' },
  { id: 'leak', label: 'Hidrolik kaçak görsel kontrol yapıldı', category: 'Hidrolik' },
  { id: 'pressure', label: 'S1 / S2 hat basınçları normal aralıkta', category: 'Hidrolik' },

  { id: 'airPressure', label: 'Pnömatik hat basıncı 6 bar civarında', category: 'Pnömatik' },
  { id: 'airFilter', label: 'Hava filtresi temiz, su tahliyesi yapıldı', category: 'Pnömatik' },

  { id: 'partSensor', label: 'Parça varlık sensörleri (sol/sağ) temiz', category: 'Sensör' },
  { id: 'radiusSensor', label: 'Yarıçap (Keyence GT2) sensör kafaları temiz', category: 'Sensör' },
  { id: 'encoder', label: 'Lineer cetvel okumaları kararlı', category: 'Sensör' },

  { id: 'fan', label: 'Soğutma fanı çalışıyor', category: 'Genel' },
  { id: 'noise', label: 'Anormal ses / titreşim yok', category: 'Genel' },
  { id: 'workArea', label: 'Çalışma alanı temiz, parçalar yerleştirildi', category: 'Genel' },
]

const STORAGE_KEY = 'corventa.checklist'
const CATEGORIES = ['Güvenlik', 'Hidrolik', 'Pnömatik', 'Sensör', 'Genel'] as const

interface ChecklistState {
  checked: Record<string, boolean>
  savedAt: string | null
  operator: string
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ChecklistPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ChecklistState>({
    checked: {},
    savedAt: null,
    operator: '',
  })

  const today = useMemo(() => todayKey(), [])

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}.${today}`)
    if (stored) {
      try {
        setState(JSON.parse(stored))
      } catch {
        // ignore corrupt entry
      }
    }
  }, [today])

  const toggle = (id: string) => {
    setState((prev) => ({
      ...prev,
      checked: { ...prev.checked, [id]: !prev.checked[id] },
    }))
  }

  const handleSave = () => {
    const now = new Date().toLocaleString('tr-TR')
    const next = { ...state, savedAt: now }
    setState(next)
    localStorage.setItem(`${STORAGE_KEY}.${today}`, JSON.stringify(next))
  }

  const handleReset = () => {
    setState({ checked: {}, savedAt: null, operator: state.operator })
    localStorage.removeItem(`${STORAGE_KEY}.${today}`)
  }

  const checkedCount = Object.values(state.checked).filter(Boolean).length
  const totalCount = CHECKLIST_ITEMS.length
  const allDone = checkedCount === totalCount

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">
          ←
        </button>
        <h1 className={styles.title}>GÜNLÜK CHECK LIST</h1>
        <span className={styles.dateBadge}>{new Date().toLocaleDateString('tr-TR')}</span>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>İLERLEME</span>
          <span className={`${styles.summaryValue} ${allDone ? styles.allDone : ''}`}>
            {checkedCount} / {totalCount}
          </span>
        </div>
        <div className={styles.summaryProgress}>
          <div
            className={`${styles.summaryFill} ${allDone ? styles.allDone : ''}`}
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
        {state.savedAt && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>SON KAYDET</span>
            <span className={styles.summarySaved}>{state.savedAt}</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        {CATEGORIES.map((cat) => {
          const items = CHECKLIST_ITEMS.filter((i) => i.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat} className={styles.section}>
              <h2 className={styles.sectionTitle}>{cat}</h2>
              <div className={styles.itemList}>
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`${styles.item} ${state.checked[item.id] ? styles.itemChecked : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={!!state.checked[item.id]}
                      onChange={() => toggle(item.id)}
                    />
                    <span className={styles.checkBox}>
                      {state.checked[item.id] && <span className={styles.checkMark}>✓</span>}
                    </span>
                    <span className={styles.itemLabel}>{item.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className={styles.footer}>
        <input
          className={styles.operatorInput}
          type="text"
          placeholder="Operatör adı"
          value={state.operator}
          onChange={(e) => setState((s) => ({ ...s, operator: e.target.value }))}
        />
        <button className={`${styles.actionBtn} ${styles.resetBtn}`} onClick={handleReset}>
          SIFIRLA
        </button>
        <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSave}>
          KAYDET
        </button>
      </div>
    </div>
  )
}
