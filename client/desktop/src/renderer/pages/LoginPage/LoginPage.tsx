import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(false)

    // TODO: replace with real auth call to WebAPI
    //if (username.trim() && password.trim()) {
      navigate('/dashboard', { replace: true })
    //} else {
    //  setError(true)
    //}
  }

  return (
    <div className={styles.page}>
      <div className={styles.center}>
        <CorventaLogo size="compact" />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">
              KULLANICI ADI :
            </label>
            <input
              id="username"
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="password">
                ŞİFRE :
              </label>
              {error && (
                <span className={styles.errorInline}>
                  ( × KULLANICI ADI VEYA ŞİFRE HATALI )
                </span>
              )}
            </div>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            GİRİŞ
          </button>
        </form>

        <p className={styles.version}>V.22.01.0186</p>
      </div>
    </div>
  )
}
