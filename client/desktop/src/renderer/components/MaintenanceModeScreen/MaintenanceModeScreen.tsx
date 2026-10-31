// BAKIM MODU EKRANI (UI madde 19) — DataApi'de IsInMaintenanceMode açıkken üst alanda gösterilir.
// Açık (varsayılan): üst alanın tamamı — bakım modunda geçen süre, 5 periyot ve "BAKIM TAMAMLANDI"
//   butonları (POST /api/maintenance/mark-completed), "BAKIM MODUNDAN ÇIK" (POST /api/maintenance/mode?on=false).
// Küçültülmüş: sadece ince "BAKIM MODU AKTİF" şeridi; altındaki normal sayfalar AppLayout'ta render edilir.
// Sayfalar (Outlet) bu bileşenin İÇİNDE DEĞİL — AppLayout'ta hep aynı ağaç konumunda kalır ve tam boy
// görünümde sadece gizlenir; böylece mod açılıp/kapanınca açık sayfa sıfırlanmaz (form/yerel state kaybolmaz).
// Küçültme durumu maintenanceStore'da (screenCollapsed) — bileşen yeniden açılınca sıfırlanmaz.
// Durum maintenanceStore'dan gelir (30 sn'de bir yenilenir). Sadece görünür uyarı — büküm başlatmayı,
// hiçbir hareketi engellemez, makineye komut göndermez.

import { useEffect, useState } from 'react'
import { MAINTENANCE_PERIODS, type MaintenancePeriodInfo } from '@shared/types'
import { useMaintenanceStatuses } from '@/hooks/useMaintenance'
import {
  markMaintenancePeriodCompleted,
  setMaintenanceModeOn,
  setMaintenanceScreenCollapsed,
  useMaintenanceStore,
} from '@/stores/maintenanceStore'
import type { MaintenancePeriodStatus } from '@/services/maintenanceStatus'
import { useLang, useT, type TVars } from '@/i18n'
import styles from './MaintenanceModeScreen.module.css'

/** Geçen süre — sa:dk:sn (24 saati aşarsa "2 GÜN 03:15:00") */
function formatElapsed(ms: number, t: (source: string, vars?: TVars) => string): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(total / 86_400)
  const h = Math.floor((total % 86_400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`
  return d > 0 ? t('{d} GÜN {hms}', { d, hms }) : hms
}

export default function MaintenanceModeScreen() {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const sinceMs = useMaintenanceStore((s) => s.modeSinceMs)
  const sinceApprox = useMaintenanceStore((s) => s.modeSinceApprox)
  const statuses = useMaintenanceStatuses()
  const collapsed = useMaintenanceStore((s) => s.screenCollapsed)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Süre sayacı — saniyede bir
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = sinceMs != null ? `${sinceApprox ? '≈ ' : ''}${formatElapsed(now - sinceMs, t)}` : '—'

  const handleMark = async (info: MaintenancePeriodInfo) => {
    if (pendingKey) return
    setPendingKey(info.key)
    try {
      await markMaintenancePeriodCompleted(info.key)
    } catch (err) {
      alert(t('Bakım işaretlenemedi: {err}', { err: (err as Error)?.message ?? t('bilinmeyen hata') }))
    } finally {
      setPendingKey(null)
    }
  }

  const handleExit = async () => {
    if (pendingKey) return
    setPendingKey('mode')
    try {
      await setMaintenanceModeOn(false)
    } catch (err) {
      alert(t('Bakım modu değiştirilemedi: {err}', { err: (err as Error)?.message ?? t('bilinmeyen hata') }))
    } finally {
      setPendingKey(null)
    }
  }

  const exitBtn = (
    <button type="button" className={styles.exitBtn} onClick={handleExit} disabled={pendingKey !== null}>
      {pendingKey === 'mode' ? t('İŞLENİYOR…') : t('BAKIM MODUNDAN ÇIK')}
    </button>
  )

  if (collapsed) {
    return (
      <div className={styles.strip}>
        <span className={styles.stripIcon}>🔧</span>
        <span className={styles.stripTitle}>{t('BAKIM MODU AKTİF')}</span>
        <span className={styles.stripElapsed}>{elapsed}</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.expandBtn} onClick={() => setMaintenanceScreenCollapsed(false)}>
          {t('DETAY')}
        </button>
        {exitBtn}
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headInfo}>
          <span className={styles.title}>🔧 {t('BAKIM MODU AKTİF')}</span>
          <span className={styles.hint}>{t('Bakım modunda geçen süre "BAKIM" kullanım süresine yazılır.')}</span>
        </div>
        <div className={styles.elapsedBox}>
          <span className={styles.elapsedLabel}>{t('BAKIM MODUNDA GEÇEN SÜRE')}</span>
          <span className={styles.elapsedValue}>{elapsed}</span>
        </div>
      </div>

      <div className={styles.periodList}>
        {MAINTENANCE_PERIODS.map((p) => {
          const st = statuses.find((s) => s.info.key === p.key)
          return (
            <PeriodRow
              key={p.key}
              info={p}
              st={st}
              locale={locale}
              pending={pendingKey === p.key}
              disabled={pendingKey !== null}
              onMark={() => handleMark(p)}
            />
          )
        })}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.collapseBtn} onClick={() => setMaintenanceScreenCollapsed(true)}>
          {t('KÜÇÜLT — SAYFALARA DÖN')}
        </button>
        {exitBtn}
      </div>
    </div>
  )
}

function PeriodRow({
  info, st, locale, pending, disabled, onMark,
}: {
  info: MaintenancePeriodInfo
  st: MaintenancePeriodStatus | undefined
  locale: string
  pending: boolean
  disabled: boolean
  onMark: () => void
}) {
  const t = useT()
  let status = t('HİÇ YAPILMADI')
  let cls = styles.rowUnknown
  if (st?.tier) {
    status = t('{n} GÜN GECİKME', { n: st.overdueDays ?? 0 })
    cls = styles[`tier_${st.tier}`]
  } else if (st && st.daysUntilNext != null) {
    status = t('{n} GÜN KALDI', { n: String(st.daysUntilNext) })
    cls = st.severity === 'warn' ? styles.rowWarn : styles.rowOk
  }
  const last = st?.lastAt
    ? new Date(st.lastAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  return (
    <div className={`${styles.row} ${cls ?? ''}`}>
      <span className={styles.rowLabel}>{t(info.label)}</span>
      <span className={styles.rowLast}>{t('SON YAPILDI:')} <b>{last}</b></span>
      <span className={styles.rowStatus}>{status}</span>
      <button type="button" className={styles.markBtn} onClick={onMark} disabled={disabled}>
        {pending ? t('İŞARETLENİYOR…') : `✓ ${t('BAKIM TAMAMLANDI')}`}
      </button>
    </div>
  )
}
