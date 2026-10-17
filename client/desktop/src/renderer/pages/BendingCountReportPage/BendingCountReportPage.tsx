// Ayarlar > Kıvrım Adetleri Raporu — job sayısı istatistiği + tarih bazlı bar chart + method dağılımı.
// Backend: DataApi.bendingJobs istatistik endpoint'i (henüz yok, mock).

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import styles from './BendingCountReportPage.module.css'

type Period = 'week' | 'month' | 'year'

interface DayCount { date: string; count: number; success: number; fail: number }

// Mock günlük veri — son 30 gün
const MOCK_DAILY: DayCount[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-08-14')
  d.setDate(d.getDate() - (29 - i))
  const dateStr = d.toISOString().slice(0, 10)
  const total = i === 6 || i === 20 ? 0 : Math.floor(3 + (i % 5) * 4 + (i % 3) * 2)
  const fail = Math.floor(total * 0.06)
  return { date: dateStr, count: total, success: total - fail, fail }
})

const METHOD_STATS = [
  { method: 'TAM DAİRE',   count: 148, pct: 62, color: '#1a6fd4' },
  { method: 'YAY',         count:  56, pct: 23, color: '#dc2626' },
  { method: 'SERPANTİN',   count:  22, pct: 9,  color: '#16a34a' },
  { method: 'SIVAMA',      count:  14, pct: 6,  color: '#f59e0b' },
]

export default function BendingCountReportPage() {
  const navigate = useNavigate()
  const t = useT()
  const [period, setPeriod] = useState<Period>('month')

  const filtered = useMemo(() => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 30
    return MOCK_DAILY.slice(-days)
  }, [period])

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, d) => sum + d.count, 0)
    const success = filtered.reduce((sum, d) => sum + d.success, 0)
    const fail = filtered.reduce((sum, d) => sum + d.fail, 0)
    const avgPerDay = filtered.length > 0 ? (total / filtered.length).toFixed(1) : '0'
    return { total, success, fail, avgPerDay, successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0' }
  }, [filtered])

  const maxCount = Math.max(1, ...filtered.map((d) => d.count))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
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
          <SumCard label={t('TOPLAM İŞ')}    value={totals.total.toString()} sub={t('son {n} gün', { n: filtered.length })} color="#2a2a2a" />
          <SumCard label={t('BAŞARILI')}     value={totals.success.toString()} sub={t('%{v}', { v: totals.successRate })} color="#16a34a" />
          <SumCard label={t('BAŞARISIZ')}    value={totals.fail.toString()} sub={t('hata/acil')} color="#dc2626" />
          <SumCard label={t('GÜNLÜK ORT.')}  value={totals.avgPerDay} sub={t('iş/gün')} color="#1a6fd4" />
        </div>

        {/* Bar chart */}
        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('GÜNLÜK KIVRIM SAYISI')}</span>
            <div className={styles.legendRow}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#16a34a' }} /> {t('BAŞARILI')}</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#dc2626' }} /> {t('HATA')}</span>
            </div>
          </div>
          <div className={styles.chartArea}>
            {filtered.map((d) => {
              const successH = (d.success / maxCount) * 100
              const failH = (d.fail / maxCount) * 100
              const day = d.date.slice(-2)
              return (
                <div key={d.date} className={styles.barCol} title={t('{date}: {n} iş ({fail} fail)', { date: d.date, n: d.count, fail: d.fail })}>
                  <div className={styles.barStack}>
                    {failH > 0 && <div className={styles.barFail} style={{ height: `${failH}%` }} />}
                    <div className={styles.barSuccess} style={{ height: `${successH}%` }} />
                  </div>
                  <div className={styles.barValue}>{d.count > 0 ? d.count : ''}</div>
                  <div className={styles.barLabel}>{day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Method dağılımı */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('METOT DAĞILIMI')}</div>
          <div className={styles.methodList}>
            {METHOD_STATS.map((m) => (
              <div key={m.method} className={styles.methodRow}>
                <div className={styles.methodLabelCol}>
                  <span className={styles.methodName}>{t(m.method)}</span>
                  <span className={styles.methodCount}>{t('{n} iş', { n: m.count })}</span>
                </div>
                <div className={styles.methodBarWrap}>
                  <div className={styles.methodBar} style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
                <span className={styles.methodPct}>{t('%{v}', { v: m.pct })}</span>
              </div>
            ))}
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
