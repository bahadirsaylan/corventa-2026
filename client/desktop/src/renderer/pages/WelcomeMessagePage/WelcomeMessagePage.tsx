import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '@/i18n'
import {
  WELCOME_DEFAULT_MESSAGE as DEFAULT_MESSAGE,
  WELCOME_MAX_LENGTH as MAX_LENGTH,
  WELCOME_STORAGE_KEY as STORAGE_KEY,
} from '@/services/welcomeMessage'
import styles from './WelcomeMessagePage.module.css'

export default function WelcomeMessagePage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [message, setMessage] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setMessage(stored ?? DEFAULT_MESSAGE)
  }, [])

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, message)
    const now = new Date().toLocaleString(locale)
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
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          ←
        </button>
        <h1 className={styles.title}>{t('KARŞILAMA MESAJI')}</h1>
      </div>

      <div className={styles.body}>
        <p className={styles.helpText}>
          {t('Operatör login sonrası gösterilecek karşılama mesajını düzenleyin. En fazla {n} karakter.', { n: MAX_LENGTH })}
        </p>

        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
          rows={10}
          placeholder={t('Karşılama mesajınızı buraya yazın...')}
        />

        <div className={styles.statusRow}>
          <span className={styles.counter}>
            {t('{len} / {max} karakter', { len: message.length, max: MAX_LENGTH })}
          </span>
          {savedAt && <span className={styles.savedAt}>{t('Kaydedildi: {at}', { at: savedAt })}</span>}
        </div>

        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t('ÖNİZLEME')}</span>
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
            {t('VARSAYILANA DÖN')}
          </button>
          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSave}>
            {t('KAYDET')}
          </button>
        </div>
      </div>
    </div>
  )
}
