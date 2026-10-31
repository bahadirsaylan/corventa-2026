// Girişten sonra bir kez gösterilen bakım uyarı penceresi (UI madde 19).
// Karşılama mesajı (WelcomeOverlay) kapandıktan SONRA açılır — ikisi aynı anda görünmez.
// Vadesi geçmiş periyot yoksa hiç açılmaz. Renk en yüksek kademeye göre:
// 1. hafta yeşil hatırlatma, 2. hafta sarı uyarı, 3. hafta+ kırmızı kritik (services/maintenanceStatus.ts).
// Sadece bilgi — hiçbir hareketi / büküm başlatmayı engellemez.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import { useMaintenanceAlerts } from '@/hooks/useMaintenance'
import { maintenanceTierTitle } from '@/services/maintenanceStatus'
import { useT } from '@/i18n'
import styles from './MaintenanceAlertOverlay.module.css'

export default function MaintenanceAlertOverlay() {
  const t = useT()
  const navigate = useNavigate()
  const pending = useSessionStore((s) => s.showMaintenanceAlert)
  const welcomeOpen = useSessionStore((s) => s.showWelcome)
  const dismiss = useSessionStore((s) => s.dismissMaintenanceAlert)
  const { alerts, top, loaded } = useMaintenanceAlerts()

  // Bakım durumu yüklendi ve uyarı yok (ya da DataApi'ye ulaşılamadı) → bu oturum için bekleme biter
  useEffect(() => {
    if (pending && loaded && !top) dismiss()
  }, [pending, loaded, top, dismiss])

  if (!pending || welcomeOpen || !top) return null

  const openPage = () => {
    dismiss()
    navigate('/settings/maintenance')
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`${styles.card} ${styles[`tier_${top.tier}`]}`}>
        <div className={styles.icon}>🔧</div>
        <div className={styles.title}>{t(maintenanceTierTitle(top.tier!))}</div>
        <div className={styles.subtitle}>{t('Bakım zamanı geçti. Lütfen bakımı yapıp Bakım Süresi sayfasından işaretleyin.')}</div>

        <ul className={styles.list}>
          {alerts.map((a) => (
            <li key={a.info.key} className={`${styles.row} ${styles[`tier_${a.tier}`]}`}>
              <span className={styles.rowLabel}>{t('{period} BAKIM', { period: t(a.info.label).toLocaleUpperCase() })}</span>
              <span className={styles.rowValue}>{t('{n} GÜN GECİKME', { n: a.overdueDays ?? 0 })}</span>
            </li>
          ))}
        </ul>

        {top.lockSoon && (
          <div className={styles.lockNote}>
            {t('3 haftadan uzun süredir yapılmayan bakım var — bakım kilidi yakında devreye girecek.')}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={dismiss}>
            {t('KAPAT')}
          </button>
          <button type="button" className={styles.pageBtn} onClick={openPage}>
            {t('BAKIM SAYFASI')}
          </button>
        </div>
      </div>
    </div>
  )
}
