import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <h2 className={styles.heading}>{t('Sayfa bulunamadı')}</h2>
      <button className={styles.btn} onClick={() => navigate('/dashboard')}>
        {t('Ana ekrana git')}
      </button>
    </div>
  )
}
