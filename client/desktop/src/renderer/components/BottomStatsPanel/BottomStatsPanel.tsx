// 2026-09-22: alt panel yeniden düzenlendi.
//   Üst şerit: aktif uyarı metnini (varsa) gösterir + sağ tarafta "Hata Kayıtları" butonu.
//   Alt kısım: mevcut OilStatsList (kartlar biraz küçültüldü).
//   Şerit rengi durum bazlı: normal (gri), uyarı (sarı), hata (kırmızı).
//   Uyarı kaynağı: şimdilik yaşam-döngüsü sensör state'inden türetilir; ileride
//   MachineEvent SignalR pipeline'ına bağlanacak (backend'e dokunulmadı).

import { useMemo, useState } from 'react'
import OilStatsList from '@/pages/DashboardPage/OilStatsList'
import ErrorLogsModal from './ErrorLogsModal'
import ArcBendingStrip from './ArcBendingStrip'
import { BendingMethod } from '@shared/types'
import { useBendingProgress, useSafety, useSensors } from '@/hooks/useMachineState'
import { useBendingActive, useBendingActivityStore } from '@/stores/bendingActivityStore'
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
      return { level: 'error', text: 'ACİL DURDURMA BASILI — MAKİNE KİLİTLİ' }
    }
    if (!safety.motorThermalOK) {
      return { level: 'error', text: 'MOTOR TERMAL KORUMA AKTİF' }
    }
    if (!safety.fanThermalOK) {
      return { level: 'error', text: 'FAN TERMAL KORUMA AKTİF' }
    }
    if (sensors.oilTempC >= 75) {
      return { level: 'error', text: `YAĞ SICAKLIĞI YÜKSEK (${sensors.oilTempC}°C)` }
    }
    if (sensors.s1PressureBar === 0) {
      return { level: 'warning', text: 'YAĞ BASINCI OKUMASI YOK' }
    }
    if (sensors.oilLevelPercent < 30) {
      return { level: 'warning', text: `YAĞ SEVİYESİ DÜŞÜK (%${sensors.oilLevelPercent})` }
    }
    if (sensors.oilHumidityPercent >= 50) {
      return { level: 'warning', text: `YAĞ NEMİ YÜKSEK (%${sensors.oilHumidityPercent})` }
    }
    return { level: 'none', text: '' }
  }, [safety, sensors])

  const stripeClass = [
    styles.stripe,
    warning.level === 'warning' ? styles.hasWarning : '',
    warning.level === 'error' ? styles.hasError : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.panel}>
      {/* ── Üst uyarı şeridi ───────────────────────── */}
      <div className={stripeClass}>
        <div className={styles.warnArea}>
          {warning.level === 'none' ? (
            <span className={styles.noWarn}>SİSTEM NORMAL — AKTİF UYARI YOK</span>
          ) : (
            <>
              <span className={styles.warnIcon}>
                {warning.level === 'error' ? '⛔' : '⚠'}
              </span>
              <span className={styles.warnText}>{warning.text}</span>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.logsBtn}
          onClick={() => setShowLogs(true)}
          aria-label="Hata kayıtlarını aç"
        >
          <span className={styles.logsIcon}>📋</span>
          HATA KAYITLARI
        </button>
      </div>

      {/* ── Alt: sensör kartları / Arc büküm sırasında parça şeridi ── */}
      {arcJob ? <ArcBendingStrip job={arcJob} progress={arcProgress} /> : <OilStatsList />}

      {/* ── Hata kayıtları modalı ──────────────────── */}
      {showLogs && <ErrorLogsModal onClose={() => setShowLogs(false)} />}
    </div>
  )
}
