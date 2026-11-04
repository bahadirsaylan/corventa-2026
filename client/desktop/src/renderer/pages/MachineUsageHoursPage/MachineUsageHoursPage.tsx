// Ayarlar > Kullanma Süreleri — 5 kategori (Excel madde 35/36):
// BASINÇ (aktif kullanım) · STANDBY · HATA MODLARI · BAKIM · SERVİS.
// Kaynak: DataApi GET /api/usage-time/summary (window.corventa.usage.getSummary). Sayımı Bending API
// UsageTimeTracker yapar (saniye, 30 sn'de bir DataApi'ye yazar) → ekran da 30 sn'de bir yenilenir.
// Her kart: tüm zamanlar toplamı (saat:dakika) + bugün + son 30 gün payı (CSS yatay çubuk).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  USAGE_TIME_CATEGORIES,
  type UsageTimeCategory,
  type UsageTimeSummary,
} from '@shared/types'
import { useLang, useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './MachineUsageHoursPage.module.css'

const RANGE_DAYS = 30
const REFRESH_MS = 30_000

interface CategoryInfo {
  label: string
  desc: string
  color: string
}

// Etiket + kısa tanım (Excel) — ekranda t() ile çevrilir
const CATEGORY_INFO: Record<UsageTimeCategory, CategoryInfo> = {
  PRESSURE: {
    label: 'BASINÇ (AKTİF KULLANIM)',
    desc: 'Tam oto / yarı oto bükümün başlangıcı ile bitişi arasında geçen süre.',
    color: '#16a34a',
  },
  STANDBY: {
    label: 'STANDBY',
    desc: 'Hidrolik motor çalışırken büküm yapılmadan beklenen süre.',
    color: '#1a6fd4',
  },
  ERROR: {
    label: 'HATA MODLARI',
    desc: 'Makinenin hata, alarm veya acil stop durumunda geçirdiği süre.',
    color: '#dc2626',
  },
  MAINTENANCE: {
    label: 'BAKIM',
    desc: 'Bakım modu açıkken geçen süre.',
    color: '#f59e0b',
  },
  SERVICE: {
    label: 'SERVİS',
    desc: 'Başlatılmış servis müdahalesi süresince geçen süre.',
    color: '#7c3aed',
  },
}

/** Saniye → "saat:dakika" (saatte binlik ayırıcı), ör. 1.247:05 */
function formatHm(seconds: number, locale: string): string {
  const totalMin = Math.floor(Math.max(0, seconds) / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h.toLocaleString(locale)}:${String(m).padStart(2, '0')}`
}

/** "yyyy-MM-dd" (yerel gün) → kısa tarih; UTC kaymasın diye parçalanarak kurulur */
function formatDay(day: string, locale: string): string {
  const [y, mo, d] = day.split('-').map(Number)
  if (!y || !mo || !d) return day
  return new Date(y, mo - 1, d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
}

export default function MachineUsageHoursPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'

  const [summary, setSummary] = useState<UsageTimeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const data = await window.corventa.usage.getSummary(RANGE_DAYS)
      if (!mounted.current) return
      setSummary(data)
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      if (!mounted.current) return
      // Eski veri varsa ekranda kalır, sadece uyarı gösterilir
      setError((err as Error)?.message ?? String(err))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      mounted.current = false
      window.clearInterval(id)
    }
  }, [load])

  const rangeSum = summary
    ? USAGE_TIME_CATEGORIES.reduce((acc, c) => acc + (summary.rangeTotals[c] ?? 0), 0)
    : 0
  const allTimeSum = summary
    ? USAGE_TIME_CATEGORIES.reduce((acc, c) => acc + (summary.totals[c] ?? 0), 0)
    : 0
  const isEmpty = summary != null && allTimeSum === 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}><Icon name="back" size="lg" /></button>
        <h1 className={styles.title}>{t('KULLANMA SÜRELERİ')}</h1>
      </div>

      <div className={styles.body}>
        {loading && !summary && <div className={styles.stateMsg}>{t('Yükleniyor…')}</div>}

        {error && !summary && !loading && (
          <div className={`${styles.stateMsg} ${styles.errorMsg}`}>
            <span>{t('Kullanım süreleri alınamadı: {err}', { err: error })}</span>
            <button
              className={styles.retryBtn}
              onClick={() => {
                setLoading(true)
                void load()
              }}
            >
              {t('TEKRAR DENE')}
            </button>
          </div>
        )}

        {summary && (
          <>
            <div className={styles.metaRow}>
              <span>
                {t('Son {n} gün: {from} – {to}', {
                  n: summary.days,
                  from: formatDay(summary.from, locale),
                  to: formatDay(summary.to, locale),
                })}
              </span>
              {updatedAt && (
                <span>
                  {t('Güncellendi: {time}', {
                    time: updatedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
                  })}
                </span>
              )}
            </div>

            {error && (
              <div className={styles.warnMsg}>
                {t('Güncelleme başarısız, son alınan veri gösteriliyor: {err}', { err: error })}
              </div>
            )}

            {isEmpty && (
              <div className={styles.warnMsg}>
                {t('Henüz kullanım kaydı yok. Süreler makine çalıştıkça 30 sn aralıklarla kaydedilir.')}
              </div>
            )}

            {USAGE_TIME_CATEGORIES.map((cat) => {
              const info = CATEGORY_INFO[cat]
              const range = summary.rangeTotals[cat] ?? 0
              const pct = rangeSum > 0 ? (range / rangeSum) * 100 : 0
              return (
                <div key={cat} className={styles.card} style={{ borderLeftColor: info.color }}>
                  <div className={styles.cardTop}>
                    <span className={styles.catLabel}>{t(info.label)}</span>
                    <span className={styles.total}>
                      <span className={styles.totalValue}>{formatHm(summary.totals[cat] ?? 0, locale)}</span>
                      <span className={styles.unit}>{t('sa:dk')}</span>
                    </span>
                  </div>

                  <div className={styles.statRow}>
                    <span className={styles.statItem}>
                      {t('BUGÜN')} <b>{formatHm(summary.today[cat] ?? 0, locale)}</b>
                    </span>
                    <span className={styles.statItem}>
                      {t('SON {n} GÜN', { n: summary.days })} <b>{formatHm(range, locale)}</b>
                    </span>
                    <span className={styles.pct}>%{pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}</span>
                  </div>

                  <div className={styles.barWrap} aria-hidden>
                    <div className={styles.barFill} style={{ width: `${pct}%`, background: info.color }} />
                  </div>

                  <div className={styles.desc}>{t(info.desc)}</div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
