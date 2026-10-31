// BAKIM MODU HATIRLATMASI (bakım kuralları, 2026-11-01) — AppLayout'ta her zaman bağlı.
//
// 1) Hatırlatma penceresi: bakım modu DataApi'deki "hatırlatma süresi" kadar açık kaldığında
//    (reminderActive veya reminderDueAt geçti) tam ekranın üstünde açılır:
//      "BAKIM MODU {süre} DİR AÇIK — DEVAM EDİYOR MUSUNUZ?" + otomatik kapanmaya (autoCloseAt) geri sayım
//      DEVAM ET    → POST /api/maintenance/continue (hatırlatma süresi yeniden başlar)
//      BAKIMI BİTİR → POST /api/maintenance/mode?on=false
//    Cevap verilmezse modu BACKEND kapatır (her istekte + 30 sn'lik arka plan servisi); UI sadece görür.
//    Pencere açıkken maintenanceStore 5 sn'de bir yeniler; geri sayım bitince bir kez hemen yeniler.
// 2) "BAKIM MODU OTOMATİK KAPATILDI" bilgisi: lastAutoClosedAt yeni bir değere geçince bir kez
//    gösterilir (TAMAM → aynı kapanma bir daha gösterilmez; maintenanceStore.autoClosedNotice).
// Makineye hareket komutu göndermez.

import { useEffect, useRef, useState } from 'react'
import { useNowTick } from '@/hooks/useMaintenance'
import {
  continueMaintenanceMode,
  dismissMaintenanceAutoClosedNotice,
  isMaintenanceReminderActive,
  maintenanceErrorMessage,
  parseIsoMs,
  refreshMaintenance,
  setMaintenanceModeOn,
  useMaintenanceStore,
} from '@/stores/maintenanceStore'
import { useLang, useT, type TVars } from '@/i18n'
import styles from './MaintenanceReminderOverlay.module.css'

type T = (source: string, vars?: TVars) => string

/** Açık kalma süresi — "2 SAAT 05 DK" / "45 DK" */
function formatOpenDuration(ms: number, t: T): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return t('{m} DK', { m })
  return t('{h} SAAT {m} DK', { h, m: String(m).padStart(2, '0') })
}

/** Geri sayım — dd:ss */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function MaintenanceReminderOverlay() {
  const state = useMaintenanceStore((s) => s.state)
  const notice = useMaintenanceStore((s) => s.autoClosedNotice)
  const now = useNowTick(state?.isInMaintenanceMode === true)
  const reminder = isMaintenanceReminderActive(state, now)

  if (reminder && state) return <ReminderDialog now={now} />
  if (notice) return <AutoClosedDialog at={notice} />
  return null
}

function ReminderDialog({ now }: { now: number }) {
  const t = useT()
  const state = useMaintenanceStore((s) => s.state)
  const sinceMs = useMaintenanceStore((s) => s.modeSinceMs)
  const [pending, setPending] = useState<'continue' | 'finish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const expiredRefreshed = useRef<string | null>(null)

  const autoCloseMs = parseIsoMs(state?.autoCloseAt)
  const remainingMs = autoCloseMs != null ? autoCloseMs - now : null
  const expired = remainingMs != null && remainingMs <= 0
  const openFor = sinceMs != null
    ? formatOpenDuration(now - sinceMs, t)
    : formatOpenDuration((state?.elapsedMinutes ?? 0) * 60_000, t)

  // Geri sayım bitti → backend kapatmış olmalı; 5 sn beklemeden bir kez hemen yenile
  useEffect(() => {
    const key = state?.autoCloseAt ?? null
    if (!expired || !key || expiredRefreshed.current === key) return
    expiredRefreshed.current = key
    const id = setTimeout(() => void refreshMaintenance(), 1500)
    return () => clearTimeout(id)
  }, [expired, state?.autoCloseAt])

  const run = async (kind: 'continue' | 'finish') => {
    if (pending) return
    setPending(kind)
    setError(null)
    try {
      if (kind === 'continue') await continueMaintenanceMode()
      else await setMaintenanceModeOn(false)
    } catch (err) {
      setError(maintenanceErrorMessage(err) || t('bilinmeyen hata'))
      // 409 (mod zaten kapanmış) vb. — güncel durumu al
      void refreshMaintenance()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="maint-reminder-title">
      <div className={`${styles.card} ${styles.cardReminder}`}>
        <div className={styles.kicker}>{t('BAKIM MODU HATIRLATMASI')}</div>
        <div id="maint-reminder-title" className={styles.title}>
          {t('BAKIM MODU {duration} DİR AÇIK — DEVAM EDİYOR MUSUNUZ?', { duration: openFor })}
        </div>
        <div className={styles.subtitle}>
          {t('Cevap verilmezse bakım modu otomatik olarak kapatılacak.')}
        </div>

        <div className={styles.countdownBox} data-urgent={remainingMs != null && remainingMs < 60_000 ? true : undefined}>
          <span className={styles.countdownLabel}>
            {expired ? t('OTOMATİK KAPATILIYOR…') : t('OTOMATİK KAPANMAYA KALAN')}
          </span>
          <span className={styles.countdownValue}>
            {remainingMs != null ? formatCountdown(remainingMs) : '—'}
          </span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.finishBtn}
            disabled={pending !== null}
            onClick={() => void run('finish')}
          >
            {pending === 'finish' ? t('İŞLENİYOR…') : t('BAKIMI BİTİR')}
          </button>
          <button
            type="button"
            className={styles.continueBtn}
            disabled={pending !== null || expired}
            onClick={() => void run('continue')}
          >
            {pending === 'continue' ? t('İŞLENİYOR…') : t('DEVAM ET')}
          </button>
        </div>
      </div>
    </div>
  )
}

function AutoClosedDialog({ at }: { at: string }) {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const ms = parseIsoMs(at)
  const when = ms != null
    ? new Date(ms).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—'
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="maint-autoclosed-title">
      <div className={`${styles.card} ${styles.cardInfo}`}>
        <div className={styles.kicker}>{t('BİLGİ')}</div>
        <div id="maint-autoclosed-title" className={styles.title}>{t('BAKIM MODU OTOMATİK KAPATILDI')}</div>
        <div className={styles.subtitle}>
          {t('Hatırlatmaya süresi içinde cevap verilmediği için bakım modu {time} itibarıyla kapatıldı. Bakım sürüyorsa bakım modunu yeniden açın.', { time: when })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.continueBtn} onClick={dismissMaintenanceAutoClosedNotice}>
            {t('TAMAM')}
          </button>
        </div>
      </div>
    </div>
  )
}
