// Ayarlar > Kıvrım Adetleri Raporu — büküm işi sayıları + tarih bazlı bar chart + metot dağılımı.
// Kaynak: DataApi GET /api/reports/bending-count (window.corventa.usage.getBendingCountReport; demo'da
// DemoMachine büküm geçmişi). Sayılan işler = başlatılmış işler (Running / Completed / Failed / Cancelled /
// Interrupted); işin günü = startedAt ?? createdAt, makinenin yerel saatine göre.
// 7 GÜN / 30 GÜN → günlük çubuk, YIL → son 12 ay aylık çubuk.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BendingCountReport, BendingCountReportQuery } from '@shared/types'
import { useLang, useT, tp } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './BendingCountReportPage.module.css'

type Period = 'week' | 'month' | 'year'

const REFRESH_MS = 60_000

const COLOR_SUCCESS = '#16a34a'
const COLOR_FAIL = '#dc2626'
const COLOR_CANCEL = '#9ca3af'

// BendingMethod 0..3 — etiket t() ile çevrilir
const METHODS: { method: number; label: string; color: string }[] = [
  { method: 0, label: 'TAM DAİRE', color: '#1a6fd4' },
  { method: 1, label: 'ÇOK AÇILI', color: '#dc2626' },
  { method: 2, label: 'SERPANTİN', color: '#16a34a' },
  { method: 3, label: 'SIVAMA', color: '#f59e0b' },
]

const pad = (n: number): string => String(n).padStart(2, '0')
const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Dönem → yerel gün aralığı + gruplama */
function periodQuery(p: Period): BendingCountReportQuery {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === 'year') {
    return { from: dayKey(new Date(today.getFullYear(), today.getMonth() - 11, 1)), to: dayKey(today), groupBy: 'month' }
  }
  const n = p === 'week' ? 7 : 30
  return { from: dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1))), to: dayKey(today), groupBy: 'day' }
}

/** "yyyy-MM-dd" / "yyyy-MM" → yerel Date (UTC kayması olmasın) */
function keyToDate(key: string): Date | null {
  const [y, mo, d] = key.split('-').map(Number)
  if (!y || !mo) return null
  return new Date(y, mo - 1, d || 1)
}

const pctText = (part: number, whole: number): string => {
  if (whole <= 0) return '0'
  const v = (part / whole) * 100
  return v > 0 && v < 10 ? v.toFixed(1) : v.toFixed(0)
}

export default function BendingCountReportPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [period, setPeriod] = useState<Period>('month')
  const [report, setReport] = useState<BendingCountReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const reqSeq = useRef(0)

  const load = useCallback(async (p: Period) => {
    const seq = ++reqSeq.current
    try {
      const data = await window.corventa.usage.getBendingCountReport(periodQuery(p))
      if (!mounted.current || seq !== reqSeq.current) return
      setReport(data)
      setError(null)
    } catch (err) {
      if (!mounted.current || seq !== reqSeq.current) return
      setError(tp((err as Error)?.message ?? String(err)))
    } finally {
      if (mounted.current && seq === reqSeq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    setLoading(true)
    void load(period)
    const id = window.setInterval(() => void load(period), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [period, load])

  // Dönem değişince eski dönemin verisi gösterilmesin
  const shown = report && !loading ? report : null
  const isMonthly = period === 'year'

  const totals = shown?.totals
  const total = totals?.total ?? 0
  const failCount = (totals?.failed ?? 0) + (totals?.interrupted ?? 0)
  const avgPerDay = shown && shown.days > 0 ? (total / shown.days).toFixed(1) : '0'
  const series = shown?.series ?? []
  const maxCount = Math.max(1, ...series.map((s) => s.total))
  const isEmpty = shown != null && total === 0

  const barLabel = (key: string): string => {
    const d = keyToDate(key)
    if (!d) return key
    return isMonthly ? d.toLocaleDateString(locale, { month: 'short' }) : pad(d.getDate())
  }
  const barTitle = (key: string): string => {
    const d = keyToDate(key)
    if (!d) return key
    return isMonthly
      ? d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}><Icon name="back" size="lg" /></button>
        <h1 className={styles.title}>{t('KIVRIM ADETLERİ RAPORU')}</h1>
        <div className={styles.periodTabs}>
          <PeriodTab active={period === 'week'} onClick={() => setPeriod('week')}>{t('{n} GÜN', { n: 7 })}</PeriodTab>
          <PeriodTab active={period === 'month'} onClick={() => setPeriod('month')}>{t('{n} GÜN', { n: 30 })}</PeriodTab>
          <PeriodTab active={period === 'year'} onClick={() => setPeriod('year')}>{t('YIL')}</PeriodTab>
        </div>
      </div>

      <div className={styles.body}>
        {/* Summary */}
        <div className={styles.statsRow}>
          <SumCard
            label={t('TOPLAM İŞ')}
            value={shown ? String(total) : '–'}
            sub={isMonthly ? t('son {n} ay', { n: 12 }) : t('son {n} gün', { n: shown?.days ?? (period === 'week' ? 7 : 30) })}
            color="#2a2a2a"
          />
          <SumCard
            label={t('BAŞARILI')}
            value={shown ? String(totals?.completed ?? 0) : '–'}
            sub={t('%{v}', { v: pctText(totals?.completed ?? 0, total) })}
            color={COLOR_SUCCESS}
          />
          <SumCard label={t('BAŞARISIZ')} value={shown ? String(failCount) : '–'} sub={t('hata/acil')} color={COLOR_FAIL} />
          <SumCard label={t('İPTAL EDİLEN')} value={shown ? String(totals?.cancelled ?? 0) : '–'} sub={t('operatör durdurdu')} color="#6b7280" />
          <SumCard label={t('GÜNLÜK ORT.')} value={shown ? avgPerDay : '–'} sub={t('iş/gün')} color="#1a6fd4" />
        </div>

        {/* Bar chart */}
        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{isMonthly ? t('AYLIK KIVRIM SAYISI') : t('GÜNLÜK KIVRIM SAYISI')}</span>
            <div className={styles.legendRow}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: COLOR_SUCCESS }} /> {t('BAŞARILI')}</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: COLOR_FAIL }} /> {t('HATA')}</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: COLOR_CANCEL }} /> {t('İPTAL EDİLEN')}</span>
            </div>
          </div>
          <div className={styles.chartArea}>
            {loading && <div className={styles.chartMsg}>{t('Yükleniyor…')}</div>}
            {!loading && !shown && error && (
              <div className={`${styles.chartMsg} ${styles.errorMsg}`}>
                <span>{t('Rapor alınamadı: {err}', { err: error })}</span>
                <button className={styles.retryBtn} onClick={() => { setLoading(true); void load(period) }}>{t('TEKRAR DENE')}</button>
              </div>
            )}
            {isEmpty && <div className={styles.chartMsg}>{t('KAYIT YOK')}</div>}
            {shown && !isEmpty && series.map((s) => {
              const failN = s.failed + s.interrupted
              const otherN = s.cancelled
              const successN = Math.max(0, s.total - failN - otherN)
              return (
                <div
                  key={s.key}
                  className={styles.barCol}
                  title={t('{date}: {n} iş ({ok} başarılı, {fail} hata, {cancel} iptal)', {
                    date: barTitle(s.key), n: s.total, ok: s.completed, fail: failN, cancel: s.cancelled,
                  })}
                >
                  <div className={styles.barStack}>
                    {successN > 0 && <div className={styles.barSuccess} style={{ height: `${(successN / maxCount) * 100}%` }} />}
                    {failN > 0 && <div className={styles.barFail} style={{ height: `${(failN / maxCount) * 100}%` }} />}
                    {otherN > 0 && <div className={styles.barCancel} style={{ height: `${(otherN / maxCount) * 100}%` }} />}
                  </div>
                  <div className={styles.barValue}>{s.total > 0 ? s.total : ''}</div>
                  <div className={styles.barLabel}>{barLabel(s.key)}</div>
                </div>
              )
            })}
          </div>
          {shown && error && <div className={styles.warnMsg}>{t('Güncelleme başarısız, son alınan veri gösteriliyor: {err}', { err: error })}</div>}
        </div>

        {/* Method dağılımı */}
        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('METOT DAĞILIMI')}</span>
            {shown && (
              <span className={styles.metaText}>
                {t('TAMAMLANAN: {p} paso · {m} m parça', {
                  p: (totals?.completedPasos ?? 0).toLocaleString(locale),
                  m: (totals?.completedPartLengthM ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 }),
                })}
              </span>
            )}
          </div>
          <div className={styles.methodList}>
            {METHODS.map((m) => {
              const row = shown?.methods.find((x) => x.method === m.method)
              const n = row?.total ?? 0
              const pct = total > 0 ? (n / total) * 100 : 0
              return (
                <div key={m.method} className={styles.methodRow}>
                  <div className={styles.methodLabelCol}>
                    <span className={styles.methodName}>{t(m.label)}</span>
                    <span className={styles.methodCount}>
                      {shown ? t('{n} iş · {ok} başarılı', { n, ok: row?.completed ?? 0 }) : '–'}
                    </span>
                  </div>
                  <div className={styles.methodBarWrap}>
                    <div className={styles.methodBar} style={{ width: `${pct}%`, background: m.color }} />
                  </div>
                  <span className={styles.methodPct}>{t('%{v}', { v: pctText(n, total) })}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SumCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className={styles.sumCard}>
      <span className={styles.sumLabel}>{label}</span>
      <span className={styles.sumValue} style={{ color }}>{value}</span>
      <span className={styles.sumSub}>{sub}</span>
    </div>
  )
}

function PeriodTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`${styles.periodTab} ${active ? styles.periodActive : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
