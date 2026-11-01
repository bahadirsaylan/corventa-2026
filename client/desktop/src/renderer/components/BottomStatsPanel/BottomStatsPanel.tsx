// 2026-09-22: alt panel yeniden düzenlendi.
//   Üst şerit: aktif uyarı metnini (varsa) gösterir + sağ tarafta "Hata Kayıtları" butonu.
//   Alt kısım: mevcut OilStatsList (kartlar biraz küçültüldü).
//   Şerit rengi durum bazlı: normal (gri), uyarı (sarı), hata (kırmızı).
//   Uyarı kaynağı: şimdilik yaşam-döngüsü sensör state'inden türetilir; ileride
//   MachineEvent SignalR pipeline'ına bağlanacak (backend'e dokunulmadı).
// UI madde 19: bakım uyarısı — vadesi geçen en yüksek kademeli bakım periyodu şeritte renkli gösterilir
//   (1. hafta yeşil, 2. hafta sarı, 3. hafta+ kırmızı; kural services/maintenanceStatus.ts).
//   Makine uyarısı yoksa şeridin tamamı bakım uyarısıdır; makine uyarısı varsa o önde kalır ve bakım
//   uyarısı sağda küçük bir rozet olarak görünür. Dokununca Bakım Süresi sayfası (/settings/maintenance).
// EXCEL 27: güvenlik uyarıları (encoder durması, açılış / büküm başı yağ sıcaklığı ve sensör kontrolü)
//   backend MachineEvent'lerinden (stores/safetyAlertsStore.ts) şeride gelir; termal / acil stop uyarılarından
//   sonra, yağ basınç/seviye/nem uyarılarından önce. Operatör şeritteki KAPAT ile gizler. Sadece uyarı.
// EXCEL 34: BAKIM KİLİDİ aktifken (backend lockActive) bakım şeridi / rozeti kilit simgesiyle "KİLİTLİ" yazar.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OilStatsList from '@/pages/DashboardPage/OilStatsList'
import ErrorLogsModal from './ErrorLogsModal'
import ArcBendingStrip from './ArcBendingStrip'
import { BendingMethod } from '@shared/types'
import { useBendingProgress, useSafety, useSensors } from '@/hooks/useMachineState'
import { useBendingActive, useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useMaintenanceAlerts, useMaintenanceLock } from '@/hooks/useMaintenance'
import {
  checkAlertText,
  selectLatestStall,
  stallAlertText,
  useSafetyAlertsStore,
} from '@/stores/safetyAlertsStore'
import { maintenanceTierTitle, type MaintenancePeriodStatus } from '@/services/maintenanceStatus'
import { useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import styles from './BottomStatsPanel.module.css'

type WarningLevel = 'none' | 'warning' | 'error'

interface ActiveWarning {
  level: WarningLevel
  text: string
  /** Güvenlik uyarısı ise şeritte KAPAT düğmesi (EXCEL 27) */
  onDismiss?: () => void
}

export default function BottomStatsPanel() {
  const [showLogs, setShowLogs] = useState(false)
  const sensors = useSensors()
  const safety = useSafety()
  const t = useT()
  const navigate = useNavigate()
  const { top: maint } = useMaintenanceAlerts()
  const { active: maintLocked } = useMaintenanceLock()
  const safetyCheck = useSafetyAlertsStore((s) => s.check)
  const safetyStalls = useSafetyAlertsStore((s) => s.stalls)
  const dismissCheck = useSafetyAlertsStore((s) => s.dismissCheck)
  const dismissStall = useSafetyAlertsStore((s) => s.dismissStall)

  //   Çok açılı (Arc) büküm sürerken sensör kartlarının yerine parça şeridi gösterilir.
  //   Uyarı şeridi ve Hata Kayıtları her durumda yerinde kalır (alarmlar görünür olmalı).
  const bendingActive = useBendingActive()
  const runningJob = useBendingActivityStore((s) => s.runningJob)
  const runningJobId = useBendingActivityStore((s) => s.runningJobId)
  const rawProgress = useBendingProgress()
  const arcJob =
    bendingActive && runningJob && runningJob.method === BendingMethod.Arc && (runningJob.segments?.length ?? 0) > 0
      ? runningJob
      : null
  const arcProgress = rawProgress && rawProgress.jobId === runningJobId ? rawProgress : null

  //   Aktif uyarı: sensor/safety state'inden ilk kritik durumu bul.
  //   Öncelik: acil stop > termal > yağ basınç > yağ sıcaklık > yağ seviye > yağ nemi.
  const warning: ActiveWarning = useMemo(() => {
    if (!safety.emergencyStopOK) {
      return { level: 'error', text: t('ACİL DURDURMA BASILI — MAKİNE KİLİTLİ') }
    }
    if (!safety.motorThermalOK) {
      return { level: 'error', text: t('MOTOR TERMAL KORUMA AKTİF') }
    }
    if (!safety.fanThermalOK) {
      return { level: 'error', text: t('FAN TERMAL KORUMA AKTİF') }
    }
    if (sensors.oilTempC >= 75) {
      return { level: 'error', text: t('YAĞ SICAKLIĞI YÜKSEK ({v}°C)', { v: sensors.oilTempC }) }
    }
    // EXCEL 27 — backend güvenlik uyarıları (engel > encoder durması > sıcaklık/sensör uyarısı)
    if (safetyCheck?.level === 'error') {
      return { level: 'error', text: checkAlertText(safetyCheck, t), onDismiss: dismissCheck }
    }
    const stall = selectLatestStall(safetyStalls)
    if (stall) {
      return { level: 'warning', text: stallAlertText(stall, t), onDismiss: () => dismissStall(stall.payload.axis) }
    }
    if (safetyCheck) {
      const text = checkAlertText(safetyCheck, t)
      if (text) return { level: 'warning', text, onDismiss: dismissCheck }
    }
    if (sensors.s1PressureBar === 0) {
      return { level: 'warning', text: t('YAĞ BASINCI OKUMASI YOK') }
    }
    if (sensors.oilLevelPercent < 30) {
      return { level: 'warning', text: t('YAĞ SEVİYESİ DÜŞÜK (%{v})', { v: sensors.oilLevelPercent }) }
    }
    if (sensors.oilHumidityPercent >= 50) {
      return { level: 'warning', text: t('YAĞ NEMİ YÜKSEK (%{v})', { v: sensors.oilHumidityPercent }) }
    }
    return { level: 'none', text: '' }
  }, [safety, sensors, t, safetyCheck, safetyStalls, dismissCheck, dismissStall])

  const stripeClass = [
    styles.stripe,
    warning.level === 'warning' ? styles.hasWarning : '',
    warning.level === 'error' ? styles.hasError : '',
  ].filter(Boolean).join(' ')

  const maintClass = maint ? styles[`maint_${maint.tier}`] : ''
  const maintText = maint ? maintenanceAlertText(maint, t, maintLocked) : ''
  const openMaintenance = () => navigate('/settings/maintenance')

  return (
    <div className={styles.panel}>
      {/* ── Üst uyarı şeridi ───────────────────────── */}
      <div className={warning.level === 'none' && maint ? `${styles.stripe} ${maintClass}` : stripeClass}>
        <div className={styles.warnArea}>
          {warning.level === 'none' && maint ? (
            // Makine uyarısı yok → şerit bakım uyarısı (dokununca Bakım Süresi sayfası)
            <button type="button" className={styles.maintArea} onClick={openMaintenance}>
              <span className={styles.warnIcon}><Icon name={maintLocked ? 'lock' : 'maintenance'} size="md" /></span>
              <span className={styles.warnText}>{maintText}</span>
            </button>
          ) : warning.level === 'none' ? (
            <span className={styles.noWarn}>{t('SİSTEM NORMAL — AKTİF UYARI YOK')}</span>
          ) : (
            <>
              <span className={styles.warnIcon}>
                <Icon name={warning.level === 'error' ? 'blocked' : 'warning'} size="md" />
              </span>
              <span className={styles.warnText}>{warning.text}</span>
              {warning.onDismiss && (
                <button
                  type="button"
                  className={styles.dismissBtn}
                  onClick={warning.onDismiss}
                  aria-label={t('Uyarıyı kapat')}
                >
                  <IconLabel icon="close" size="sm">{t('KAPAT')}</IconLabel>
                </button>
              )}
            </>
          )}
        </div>

        {/* Makine uyarısı varken bakım uyarısı küçük rozet olarak kalır */}
        {warning.level !== 'none' && maint && (
          <button
            type="button"
            className={`${styles.maintChip} ${maintClass}`}
            onClick={openMaintenance}
            title={maintText}
          >
            {maintLocked ? (
              <IconLabel icon="lock">{t('BAKIM KİLİTLİ: {n} GÜN GECİKME', { n: maint.overdueDays ?? 0 })}</IconLabel>
            ) : (
              <IconLabel icon="maintenance">{t('BAKIM: {n} GÜN GECİKME', { n: maint.overdueDays ?? 0 })}</IconLabel>
            )}
          </button>
        )}

        <button
          type="button"
          className={styles.logsBtn}
          onClick={() => setShowLogs(true)}
          aria-label={t('Hata kayıtlarını aç')}
        >
          <span className={styles.logsIcon}><Icon name="clipboard" size="sm" /></span>
          {t('HATA KAYITLARI')}
        </button>
      </div>

      {/* ── Alt: sensör kartları / Arc büküm sırasında parça şeridi ── */}
      {arcJob ? <ArcBendingStrip job={arcJob} progress={arcProgress} /> : <OilStatsList />}

      {/* ── Hata kayıtları modalı ──────────────────── */}
      {showLogs && <ErrorLogsModal onClose={() => setShowLogs(false)} />}
    </div>
  )
}

/**
 * Şerit metni: "2. HAFTA — BAKIM UYARISI: HAFTALIK BAKIM 9 GÜN GECİKTİ" (+ 21+ günde kilit notu).
 * locked (backend lockActive, EXCEL 34) → "KİLİTLİ — BÜKÜM BAŞLATILAMAZ".
 */
function maintenanceAlertText(
  m: MaintenancePeriodStatus,
  t: (source: string, vars?: Record<string, string | number>) => string,
  locked = false,
): string {
  const base = t('{tier}: {period} BAKIM {n} GÜN GECİKTİ', {
    tier: t(maintenanceTierTitle(m.tier!)),
    period: t(m.info.label).toLocaleUpperCase(),
    n: m.overdueDays ?? 0,
  })
  if (locked) return `${base} — ${t('KİLİTLİ — BÜKÜM BAŞLATILAMAZ')}`
  return m.lockSoon ? `${base} — ${t('BAKIM KİLİDİ YAKINDA')}` : base
}
