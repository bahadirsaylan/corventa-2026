// Giriş ekranı — rol sistemi (2026-11-01).
// Açılışta DataApi GET /api/auth/setup-status: hiç kullanıcı yoksa "İLK KURULUM — SÜPERADMİN OLUŞTUR"
// formu (/api/auth/setup), yoksa normal giriş (/api/auth/login). Token main süreçte kalır; burada sadece
// { username, displayName, role } gelir. Metin alanlarında global ekran klavyesi (VirtualKeyboard) açılır.

import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { AuthResult, AuthUser } from '@shared/types'

import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import { startSession } from '@/stores/sessionStore'
import { t as tr, useT } from '@/i18n'
import styles from './LoginPage.module.css'

type Mode = 'loading' | 'login' | 'setup'

const MIN_PASSWORD = 6

/** Kilit bitişi → yerel saat (SS:DD) */
function lockTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

/** Sonuç zarfı → net mesaj (durum koduna göre; bilinmeyen durumda backend metni) */
function failureMessage(res: Extract<AuthResult<unknown>, { ok: false }>, setup: boolean): string {
  switch (res.status) {
    case 0:
      return tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN')
    case 401:
      return tr('KULLANICI ADI VEYA ŞİFRE HATALI')
    case 403:
      return tr('KULLANICI PASİF — YÖNETİCİNİZE BAŞVURUN')
    case 423: {
      const until = lockTime(res.lockedUntil)
      return until
        ? tr('ÇOK FAZLA HATALI DENEME — HESAP {time} SAATİNE KADAR KİLİTLİ', { time: until })
        : tr('ÇOK FAZLA HATALI DENEME — HESAP GEÇİCİ OLARAK KİLİTLİ')
    }
    case 409:
      if (setup) return tr('İLK KURULUM ZATEN YAPILMIŞ — GİRİŞ YAPIN')
      return res.error
    case 400:
      return setup ? res.error : tr('KULLANICI ADI VE ŞİFRE ZORUNLU')
    case 404:
      // /api/auth uçları olmayan eski DataApi çalışıyor — giriş artık DataApi'ye bağlı
      return tr('VERİ SERVİSİ SÜRÜMÜ ESKİ (GİRİŞ DESTEKLENMİYOR) — DATAAPI GÜNCELLENMELİ')
    default:
      return res.error || tr('GİRİŞ BAŞARISIZ')
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const t = useT()
  const [mode, setMode] = useState<Mode>('loading')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // DEMO (2026-11-04): demo kullanıcıları ekranda yazsın — demoyu açan kişi giriş bilgisini bilmeden girebilsin
  const [isDemo, setIsDemo] = useState(false)
  // Demo pencere boyutu (yüzde) — null = demo pencere modu değil
  const [zoomPct, setZoomPct] = useState<number | null>(null)
  const zoom = (a: 'in' | 'out' | 'reset') =>
    window.corventa.system.demoZoom(a).then(setZoomPct).catch(() => undefined)
  useEffect(() => {
    window.corventa.system.isDemo().then(setIsDemo).catch(() => undefined)
    window.corventa.system.demoZoom().then(setZoomPct).catch(() => undefined)
  }, [])

  // İlk kurulum gerekiyor mu? DataApi'ye ulaşılamazsa giriş formu + uyarı (giriş denemesi de aynı hatayı verir)
  useEffect(() => {
    let alive = true
    window.corventa.auth
      .getSetupStatus()
      .then((res) => {
        if (!alive) return
        if (res.ok) setMode(res.data.needsSetup ? 'setup' : 'login')
        else {
          setMode('login')
          setError(failureMessage(res, false))
        }
      })
      .catch(() => {
        if (!alive) return
        setMode('login')
        setError(tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
      })
    return () => {
      alive = false
    }
  }, [])

  function enter(user: AuthUser) {
    startSession(user)
    navigate('/dashboard', { replace: true })
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!username.trim() || !password) {
      setError(t('KULLANICI ADI VE ŞİFRE ZORUNLU'))
      return
    }
    setBusy(true)
    try {
      const res = await window.corventa.auth.login(username.trim(), password)
      if (res.ok) return enter(res.data)
      setPassword('')
      setError(failureMessage(res, false))
    } catch {
      setError(t('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSetup(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    const name = username.trim()
    if (name.length < 3 || name.length > 50) return setError(t('KULLANICI ADI 3-50 KARAKTER OLMALI'))
    if (/\s/.test(name)) return setError(t('KULLANICI ADI BOŞLUK İÇEREMEZ'))
    if (password.length < MIN_PASSWORD) return setError(t('ŞİFRE EN AZ {n} KARAKTER OLMALI', { n: MIN_PASSWORD }))
    if (password !== password2) return setError(t('ŞİFRELER AYNI DEĞİL'))
    setBusy(true)
    try {
      const res = await window.corventa.auth.setup({
        username: name,
        displayName: displayName.trim() || undefined,
        password,
      })
      if (res.ok) return enter(res.data)
      setError(failureMessage(res, true))
      if (res.status === 409) {
        // Başka biri kurulumu tamamlamış — giriş formuna geç
        setMode('login')
        setPassword('')
        setPassword2('')
      }
    } catch {
      setError(t('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.center}>
        <CorventaLogo size="compact" />

        {mode === 'loading' && <p className={styles.hint}>{t('BAĞLANILIYOR…')}</p>}

        {mode === 'login' && (
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="username">
                {t('KULLANICI ADI :')}
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
              <label className={styles.label} htmlFor="password">
                {t('ŞİFRE :')}
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className={styles.errorBox} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={styles.submitBtn} disabled={busy}>
              {busy ? t('KONTROL EDİLİYOR…') : t('GİRİŞ')}
            </button>
          </form>
        )}

        {mode === 'setup' && (
          <form className={styles.form} onSubmit={handleSetup} noValidate>
            <div className={styles.setupHead}>
              <span className={styles.setupTitle}>{t('İLK KURULUM — SÜPERADMİN OLUŞTUR')}</span>
              <span className={styles.setupNote}>
                {t('Makinede henüz kullanıcı yok. Tüm yetkilere sahip ilk yönetici hesabını oluşturun; diğer kullanıcıları sonra Ayarlar > Kullanıcı Yönetimi’nden ekleyebilirsiniz.')}
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="setup-username">
                {t('KULLANICI ADI :')}
              </label>
              <input
                id="setup-username"
                className={styles.input}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="setup-display">
                {t('AD SOYAD :')}
              </label>
              <input
                id="setup-display"
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="setup-password">
                  {t('ŞİFRE :')}
                </label>
                <input
                  id="setup-password"
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="setup-password2">
                  {t('ŞİFRE TEKRAR :')}
                </label>
                <input
                  id="setup-password2"
                  className={styles.input}
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <p className={styles.errorBox} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={styles.submitBtn} disabled={busy}>
              {busy ? t('OLUŞTURULUYOR…') : t('SÜPERADMİN OLUŞTUR')}
            </button>
          </form>
        )}

        {isDemo && mode === 'login' && (
          <p className={styles.demoHint}>
            {t('DEMO — Kullanıcı: operator / admin / super · Şifre: 1234')}
          </p>
        )}

        {isDemo && zoomPct != null && (
          <div className={styles.demoZoom}>
            <span>{t('EKRAN BOYUTU')}</span>
            <button type="button" className={styles.demoZoomBtn} onClick={() => void zoom('out')} aria-label={t('Küçült')}>
              −
            </button>
            <b>%{zoomPct * 2}</b>
            <button type="button" className={styles.demoZoomBtn} onClick={() => void zoom('in')} aria-label={t('Büyüt')}>
              +
            </button>
            <button type="button" className={styles.demoZoomBtn} onClick={() => void zoom('reset')}>
              {t('OTOMATİK')}
            </button>
            <small>{t('Her ekranda: Ctrl + / Ctrl − / Ctrl 0')}</small>
          </div>
        )}

        <p className={styles.version}>V.22.01.0186</p>
      </div>
    </div>
  )
}
