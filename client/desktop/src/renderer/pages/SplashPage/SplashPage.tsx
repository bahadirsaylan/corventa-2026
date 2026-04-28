import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import styles from './SplashPage.module.css'

const SPLASH_DURATION_MS = 3000

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true })
    }, SPLASH_DURATION_MS)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className={styles.page}>
      <CorventaLogo size="full" />
    </div>
  )
}
