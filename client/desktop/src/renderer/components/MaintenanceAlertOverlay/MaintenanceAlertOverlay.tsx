// Girişten sonra bir kez gösterilen bakım uyarı penceresi (UI madde 19).
// 2026-11-19: global uyarı kuyruğuna katılır (alertQueueStore) — karşılama / kirlilik / hatırlatma pencereleriyle
// üst üste açılmaz; sırası gelince açılır. Basılan düğme (KAPAT / BAKIM SAYFASI) UYARI KAYITLARI'na yazılır
// (periyot başına satır, kilit aktifse MaintenanceLock). Bakım tamamlanınca DataApi bölümü kapatır (RESOLVED).
// Vadesi geçmiş periyot yoksa hiç açılmaz. Renk en yüksek kademeye göre:
// 1. hafta yeşil hatırlatma, 2. hafta sarı uyarı, 3. hafta+ kırmızı kritik (services/maintenanceStatus.ts).
// Sadece bilgi. BAKIM KİLİDİ (EXCEL 34) aktifse kilit notu gösterilir — engeli backend uygular.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'
import { ALERT_PRIORITY, useAlertSlot } from '@/stores/alertQueueStore'
import { logAlertAck } from '@/services/alertAcks'
import type { AlertAckCreateBody } from '@shared/types/alert-ack'
import type { MaintenancePeriodStatus } from '@/services/maintenanceStatus'
import { useMaintenanceAlerts, useMaintenanceLock } from '@/hooks/useMaintenance'
import { maintenanceTierTitle } from '@/services/maintenanceStatus'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './MaintenanceAlertOverlay.module.css'

const SLOT_ID = 'maintenance-alert'

/** Kayda yazılan sabit TÜRKÇE metin — "BAKIM UYARISI: HAFTALIK BAKIM 9 GÜN GECİKME; …" (+ kilit notu) */
function maintenanceAckMessage(alerts: MaintenancePeriodStatus[], locked: boolean): string {
  const rows = alerts
    .map((a) => `${maintenanceTierTitle(a.tier!)}: ${a.info.label.toLocaleUpperCase('tr-TR')} BAKIM ${a.overdueDays ?? 0} GÜN GECİKME`)
    .join('; ')
  return locked ? `${rows} — BAKIM KİLİDİ AKTİF (otomatik / yarı otomatik büküm başlatılamaz)` : rows
}

export default function MaintenanceAlertOverlay() {
  const t = useT()
  const navigate = useNavigate()
  const pending = useSessionStore((s) => s.showMaintenanceAlert)
  const dismiss = useSessionStore((s) => s.dismissMaintenanceAlert)
  const { alerts, top, loaded } = useMaintenanceAlerts()
  const { active: locked } = useMaintenanceLock()

  // Bakım durumu yüklendi ve uyarı yok (ya da DataApi'ye ulaşılamadı) → bu oturum için bekleme biter
  useEffect(() => {
    if (pending && loaded && !top) dismiss()
  }, [pending, loaded, top, dismiss])

  const visible = useAlertSlot(SLOT_ID, ALERT_PRIORITY.maintenanceAlert, pending && !!top)

  if (!visible || !top) return null

  const answer = (action: AlertAckCreateBody['action']) => {
    logAlertAck({
      slotId: SLOT_ID,
      alertKind: locked ? 'MaintenanceLock' : 'MaintenanceOverdue',
      alertKey: alerts.map((a) => a.info.key).join(','),
      message: maintenanceAckMessage(alerts, locked),
      severity: top.tier === 'critical' ? 'error' : top.tier === 'warning' ? 'warning' : 'info',
      action,
    })
    dismiss()
  }

  const openPage = () => {
    answer('OPENED_MAINTENANCE')
    navigate('/settings/maintenance')
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`${styles.card} ${styles[`tier_${top.tier}`]}`}>
        <div className={styles.icon}><Icon name="maintenance" size="xxl" /></div>
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

        {locked ? (
          <div className={styles.lockNote}>
            <Icon name="lock" size="sm" />{' '}
            {t('BAKIM KİLİDİ AKTİF — geciken bakım tamamlanana kadar otomatik / yarı otomatik büküm başlatılamaz. Manuel mod ve tahliye kullanılabilir.')}
          </div>
        ) : top.lockSoon && (
          <div className={styles.lockNote}>
            {t('3 haftadan uzun süredir yapılmayan bakım var — bakım kilidi yakında devreye girecek.')}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={() => answer('DISMISSED')}>
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
