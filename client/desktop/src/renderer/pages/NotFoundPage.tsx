import { useNavigate } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <h2 className={styles.heading}>Page not found</h2>
      <button className={styles.btn} onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </button>
    </div>
  )
}
