import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useLang, useT } from '@/i18n'
import {
  WELCOME_DEFAULT_MESSAGE as DEFAULT_MESSAGE,
  WELCOME_MAX_LENGTH as MAX_LENGTH,
  loadWelcomeMessage,
  saveWelcomeMessage,
} from '@/services/welcomeMessage'
import { useUserKey } from '@/stores/sessionStore'
import styles from './WelcomeMessagePage.module.css'

export default function WelcomeMessagePage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [message, setMessage] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // 2026-11-19 (kullanıcı): her operatör KENDİ karşılama mesajını düzenler (DataApi UserPreferences) — bulut yok
  const userKey = useUserKey()
  const shown = message

  useEffect(() => {
    let alive = true
    loadWelcomeMessage(userKey).then((stored) => {
      if (alive) setMessage(stored == null || stored.trim() === DEFAULT_MESSAGE ? t(DEFAULT_MESSAGE) : stored)
    })
    return () => { alive = false }
  }, [userKey])

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveWelcomeMessage(userKey, message)
      setSavedAt(new Date().toLocaleString(locale))
    } catch {
      setError(t('KAYDEDİLEMEDİ — TEKRAR DENEYİN'))
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    setMessage(t(DEFAULT_MESSAGE))
    setSavedAt(null)
    try {
      await saveWelcomeMessage(userKey, null)
    } catch {
      setError(t('KAYDEDİLEMEDİ — TEKRAR DENEYİN'))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('KARŞILAMA MESAJI')}</h1>
      </div>

      <div className={styles.body}>
        <p className={styles.helpText}>
          {t('Girişten sonra SİZE gösterilecek karşılama mesajını düzenleyin (her kullanıcının kendi mesajı). En fazla {n} karakter.', { n: MAX_LENGTH })}
        </p>

        <textarea
          className={styles.textarea}
          value={shown}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
          rows={10}
          placeholder={t('Karşılama mesajınızı buraya yazın...')}
        />

        <div className={styles.statusRow}>
          <span className={styles.counter}>
            {t('{len} / {max} karakter', { len: shown.length, max: MAX_LENGTH })}
          </span>
          {savedAt && <span className={styles.savedAt}>{t('Kaydedildi: {at}', { at: savedAt })}</span>}
          {error && <span className={styles.savedAt}>{error}</span>}
        </div>

        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t('ÖNİZLEME')}</span>
          <div className={styles.previewBox}>
            {shown.split('\n').map((line, i) => (
              <div key={i} className={styles.previewLine}>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.resetBtn}`} onClick={() => void handleReset()} disabled={busy}>
            {t('VARSAYILANA DÖN')}
          </button>
          <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={() => void handleSave()} disabled={busy}>
            {t('KAYDET')}
          </button>
        </div>
      </div>
    </div>
  )
}
