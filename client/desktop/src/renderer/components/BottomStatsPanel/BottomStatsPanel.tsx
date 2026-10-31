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

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OilStatsList from '@/pages/DashboardPage/OilStatsList'
import ErrorLogsModal from './ErrorLogsModal'
import ArcBendingStrip from './ArcBendingStrip'
import { BendingMethod } from '@shared/types'
import { useBendingProgress, useSafety, useSensors } from '@/hooks/useMachineState'
import { useBendingActive, useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useMaintenanceAlerts } from '@/hooks/useMaintenance'
import { maintenanceTierTitle, type MaintenancePeriodStatus } from '@/services/maintenanceStatus'
import { useT } from '@/i18n'
import styles from './BottomStatsPanel.module.css'

type WarningLevel = 'none' | 'warning' | 'error'

interface ActiveWarning {
  level: WarningLevel
  text: string
}

export default function BottomStatsPanel() {
  const [showLogs, setShowLogs] = useState(false)
  const sensors = useSensors()
  const safety = useSafety()
  const t = useT()
  const navigate = useNavigate()
  const { top: maint } = useMaintenanceAlerts()

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
  }, [safety, sensors, t])

  const stripeClass = [
    styles.stripe,
    warning.level === 'warning' ? styles.hasWarning : '',
    warning.level === 'error' ? styles.hasError : '',
  ].filter(Boolean).join(' ')

  const maintClass = maint ? styles[`maint_${maint.tier}`] : ''
  const maintText = maint ? maintenanceAlertText(maint, t) : ''
  const openMaintenance = () => navigate('/settings/maintenance')

  return (
    <div className={styles.panel}>
      {/* ── Üst uyarı şeridi ───────────────────────── */}
      <div className={warning.level === 'none' && maint ? `${styles.stripe} ${maintClass}` : stripeClass}>
        <div className={styles.warnArea}>
          {warning.level === 'none' && maint ? (
            // Makine uyarısı yok → şerit bakım uyarısı (dokununca Bakım Süresi sayfası)
            <button type="button" className={styles.maintArea} onClick={openMaintenance}>
              <span className={styles.warnIcon}>🔧</span>
              <span className={styles.warnText}>{maintText}</span>
            </button>
          ) : warning.level === 'none' ? (
            <span className={styles.noWarn}>{t('SİSTEM NORMAL — AKTİF UYARI YOK')}</span>
          ) : (
            <>
              <span className={styles.warnIcon}>
                {warning.level === 'error' ? '⛔' : '⚠'}
              </span>
              <span className={styles.warnText}>{warning.text}</span>
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
            🔧 {t('BAKIM: {n} GÜN GECİKME', { n: maint.overdueDays ?? 0 })}
          </button>
        )}

        <button
          type="button"
          className={styles.logsBtn}
          onClick={() => setShowLogs(true)}
          aria-label={t('Hata kayıtlarını aç')}
        >
          <span className={styles.logsIcon}>📋</span>
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

/** Şerit metni: "2. HAFTA — BAKIM UYARISI: HAFTALIK BAKIM 9 GÜN GECİKTİ" (+ 21+ günde kilit notu). */
function maintenanceAlertText(
  m: MaintenancePeriodStatus,
  t: (source: string, vars?: Record<string, string | number>) => string,
): string {
  const base = t('{tier}: {period} BAKIM {n} GÜN GECİKTİ', {
    tier: t(maintenanceTierTitle(m.tier!)),
    period: t(m.info.label).toLocaleUpperCase(),
    n: m.overdueDays ?? 0,
  })
  return m.lockSoon ? `${base} — ${t('BAKIM KİLİDİ YAKINDA')}` : base
}
