// BAKIM MODU EKRANI (UI madde 19) — DataApi'de IsInMaintenanceMode açıkken üst alanda gösterilir.
// Açık (varsayılan): üst alanın tamamı — bakım modunda geçen süre, 5 periyot ve "BAKIM TAMAMLANDI"
//   butonları (POST /api/maintenance/mark-completed), "BAKIM MODUNDAN ÇIK" (POST /api/maintenance/mode?on=false).
// Küçültülmüş: sadece ince "BAKIM MODU AKTİF" şeridi; altındaki normal sayfalar AppLayout'ta render edilir.
// Sayfalar (Outlet) bu bileşenin İÇİNDE DEĞİL — AppLayout'ta hep aynı ağaç konumunda kalır ve tam boy
// görünümde sadece gizlenir; böylece mod açılıp/kapanınca açık sayfa sıfırlanmaz (form/yerel state kaybolmaz).
// Küçültme durumu maintenanceStore'da (screenCollapsed) — bileşen yeniden açılınca sıfırlanmaz.
// Durum maintenanceStore'dan gelir (30 sn'de bir yenilenir). Sadece görünür uyarı — büküm başlatmayı,
// hiçbir hareketi engellemez, makineye komut göndermez.
// BAKIM KURALLARI (2026-11-01): geçen süre DataApi modeStartedAt'ten; her periyodun minimum bakım süresi
// gösterilir — dolmadan "BAKIM TAMAMLANDI" soluk + "{n} DK SONRA" (basılırsa backend 409 mesajı gösterilir).
// Hatırlatma penceresi (DEVAM EDİYOR MUSUNUZ?) ayrı bileşen: MaintenanceReminderOverlay.

import { useEffect, useState } from 'react'
import { MAINTENANCE_PERIODS, type MaintenancePeriodInfo } from '@shared/types'
import { useMaintenanceModeTiming, useMaintenanceStatuses, useNowTick } from '@/hooks/useMaintenance'
import {
  maintenanceErrorMessage,
  markMaintenancePeriodCompleted,
  parseIsoMs,
  setMaintenanceModeOn,
  setMaintenanceScreenCollapsed,
  useMaintenanceStore,
} from '@/stores/maintenanceStore'
import type { MaintenancePeriodStatus } from '@/services/maintenanceStatus'
import { useLang, useT, type TVars } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
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
  const reminderDueAt = useMaintenanceStore((s) => s.state?.reminderDueAt ?? null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  // İşaretleme sonucu / backend 409 mesajı — ekranda satır olarak (alert yerine)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Süre sayacı — saniyede bir
  const now = useNowTick(true)
  const timing = useMaintenanceModeTiming(now)

  // Bilgi satırı birkaç saniye sonra kendiliğinden kaybolur
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 8000)
    return () => clearTimeout(id)
  }, [notice])

  const elapsed = sinceMs != null ? `${sinceApprox ? '≈ ' : ''}${formatElapsed(now - sinceMs, t)}` : '—'
  const reminderMs = parseIsoMs(reminderDueAt)
  const reminderAt = reminderMs != null
    ? new Date(reminderMs).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null

  const handleMark = async (info: MaintenancePeriodInfo) => {
    if (pendingKey) return
    setPendingKey(info.key)
    setNotice(null)
    try {
      await markMaintenancePeriodCompleted(info.key)
      setNotice({ kind: 'ok', text: t('{period} BAKIM TAMAMLANDI OLARAK KAYDEDİLDİ', { period: t(info.label).toLocaleUpperCase(locale) }) })
    } catch (err) {
      // 409: minimum süre dolmadı / mod kapalı — backend mesajı aynen gösterilir
      setNotice({ kind: 'err', text: t('Bakım işaretlenemedi: {err}', { err: maintenanceErrorMessage(err) || t('bilinmeyen hata') }) })
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
        <span className={styles.stripIcon}><Icon name="maintenance" size="lg" /></span>
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
          <span className={styles.title}><IconLabel icon="maintenance">{t('BAKIM MODU AKTİF')}</IconLabel></span>
          <span className={styles.hint}>{t('Bakım modunda geçen süre "BAKIM" kullanım süresine yazılır.')}</span>
        </div>
        <div className={styles.elapsedBox}>
          <span className={styles.elapsedLabel}>{t('BAKIM MODUNDA GEÇEN SÜRE')}</span>
          <span className={styles.elapsedValue}>{elapsed}</span>
          {reminderAt && (
            <span className={styles.elapsedSub}>{t('HATIRLATMA: {time}', { time: reminderAt })}</span>
          )}
        </div>
      </div>

      {notice && (
        <div className={styles.notice} data-kind={notice.kind}>
          {notice.text}
        </div>
      )}

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
              minMinutes={timing.minMinutes(p.key)}
              remainingMinutes={timing.remainingMinutes(p.key)}
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
  info, st, locale, pending, disabled, minMinutes, remainingMinutes, onMark,
}: {
  info: MaintenancePeriodInfo
  st: MaintenancePeriodStatus | undefined
  locale: string
  pending: boolean
  disabled: boolean
  /** Periyodun minimum bakım süresi (dk) — kural yoksa null */
  minMinutes: number | null
  /** "Tamamlandı" için kalan dakika (0 = hazır) — kural yoksa null */
  remainingMinutes: number | null
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
  const waiting = remainingMinutes != null && remainingMinutes > 0
  const last = st?.lastAt
    ? new Date(st.lastAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  return (
    <div className={`${styles.row} ${cls ?? ''}`}>
      <span className={styles.rowLabel}>{t(info.label)}</span>
      <span className={styles.rowLast}>
        <span>{t('SON YAPILDI:')} <b>{last}</b></span>
        {minMinutes != null && (
          <span>{t('MİN. BAKIM SÜRESİ:')} <b>{t('{n} DK', { n: minMinutes })}</b></span>
        )}
      </span>
      <span className={styles.rowStatus}>{status}</span>
      {/* Min süre dolmadan soluk ama basılabilir — basılırsa backend 409 mesajı satırda görünür */}
      <button
        type="button"
        className={`${styles.markBtn} ${waiting ? styles.markBtnWaiting : ''}`}
        onClick={onMark}
        disabled={disabled}
      >
        {pending
          ? t('İŞARETLENİYOR…')
          : waiting
            ? t('{n} DK SONRA', { n: remainingMinutes! })
            : <IconLabel icon="check">{t('BAKIM TAMAMLANDI')}</IconLabel>}
      </button>
    </div>
  )
}
