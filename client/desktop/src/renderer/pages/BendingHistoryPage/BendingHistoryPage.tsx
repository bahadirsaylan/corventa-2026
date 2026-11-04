// Ayarlar > Büküm Geçmişi — bitmiş / çalışan işler ve iş logları (paketli sürümde backend konsolu görünmez;
// operatör / usta büküm sonrası "ne olmuş" buradan bakar).
// Kaynak: DataApi GET /api/bending-jobs (en yeni önce, limit ≤ 1000) + GET /api/bending-jobs/{id}
// + GET /api/bending-logs?jobId=&limit=20000 (kronolojik), window.corventa.bending.listJobs / getJob / getJobLogs
// üzerinden (demo'da DemoMachine). Loglar tek seferde (en fazla 20000 satır) alınır, filtre istemci tarafında:
//   ÖZET   = Category != "Detay" (Bending API BendingLogService özet satırları: Piston/Rotation/Step/…)
//   TÜMÜ   = + "Detay" (iş süresince Bending API'nin tüm ILogger çıktıları; Warning → "[UYARI] " önekli)
//   HATALAR = IsError (seviye Error/Critical)
// Ekran sadece okur. DIŞA AKTAR: aktif filtredeki TÜM satırlar .txt / .csv (main kayıt penceresi — USB seçilebilir).
// Tahliye ekranındaki "LOGLARI GÖR" buraya state.from='unload' ile gelir → geri tuşu tahliyeye döner.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { translateProgress, useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import { BendingJobStatus, type BendingJob, type BendingLogEntry } from '@shared'
import styles from './BendingHistoryPage.module.css'

const LIST_STEP = 50
const LIST_MAX = 1000
const LOG_FETCH_LIMIT = 20_000
const LOG_PAGE = 1000
const DETAIL_CATEGORY = 'Detay'
const WARN_PREFIX = '[UYARI]'

const STATUS_NAMES = ['Created', 'Calculating', 'Ready', 'Running', 'Completed', 'Failed', 'Cancelled', 'Interrupted'] as const
const METHOD_NAMES = ['FullCircle', 'Arc', 'Serpantin', 'Sivama'] as const

// Ekranda gösterilen etiketler (t() ile çevrilir)
const JOB_STATUS_LABELS: Record<string, string> = {
  Created: 'OLUŞTURULDU',
  Calculating: 'HESAPLANIYOR',
  Ready: 'HAZIR',
  Running: 'ÇALIŞIYOR',
  Completed: 'TAMAMLANDI',
  Failed: 'BAŞARISIZ',
  Cancelled: 'İPTAL EDİLDİ',
  Interrupted: 'KESİLDİ (ACİL STOP)',
}

const STATUS_COLORS: Record<string, string> = {
  Completed: '#16a34a',
  Failed: '#dc2626',
  Cancelled: '#ea580c',
  Interrupted: '#b91c1c',
  Running: '#2563eb',
}

const METHOD_LABELS: Record<string, string> = {
  FullCircle: 'TAM DAİRE',
  Arc: 'KAVİS',
  Serpantin: 'SERPANTİN',
  Sivama: 'SIVAMA',
}

/** Liste durum filtresi — '' = hepsi */
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'HEPSİ' },
  { value: String(BendingJobStatus.Completed), label: 'TAMAMLANDI' },
  { value: String(BendingJobStatus.Failed), label: 'BAŞARISIZ' },
  { value: String(BendingJobStatus.Cancelled), label: 'İPTAL EDİLDİ' },
  { value: String(BendingJobStatus.Interrupted), label: 'KESİLDİ (ACİL STOP)' },
  { value: String(BendingJobStatus.Running), label: 'ÇALIŞIYOR' },
]

type LogTab = 'summary' | 'all' | 'errors'

// ─────────────────────────────────────────────────────────────
// Biçimlendirme
// ─────────────────────────────────────────────────────────────

/** Backend enum'u sayı (DataApi) veya metin gelebilir */
function statusName(v: unknown): string {
  return typeof v === 'number' ? (STATUS_NAMES[v] ?? String(v)) : String(v ?? '')
}

function methodName(v: unknown): string {
  return typeof v === 'number' ? (METHOD_NAMES[v] ?? String(v)) : String(v ?? '')
}

/** DataApi tarihleri UTC ama "Z" eksiz gelebilir (SQLite) → UTC kabul et */
function parseUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** Yerel saat — "2026-11-01 14:05:09" */
function fmtDateTime(iso: string | null | undefined): string {
  const d = parseUtc(iso)
  if (!d) return iso || '—'
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

/** Log satırı saati — "14:05:09.123" (yerel) */
function fmtTime(iso: string): string {
  const d = parseUtc(iso)
  if (!d) return iso
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

/** Süre "h:mm:ss" / "m:ss" */
function fmtDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${p2(m)}:${p2(s % 60)}` : `${m}:${p2(s % 60)}`
}

/** durationSeconds yoksa başlangıç–bitiş farkı (çalışan iş: şimdiye kadar) */
function jobDurationSec(job: BendingJob): number | null {
  if (typeof job.durationSeconds === 'number' && job.durationSeconds > 0) return job.durationSeconds
  const a = parseUtc(job.startedAt)
  if (!a) return null
  const b = parseUtc(job.completedAt) ?? (statusName(job.status) === 'Running' ? new Date() : null)
  return b ? (b.getTime() - a.getTime()) / 1000 : null
}

function fmtNum(v: number | null | undefined, digits = 1): string {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—'
}

/** Değer: tam sayıysa olduğu gibi, değilse en fazla 3 ondalık */
function fmtVal(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3)))
}

/** Value1..3 + ValueLabels → "positionMm=12.3  speedPercent=50" */
function fmtValues(l: BendingLogEntry): string {
  const labels = (l.valueLabels ?? '').split('|').map((s) => s.trim())
  return [l.value1, l.value2, l.value3]
    .map((v, i) => (v == null ? null : labels[i] ? `${labels[i]}=${fmtVal(v)}` : fmtVal(v)))
    .filter((x): x is string => x != null)
    .join('  ')
}

function isWarn(l: BendingLogEntry): boolean {
  return !l.isError && l.message.startsWith(WARN_PREFIX)
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// ─────────────────────────────────────────────────────────────
// SAYFA
// ─────────────────────────────────────────────────────────────

export default function BendingHistoryPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const t = useT()
  const params = useParams<{ jobId?: string }>()
  const jobId = params.jobId != null ? Number(params.jobId) : null
  const validId = jobId != null && Number.isInteger(jobId) && jobId > 0
  const fromUnload = !!state && typeof state === 'object' && (state as Record<string, unknown>).from === 'unload'

  const goBack = () => {
    // Detay: tahliye ekranından geldiyse oraya dön (aynı geçmiş kaydı, tahliye sonucu korunur), aksi halde listeye
    if (jobId != null) {
      if (fromUnload) navigate(-1)
      else navigate('/settings/bending-history')
    } else navigate('/settings')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goBack} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>
          {validId ? t('BÜKÜM İŞİ #{id}', { id: jobId }) : t('BÜKÜM GEÇMİŞİ')}
        </h1>
      </div>

      {jobId == null
        ? <JobList onOpen={(id) => navigate(`/settings/bending-history/${id}`)} />
        : validId
          ? <JobDetailView id={jobId} />
          : <div className={styles.body}><div className={styles.empty}>{t('Kayıt yok')}</div></div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LİSTE
// ─────────────────────────────────────────────────────────────

// Limit / filtre detaydan dönüşte korunsun (bileşen yeniden kurulur)
let lastListState = { limit: LIST_STEP, status: '' }

function JobList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT()
  const [limit, setLimit] = useState(lastListState.limit)
  const [status, setStatus] = useState(lastListState.status)
  const [jobs, setJobs] = useState<BendingJob[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.corventa.bending.listJobs({
        limit,
        status: status === '' ? undefined : (Number(status) as BendingJobStatus),
      })
      setJobs(Array.isArray(res) ? res : [])
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [limit, status])

  useEffect(() => {
    lastListState = { limit, status }
    void load()
  }, [load, limit, status])

  const canLoadMore = !!jobs && jobs.length >= limit && limit < LIST_MAX

  return (
    <div className={styles.body}>
      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('FİLTRELER')}</div>
        <div className={styles.filterRow}>
          <div className={styles.chipRow}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={styles.chip}
                data-on={status === f.value || undefined}
                onClick={() => { setStatus(f.value); setLimit(LIST_STEP) }}
              >
                {t(f.label)}
              </button>
            ))}
          </div>
          <button className={styles.refreshBtn} onClick={() => void load()} disabled={loading}>
            <IconLabel icon="reset">{t('YENİLE')}</IconLabel>
          </button>
        </div>
        <div className={styles.filterHint}>
          {t('Bir işe dokunarak özetini ve büküm loglarını görebilirsiniz. En yeni iş en üsttedir.')}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('İŞLER ({n})', { n: jobs?.length ?? 0 })}</div>
        {error && (
          <div className={styles.errorBox}>
            <IconLabel icon="error">{t('Kayıtlar alınamadı')}</IconLabel>
            <span className={styles.errorDetail}>{error}</span>
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('İŞ NO')}</th>
              <th>{t('TARİH / SAAT')}</th>
              <th>{t('METOT')}</th>
              <th className={styles.thNum}>{t('HEDEF Ø (mm)')}</th>
              <th className={styles.thNum}>{t('PASO')}</th>
              <th className={styles.thNum}>{t('SÜRE')}</th>
              <th>{t('DURUM')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && jobs && jobs.length === 0 && (
              <tr><td colSpan={8} className={styles.empty}>{t('Kayıt yok')}</td></tr>
            )}
            {loading && !jobs && (
              <tr><td colSpan={8} className={styles.empty}>{t('Yükleniyor…')}</td></tr>
            )}
            {jobs?.map((j) => {
              const st = statusName(j.status)
              return (
                <tr key={j.id} className={styles.clickRow} onClick={() => onOpen(j.id)}>
                  <td className={styles.tdId}>#{j.id}</td>
                  <td className={styles.tdMono}>{fmtDateTime(j.startedAt ?? j.createdAt)}</td>
                  <td className={styles.tdCat}>{t(METHOD_LABELS[methodName(j.method)] ?? methodName(j.method))}</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtNum(j.targetDiameterMm, 0)}</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>{j.completedPasos ?? 0} / {j.totalPasos ?? 0}</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtDuration(jobDurationSec(j))}</td>
                  <td><StatusPill status={st} /></td>
                  <td className={styles.tdAction}><Icon name="chevronRight" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {canLoadMore && (
          <button
            className={styles.moreBtn}
            disabled={loading}
            onClick={() => setLimit((l) => Math.min(LIST_MAX, l + LIST_STEP))}
          >
            {loading ? t('Yükleniyor…') : t('DAHA FAZLA GÖSTER')}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const t = useT()
  return (
    <span className={styles.statusPill} style={{ background: STATUS_COLORS[status] ?? '#6b7280' }}>
      {t(JOB_STATUS_LABELS[status] ?? status)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// DETAY
// ─────────────────────────────────────────────────────────────

function JobDetailView({ id }: { id: number }) {
  const t = useT()
  const lang = useLang()
  const [job, setJob] = useState<BendingJob | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [logs, setLogs] = useState<BendingLogEntry[] | null>(null)
  const [logError, setLogError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<LogTab>('summary')
  const [category, setCategory] = useState('')
  const [shown, setShown] = useState(LOG_PAGE)
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setJobError(null)
    setLogError(null)
    const [j, l] = await Promise.allSettled([
      window.corventa.bending.getJob(id),
      window.corventa.bending.getJobLogs({ jobId: id, limit: LOG_FETCH_LIMIT }),
    ])
    if (j.status === 'fulfilled') setJob(j.value)
    else setJobError(errMsg(j.reason))
    if (l.status === 'fulfilled') setLogs(Array.isArray(l.value?.logs) ? l.value.logs : [])
    else setLogError(errMsg(l.reason))
    setLoading(false)
  }, [id])

  useEffect(() => {
    setJob(null)
    setLogs(null)
    void load()
  }, [load])

  // Sekme sayıları + sekmeye göre satırlar
  const counts = useMemo(() => {
    const all = logs ?? []
    let summary = 0
    let errors = 0
    for (const l of all) {
      if (l.category !== DETAIL_CATEGORY) summary++
      if (l.isError) errors++
    }
    return { summary, all: all.length, errors }
  }, [logs])

  const tabRows = useMemo(() => {
    const all = logs ?? []
    if (tab === 'summary') return all.filter((l) => l.category !== DETAIL_CATEGORY)
    if (tab === 'errors') return all.filter((l) => l.isError)
    return all
  }, [logs, tab])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const l of tabRows) set.add(l.category)
    return [...set].sort()
  }, [tabRows])

  // Seçili kategori yeni sekmede yoksa sıfırla
  useEffect(() => {
    if (category && !categories.includes(category)) setCategory('')
  }, [categories, category])

  const rows = useMemo(
    () => (category ? tabRows.filter((l) => l.category === category) : tabRows),
    [tabRows, category],
  )

  // Filtre değişince ilk sayfadan başla
  useEffect(() => setShown(LOG_PAGE), [tab, category, logs])

  const visible = rows.length > shown ? rows.slice(0, shown) : rows

  async function exportLogs() {
    if (exporting) return
    setExporting(true)
    setExportMsg(null)
    try {
      const now = new Date()
      const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`
      const tabKey = tab === 'summary' ? 'ozet' : tab === 'errors' ? 'hatalar' : 'tumu'
      const res = await window.corventa.bending.exportJobLogs({
        defaultFileName: `bukum-is-${id}-${tabKey}-${stamp}.txt`,
        dialogTitle: t('BÜKÜM LOGLARINI KAYDET'),
        txt: buildTxt(id, job, rows, tab, category, lang, t),
        csv: buildCsv(rows, lang, t),
      })
      if (res.ok) setExportMsg({ ok: true, text: t('KAYDEDİLDİ: {path}', { path: res.path ?? '' }) })
      else if (!res.cancelled) setExportMsg({ ok: false, text: t('KAYDEDİLEMEDİ: {error}', { error: res.error ?? '' }) })
    } catch (e) {
      setExportMsg({ ok: false, text: t('KAYDEDİLEMEDİ: {error}', { error: errMsg(e) }) })
    } finally {
      setExporting(false)
    }
  }

  const st = job ? statusName(job.status) : ''
  const msgOf = (l: BendingLogEntry) => (l.category === DETAIL_CATEGORY ? l.message : translateProgress(l.message, lang))

  return (
    <div className={`${styles.body} ${styles.detailBody}`}>
      {/* İş özeti */}
      {jobError && (
        <div className={styles.errorBox}>
          <IconLabel icon="error">{t('Kayıt alınamadı')}</IconLabel>
          <span className={styles.errorDetail}>{jobError}</span>
        </div>
      )}
      {!job && !jobError && <div className={styles.empty}>{t('Yükleniyor…')}</div>}
      {job && (
        <div className={styles.card} style={{ borderColor: STATUS_COLORS[st] ?? undefined }}>
          <div className={styles.detailHead}>
            <StatusPill status={st} />
            <span className={styles.detailMethod}>{t(METHOD_LABELS[methodName(job.method)] ?? methodName(job.method))}</span>
            <span className={styles.detailTime}>{fmtDateTime(job.startedAt ?? job.createdAt)}</span>
          </div>
          <div className={styles.kvGrid}>
            <KV label={t('PROFİL A / B / S')} value={`${fmtNum(job.profileA)} / ${fmtNum(job.profileB)} / ${fmtNum(job.profileS)}`} />
            <KV label={t('HEDEF ÇAP (mm)')} value={fmtNum(job.targetDiameterMm)} />
            <KV label={t('ÖLÇÜLEN ÇAP (mm)')} value={fmtNum(job.measuredDiameterMm)} />
            <KV label={t('PARÇA BOYU (mm)')} value={fmtNum(job.partLengthMm, 0)} />
            <KV label={t('ADIM (mm)')} value={fmtNum(job.stepDistanceMm)} />
            <KV label={t('PASO')} value={`${job.completedPasos ?? 0} / ${job.totalPasos ?? 0}`} />
            <KV label={t('HATALI PASO')} value={job.failedAtPaso != null ? String(job.failedAtPaso) : '—'} warn={job.failedAtPaso != null} />
            <KV label={t('OPERATÖR')} value={job.operatorName || '—'} />
            <KV label={t('OLUŞTURULMA')} value={fmtDateTime(job.createdAt)} />
            <KV label={t('BAŞLANGIÇ')} value={fmtDateTime(job.startedAt)} />
            <KV label={t('BİTİŞ')} value={fmtDateTime(job.completedAt)} />
            <KV label={t('SÜRE')} value={fmtDuration(jobDurationSec(job))} />
          </div>
          {job.errorMessage && (
            <div className={st === 'Completed' ? styles.warnBox : styles.errorBox}>
              <span>{st === 'Completed' ? t('UYARI') : t('HATA')}</span>
              <span className={styles.boxText}>{translateProgress(job.errorMessage, lang)}</span>
            </div>
          )}
          {job.hasFailedMeasurement === true && (
            <div className={styles.warnBox}>
              <IconLabel icon="warning">{t('HATALI ÖLÇÜM VAR — BU BÜKÜM BULUTA GÖNDERİLMEYECEK')}</IconLabel>
              {job.failedMeasurementReason && <span className={styles.boxText}>{translateProgress(job.failedMeasurementReason, lang)}</span>}
            </div>
          )}
        </div>
      )}

      {/* Loglar — kalan yüksekliği doldurur; log tablosu bu kart içinde kayar */}
      <div className={`${styles.card} ${styles.logCard}`}>
        <div className={styles.sectionTitle}>{t('BÜKÜM LOGLARI')}</div>

        <div className={styles.tabRow}>
          <TabBtn on={tab === 'summary'} onClick={() => setTab('summary')} label={t('ÖZET')} n={counts.summary} />
          <TabBtn on={tab === 'all'} onClick={() => setTab('all')} label={t('TÜMÜ')} n={counts.all} />
          <TabBtn on={tab === 'errors'} onClick={() => setTab('errors')} label={t('SADECE HATALAR')} n={counts.errors} danger />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>{t('KATEGORİ')}</label>
            <select className={styles.selectInput} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('HEPSİ')}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.filterHint}>
            {t('{n} satır', { n: rows.length })}
            {(logs?.length ?? 0) >= LOG_FETCH_LIMIT && ` — ${t('ilk {n} satır alındı', { n: LOG_FETCH_LIMIT })}`}
          </div>
          <button className={styles.refreshBtn} onClick={() => void load()} disabled={loading}>
            <IconLabel icon="reset">{t('YENİLE')}</IconLabel>
          </button>
          <button className={styles.exportBtn} onClick={() => void exportLogs()} disabled={exporting || rows.length === 0}>
            {exporting ? t('KAYDEDİLİYOR…') : t('DIŞA AKTAR')}
          </button>
        </div>

        {exportMsg && (
          <div className={exportMsg.ok ? styles.okBox : styles.errorBox}>
            <span className={styles.boxText}>{exportMsg.text}</span>
          </div>
        )}

        {logError && (
          <div className={styles.errorBox}>
            <IconLabel icon="error">{t('Loglar alınamadı')}</IconLabel>
            <span className={styles.errorDetail}>{logError}</span>
          </div>
        )}

        {!logs && !logError
          ? <div className={styles.empty}>{t('Yükleniyor…')}</div>
          : rows.length === 0
            ? <div className={styles.empty}>{t('Log satırı yok')}</div>
            : (
              <div className={styles.logBox}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('SAAT')}</th>
                      <th>{t('KATEGORİ')}</th>
                      <th>{t('MESAJ')}</th>
                      <th>{t('DEĞERLER')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((l, i) => (
                      <tr
                        key={l.id ?? i}
                        className={l.isError ? styles.logError : isWarn(l) ? styles.logWarn : l.category === DETAIL_CATEGORY ? styles.logDetail : undefined}
                      >
                        <td className={styles.tdTime}>{fmtTime(l.timestamp)}</td>
                        <td className={styles.tdCat}>{l.category}</td>
                        <td className={styles.tdLog}>{msgOf(l)}</td>
                        <td className={styles.tdValues}>{fmtValues(l)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

        {rows.length > shown && (
          <div className={styles.moreRow}>
            <span className={styles.filterHint}>{t('{shown} / {n} satır gösteriliyor', { shown, n: rows.length })}</span>
            <button className={styles.moreBtn} onClick={() => setShown((s) => s + LOG_PAGE)}>
              {t('DAHA FAZLA GÖSTER')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({ on, onClick, label, n, danger }: { on: boolean; onClick: () => void; label: string; n: number; danger?: boolean }) {
  return (
    <button type="button" className={styles.tab} data-on={on || undefined} data-danger={(danger && n > 0) || undefined} onClick={onClick}>
      <span>{label}</span>
      <span className={styles.tabCount}>{n}</span>
    </button>
  )
}

function KV({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.filterLabel}>{label}</span>
      <span className={styles.kvValue} style={warn ? { color: STATUS_COLORS.Failed } : undefined}>{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DIŞA AKTARMA
// ─────────────────────────────────────────────────────────────

type TFn = (source: string, vars?: Record<string, string | number>) => string

function exportMsgOf(l: BendingLogEntry, lang: ReturnType<typeof useLang>): string {
  return l.category === DETAIL_CATEGORY ? l.message : translateProgress(l.message, lang)
}

/** Log satırı için tam yerel tarih-saat (dosyada gün de görünsün) */
function fmtFull(iso: string): string {
  const d = parseUtc(iso)
  if (!d) return iso
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${fmtTime(iso)}`
}

function buildTxt(
  id: number,
  job: BendingJob | null,
  rows: BendingLogEntry[],
  tab: LogTab,
  category: string,
  lang: ReturnType<typeof useLang>,
  t: TFn,
): string {
  const tabLabel = tab === 'summary' ? t('ÖZET') : tab === 'errors' ? t('SADECE HATALAR') : t('TÜMÜ')
  const lines: string[] = []
  lines.push(`${t('BÜKÜM İŞİ #{id}', { id })}`)
  if (job) {
    const st = statusName(job.status)
    lines.push(`${t('DURUM')}: ${t(JOB_STATUS_LABELS[st] ?? st)}`)
    lines.push(`${t('METOT')}: ${t(METHOD_LABELS[methodName(job.method)] ?? methodName(job.method))}`)
    lines.push(`${t('PROFİL A / B / S')}: ${fmtNum(job.profileA)} / ${fmtNum(job.profileB)} / ${fmtNum(job.profileS)}`)
    lines.push(`${t('HEDEF ÇAP (mm)')}: ${fmtNum(job.targetDiameterMm)}   ${t('ÖLÇÜLEN ÇAP (mm)')}: ${fmtNum(job.measuredDiameterMm)}`)
    lines.push(`${t('PARÇA BOYU (mm)')}: ${fmtNum(job.partLengthMm, 0)}   ${t('ADIM (mm)')}: ${fmtNum(job.stepDistanceMm)}   ${t('PASO')}: ${job.completedPasos ?? 0} / ${job.totalPasos ?? 0}`)
    lines.push(`${t('BAŞLANGIÇ')}: ${fmtDateTime(job.startedAt)}   ${t('BİTİŞ')}: ${fmtDateTime(job.completedAt)}   ${t('SÜRE')}: ${fmtDuration(jobDurationSec(job))}`)
    if (job.errorMessage) lines.push(`${t('HATA')}: ${translateProgress(job.errorMessage, lang)}`)
  }
  lines.push(`${t('FİLTRE')}: ${tabLabel}${category ? ` / ${category}` : ''} — ${t('{n} satır', { n: rows.length })}`)
  lines.push('-'.repeat(100))
  for (const l of rows) {
    const flag = l.isError ? 'HATA ' : isWarn(l) ? 'UYARI' : '     '
    const vals = fmtValues(l)
    lines.push(`${fmtFull(l.timestamp)}  ${flag}  [${l.category}]  ${exportMsgOf(l, lang)}${vals ? `   | ${vals}` : ''}`)
  }
  return lines.join('\r\n') + '\r\n'
}

/** CSV — ";" ayraçlı (Türkçe Excel varsayılanı), alanlar tırnaklı */
function buildCsv(rows: BendingLogEntry[], lang: ReturnType<typeof useLang>, t: TFn): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const head = [t('ZAMAN'), t('KATEGORİ'), t('MESAJ'), t('DEĞERLER'), t('HATA')].map(q).join(';')
  const body = rows.map((l) =>
    [fmtFull(l.timestamp), l.category, exportMsgOf(l, lang), fmtValues(l), l.isError ? '1' : isWarn(l) ? 'W' : '0']
      .map(q)
      .join(';'),
  )
  return [head, ...body].join('\r\n') + '\r\n'
}
