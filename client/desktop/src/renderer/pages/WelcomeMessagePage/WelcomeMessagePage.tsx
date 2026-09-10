import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './WelcomeMessagePage.module.css'

const STORAGE_KEY = 'corventa.welcomeMessage'
const DEFAULT_MESSAGE =
  'CORVENTA BENDING MACHINE\n\nMakineyi seçtiğiniz için teşekkür ederiz.\nİyi çalışmalar dileriz.'
const MAX_LENGTH = 500

export default function WelcomeMessagePage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setMessage(stored ?? DEFAULT_MESSAGE)
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, message)
    const now = new Date().toLocaleString('tr-TR')
    setSavedAt(now)
  }

  const handleReset = () => {
    setMessage(DEFAULT_MESSAGE)
    localStorage.removeItem(STORAGE_KEY)
    setSavedAt(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">
          ←
        </button>
        <h1 className={styles.title}>KARŞILAMA MESAJI</h1>
      </div>

      <div className={styles.body}>
        <p className={styles.helpText}>
          Operatör login sonrası gösterilecek karşılama mesajını düzenleyin. En fazla {MAX_LENGTH} karakter.
        </p>

        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
          rows={10}
          placeholder="Karşılama mesajınızı buraya yazın..."
        />

        <div className={styles.statusRow}>
          <span className={styles.counter}>
            {message.length} / {MAX_LENGTH} karakter
          </span>
          {savedAt && <span className={styles.savedAt}>Kaydedildi: {savedAt}</span>}
        </div>

        <div className={styles.preview}>
          <span className={styles.previewLabel}>ÖNİZLEME</span>
          <div className={styles.previewBox}>
            {message.split('\n').map((line, i) => (
              <div key={i} className={styles.previewLine}>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.resetBtn}`} onClick={handleReset}>
            VARSAYILANA DÖN
          </button>
          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSave}>
            KAYDET
          </button>
        </div>
      </div>
    </div>
  )
}
