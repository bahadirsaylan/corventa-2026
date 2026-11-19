// Kullanıcı girişinden sonra bir kez gösterilen karşılama mesajı (Ayarlar > Karşılama Mesajı).
// Dokununca veya AUTO_CLOSE_MS sonra kapanır. Kayıtlı mesaj yoksa varsayılan mesaj seçili dilde gösterilir;
// operatörün yazdığı mesaj olduğu gibi gösterilir.
// 2026-11-19: global uyarı kuyruğuna katılır (alertQueueStore, en düşük öncelikli pencerelerden) — başka uyarı
// açıkken bekler; otomatik kapanma süresi pencere GÖRÜNÜNCE başlar.

import { useEffect, useState } from 'react'
import { useSessionStore, useUserKey } from '@/stores/sessionStore'
import { ALERT_PRIORITY, useAlertSlot } from '@/stores/alertQueueStore'
import { loadWelcomeMessage, WELCOME_DEFAULT_MESSAGE } from '@/services/welcomeMessage'
import { useT } from '@/i18n'
import styles from './WelcomeOverlay.module.css'

const AUTO_CLOSE_MS = 8000

export default function WelcomeOverlay() {
  const t = useT()
  const show = useSessionStore((s) => s.showWelcome)
  const username = useSessionStore((s) => s.username)
  const dismiss = useSessionStore((s) => s.dismissWelcome)
  // 2026-11-19: kullanıcının KENDİ mesajı (DataApi UserPreferences) — bulut mesajı kullanılmaz
  const userKey = useUserKey()
  const [stored, setStored] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!show) return
    let alive = true
    setStored(undefined)
    loadWelcomeMessage(userKey).then((m) => { if (alive) setStored(m) })
    return () => { alive = false }
  }, [show, userKey])

  // Mesaj okunana kadar sıraya girmez (en fazla bir an) — girişte İLK pencere karşılama
  const visible = useAlertSlot('welcome', ALERT_PRIORITY.welcome, show && stored !== undefined)

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(dismiss, AUTO_CLOSE_MS)
    return () => clearTimeout(id)
  }, [visible, dismiss])

  if (!visible) return null
  // Kayıtlı mesaj yok ya da varsayılanla aynıysa seçili dile çevrilir; operatörün kendi metni aynen gösterilir
  const message = stored == null || stored.trim() === WELCOME_DEFAULT_MESSAGE ? t(WELCOME_DEFAULT_MESSAGE) : stored

  return (
    <div className={styles.overlay} onClick={dismiss} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.hello}>
          {username ? t('HOŞ GELDİNİZ, {name}', { name: username.toLocaleUpperCase('tr-TR') }) : t('HOŞ GELDİNİZ')}
        </div>
        <div className={styles.message}>{message}</div>
        <button type="button" className={styles.okBtn} onClick={dismiss}>
          {t('TAMAM')}
        </button>
        <div className={styles.timer} style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />
      </div>
    </div>
  )
}
