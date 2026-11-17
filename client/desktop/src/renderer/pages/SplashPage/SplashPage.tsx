import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import styles from './SplashPage.module.css'
import { EDITION_LABEL, IS_STANDARD } from '@shared/edition'
import { useT } from '@/i18n'

const SPLASH_DURATION_MS = 3000

export default function SplashPage() {
  const navigate = useNavigate()
  const t = useT()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login', { replace: true })
    }, SPLASH_DURATION_MS)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className={styles.page}>
      <CorventaLogo size="full" />
      {/* STANDART SÜRÜM (2026-11-17) — logonun altında küçük sürüm adı */}
      {IS_STANDARD && <p className={styles.edition}>{t(EDITION_LABEL)}</p>}
    </div>
  )
}
