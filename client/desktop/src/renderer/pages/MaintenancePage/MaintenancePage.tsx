// SEKIL: Ayarlar > Bakım Süresi (PDF s.8-12)
// 5 periyot kartı (Günlük/Haftalık/Aylık/6 Aylık/12 Aylık) — her biri son yapılma tarihi ve
// sonraki tarih gösterir; "Bakım tamamlandı" butonuyla now'a set edilir.
// Ayrıca "Bakım Modu" (IsInMaintenanceMode) toggle — servis öncesi/sonrası aç/kapa.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MAINTENANCE_PERIODS,
  type MaintenancePeriodInfo,
  type MaintenanceState,
} from '@shared/types'
import { useLang, useT, type TVars } from '@/i18n'
import styles from './MaintenancePage.module.css'

/** Bakım durumu için renk/etiket kodu — sarı: 7 gün kala, kırmızı: geciken. */
type Severity = 'ok' | 'warn' | 'overdue' | 'unknown'

interface PeriodStatus {
  info: MaintenancePeriodInfo
  lastAt: string | null
  nextAt: Date | null
  daysUntilNext: number | null
  severity: Severity
}

function computeStatus(info: MaintenancePeriodInfo, state: MaintenanceState): PeriodStatus {
  const lastAt = pickLastAt(info.key, state)
  if (!lastAt) {
    return { info, lastAt: null, nextAt: null, daysUntilNext: null, severity: 'unknown' }
  }
  const nextAt = new Date(new Date(lastAt).getTime() + info.intervalDays * 86_400_000)
  const daysUntilNext = Math.floor((nextAt.getTime() - Date.now()) / 86_400_000)
  let severity: Severity = 'ok'
  if (daysUntilNext < 0) severity = 'overdue'
  else if (daysUntilNext <= Math.min(7, info.intervalDays / 4)) severity = 'warn'
  return { info, lastAt, nextAt, daysUntilNext, severity }
}

function pickLastAt(key: MaintenancePeriodInfo['key'], state: MaintenanceState): string | null {
  switch (key) {
    case 'daily':          return state.lastDailyAt
    case 'weekly':         return state.lastWeeklyAt
    case 'monthly':        return state.lastMonthlyAt
    case 'six-monthly':    return state.last6MonthlyAt
    case 'twelve-monthly': return state.last12MonthlyAt
  }
}

function formatDateShort(iso: string | Date | null, locale: string): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function severityLabel(
  s: Severity,
  daysUntilNext: number | null,
  t: (source: string, vars?: TVars) => string,
): string {
  if (s === 'unknown') return t('HİÇ YAPILMADI')
  if (s === 'overdue') return t('{n} GÜN GECİKME', { n: Math.abs(daysUntilNext ?? 0) })
  if (s === 'warn') return t('{n} GÜN KALDI', { n: String(daysUntilNext) })
  return t('{n} GÜN KALDI', { n: String(daysUntilNext) })
}

export default function MaintenancePage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [state, setState] = useState<MaintenanceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)  // hangi buton işleniyor

  useEffect(() => {
    let cancelled = false
    window.corventa.settings
      .getMaintenance()
      .then((data) => { if (!cancelled) setState(data) })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? t('Bakım durumu alınamadı'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleMarkCompleted = async (info: MaintenancePeriodInfo) => {
    if (pendingKey) return
    setPendingKey(info.key)
    try {
      const updated = await window.corventa.settings.markMaintenanceCompleted(info.key)
      setState(updated)
    } catch (err) {
      alert(t('Bakım işaretlenemedi: {err}', { err: (err as Error)?.message ?? t('bilinmeyen hata') }))
    } finally {
      setPendingKey(null)
    }
  }

  const handleToggleMode = async () => {
    if (!state || pendingKey) return
    setPendingKey('mode')
    try {
      const updated = await window.corventa.settings.setMaintenanceMode(!state.isInMaintenanceMode)
      setState(updated)
    } catch (err) {
      alert(t('Bakım modu değiştirilemedi: {err}', { err: (err as Error)?.message ?? t('bilinmeyen hata') }))
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          ←
        </button>
        <h1 className={styles.title}>{t('BAKIM SÜRESİ')}</h1>
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.stateMsg}>{t('Yükleniyor…')}</div>}

        {error && !loading && (
          <div className={`${styles.stateMsg} ${styles.errorMsg}`}>
            {t('Hata: {err}', { err: error })}
          </div>
        )}

        {state && !loading && (
          <>
            {/* ── Bakım Modu toggle ─────────────────── */}
            <div className={`${styles.card} ${styles.modeCard} ${state.isInMaintenanceMode ? styles.modeOn : ''}`}>
              <div className={styles.modeInfo}>
                <span className={styles.modeLabel}>{t('BAKIM MODU')}</span>
                <span className={styles.modeValue}>
                  {state.isInMaintenanceMode ? t('AÇIK') : t('KAPALI')}
                </span>
                <span className={styles.modeHint}>
                  {state.isInMaintenanceMode
                    ? t('Servis/bakım devam ediyor — yeni büküm işi başlatılamaz.')
                    : t('Makine normal üretim modunda.')}
                </span>
              </div>
              <button
                className={`${styles.modeBtn} ${state.isInMaintenanceMode ? styles.modeBtnOff : styles.modeBtnOn}`}
                onClick={handleToggleMode}
                disabled={pendingKey !== null}
              >
                {state.isInMaintenanceMode ? t('KAPAT') : t('AÇ')}
              </button>
            </div>

            {/* ── 5 periyot kartı ────────────────────── */}
            <div className={styles.periodGrid}>
              {MAINTENANCE_PERIODS.map((p) => {
                const st = computeStatus(p, state)
                return (
                  <div
                    key={p.key}
                    className={`${styles.periodCard} ${styles[`sev_${st.severity}`] ?? ''}`}
                  >
                    <div className={styles.periodHeader}>
                      <span className={styles.periodLabel}>{t(p.label)}</span>
                      <span className={styles.periodInterval}>{t('her {n} gün', { n: p.intervalDays })}</span>
                    </div>

                    <div className={styles.periodStatus}>
                      <span className={styles.periodStatusLabel}>{t('DURUM')}</span>
                      <span className={styles.periodStatusValue}>
                        {severityLabel(st.severity, st.daysUntilNext, t)}
                      </span>
                    </div>

                    <div className={styles.periodDates}>
                      <div className={styles.periodDateRow}>
                        <span>{t('SON YAPILDI:')}</span>
                        <b>{formatDateShort(st.lastAt, locale)}</b>
                      </div>
                      <div className={styles.periodDateRow}>
                        <span>{t('SONRAKİ:')}</span>
                        <b>{formatDateShort(st.nextAt, locale)}</b>
                      </div>
                    </div>

                    <button
                      className={styles.markBtn}
                      onClick={() => handleMarkCompleted(p)}
                      disabled={pendingKey !== null}
                    >
                      {pendingKey === p.key ? t('İŞARETLENİYOR…') : `✓ ${t('BAKIM YAPILDI')}`}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── Bilgi notu ────────────────────────── */}
            <p className={styles.note}>
              {t('Bakımlar 24 saat önce ekranda ve mail ile bildirilir. Geciken bakımlar kırmızı, yaklaşanlar sarı işaretlenir.')}
              {' '}{t('Servis işlemi öncesi/sonrası')} <b>{t('Bakım Modu')}</b>{t("'nu açık tutun — modda iken yeni büküm işi başlatılamaz. (PDF s.8-12)")}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
