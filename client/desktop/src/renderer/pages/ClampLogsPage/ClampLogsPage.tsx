// Admin Ayarları > SIKIŞTIRMA > SIKIŞTIRMA KAYITLARI (2026-11-04) — parça sıkıştırma telemetrisi.
// Kaynak: DataApi GET /api/clamp-telemetry/sessions (+ /{id}); Bending API ClampTelemetryRecorder yazar:
//   sıkıştırma boyunca 100 ms'de bir 4 piston + rotasyon + tüm yağ verileri, sıkıştırma sonrası üst/alt top
//   konum kaybı (bitiş konumuna göre kayma) + handler log satırları (NOT). Ekran sadece okur; CSV dışa aktarır.
// Stil: Hata Raporları ekranının stilleri paylaşılır.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { translateProgress, useLang, useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import type { ClampTelemetryPage, ClampTelemetryPasoSummary, ClampTelemetryPhase, ClampTelemetrySample, ClampTelemetrySession } from '@shared'
import styles from '@/pages/ErrorReportsPage/ErrorReportsPage.module.css'
import own from './ClampLogsPage.module.css'

const PAGE_SIZE = 20
/** Ekranda tabloya basılan en fazla satır (tamamı CSV'de) */
const MAX_ROWS = 1500

const KIND_LABELS: Record<string, string> = {
  Clamp: 'SIKIŞTIRMA',
  ClampArc: 'SIKIŞTIRMA (ÇOK AÇILI)',
  ClampCircular: 'SIKIŞTIRMA (DAİRE)',
}

/** DataApi SQLite tarihleri UTC ama 'Z'siz gelir */
function parseUtc(iso: string): number {
  return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z')
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(parseUtc(iso))
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const n2 = (v: number | null | undefined, d = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—')
const ni = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—')
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Kayma büyüklüğüne göre renk: < 0.05 normal, < 0.3 sarı, üstü kırmızı */
function driftKind(v: number | null | undefined): 'ok' | 'warn' | 'bad' | undefined {
  if (typeof v !== 'number') return undefined
  const a = Math.abs(v)
  return a < 0.05 ? 'ok' : a < 0.3 ? 'warn' : 'bad'
}

export default function ClampLogsPage() {
  const navigate = useNavigate()
  const t = useT()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => (selectedId != null ? setSelectedId(null) : navigate('/settings/admin'))}
          aria-label={t('Geri')}
        >
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>
          {selectedId != null ? t('SIKIŞTIRMA KAYDI #{id}', { id: selectedId }) : t('SIKIŞTIRMA KAYITLARI')}
        </h1>
      </div>
      {selectedId == null ? <SessionList onOpen={setSelectedId} /> : <SessionDetail id={selectedId} />}
    </div>
  )
}

// ───────────────────────────── LİSTE ─────────────────────────────

let lastPage = 1

function SessionList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT()
  const lang = useLang()
  const [page, setPage] = useState(lastPage)
  const [data, setData] = useState<ClampTelemetryPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  useEffect(() => {
    window.corventa.system
      .isDemo()
      .then(setIsDemo)
      .catch(() => setIsDemo(false))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await window.corventa.service.listClampTelemetry({ page, pageSize: PAGE_SIZE }))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    lastPage = page
    void load()
  }, [load, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  // DEMO: makinedeki bu ekranın CSV düğmesiyle alınmış kayıtları içe aktar
  async function importCsv() {
    setImportMsg(null)
    try {
      const r = await window.corventa.service.importClampTelemetryCsv()
      if (r.cancelled) return
      setImportMsg(
        t('{n} kayıt içe aktarıldı', { n: r.imported }) + (r.errors.length ? ` — ${t('hatalı')}: ${r.errors.join(' · ')}` : ''),
      )
      setPage(1)
      void load()
    } catch (e) {
      setImportMsg(errMsg(e))
    }
  }

  return (
    <div className={styles.body}>
      <div className={styles.card}>
        <div className={styles.filterRow}>
          <div className={styles.filterHint}>
            {t('Her sıkıştırmada 100 ms aralıkla 4 piston konumu, rotasyon ve tüm yağ verileri kaydedilir. Büküm işinde kayıt iş bitene kadar sürer: boşluk alma ve üst/alt topun KOMUTSUZ kayması (sıkışma gevşemesi) her paso için ayrı izlenir. Satıra dokunun: paso tablosu, zaman çizgisi + CSV.')}
          </div>
          {isDemo && (
            <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void importCsv()}>
              {t('CSV İÇE AKTAR')}
            </button>
          )}
          <button type="button" className={styles.refreshBtn} disabled={loading} onClick={() => void load()}>
            {loading ? t('YÜKLENİYOR…') : t('YENİLE')}
          </button>
        </div>
        {importMsg && <div className={styles.filterHint}>{importMsg}</div>}
      </div>

      {error && (
        <div className={styles.errorBox}>
          {t('Kayıtlar okunamadı')}
          <span className={styles.errorDetail}>{error}</span>
        </div>
      )}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('ZAMAN')}</th>
              <th>{t('İŞ')}</th>
              <th>{t('SONUÇ')}</th>
              <th className={styles.thNum}>{t('ÜST')}</th>
              <th className={styles.thNum}>S1</th>
              <th className={styles.thNum}>{t('YAĞ')}</th>
              <th className={styles.thNum}>{t('KAYMA ÜST/ALT')}</th>
              <th className={styles.thNum}>{t('İŞTE ÜST GERİ / BOŞLUK')}</th>
            </tr>
          </thead>
          <tbody>
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>{t('Henüz sıkıştırma kaydı yok')}</td>
              </tr>
            )}
            {data?.items.map((s) => (
              <tr key={s.id} className={styles.clickRow} onClick={() => onOpen(s.id)}>
                <td className={styles.tdMono}>{s.id}</td>
                <td className={styles.tdMono}>
                  {fmtDateTime(s.startedAt)}
                  <div className={styles.tdCat}>{t(KIND_LABELS[s.kind] ?? s.kind)}</div>
                </td>
                <td className={styles.tdMono}>{s.bendingJobId != null ? `#${s.bendingJobId}` : t('MANUEL')}</td>
                <td>
                  <span className={own.result} data-kind={s.success === true ? 'ok' : s.success === false ? 'bad' : undefined}>
                    {s.success === true ? t('OK') : s.success === false ? t('HATA') : t('SÜRÜYOR')}
                  </span>
                  {s.success === false && s.errorMessage && (
                    <div className={own.errLine}>{t(translateProgress(s.errorMessage, lang))}</div>
                  )}
                </td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>{n2(s.endUpperMm)}</td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>{ni(s.endS1Bar)}</td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>{ni(s.endOilTempC)}°</td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>
                  <span className={own.drift} data-kind={driftKind(s.maxUpperDriftMm)}>{n2(s.maxUpperDriftMm, 3)}</span>
                  {' / '}
                  <span className={own.drift} data-kind={driftKind(s.maxLowerDriftMm)}>{n2(s.maxLowerDriftMm, 3)}</span>
                </td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>
                  {s.slackCount != null ? (
                    <>
                      <span className={own.drift} data-kind={driftKind(s.maxUpperRetreatMm)}>{n2(s.maxUpperRetreatMm, 3)}</span>
                      {' / '}
                      {t('{n}×', { n: s.slackCount })} {n2(s.slackTotalMm, 2)}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.pager}>
          <button type="button" className={styles.pagerBtn} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span className={styles.pagerInfo}>
            {page} / {pages}
          </span>
          <button type="button" className={styles.pagerBtn} disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────── DETAY ─────────────────────────────

type View = 'ALL' | ClampTelemetryPhase

function SessionDetail({ id }: { id: number }) {
  const t = useT()
  const lang = useLang()
  const [s, setS] = useState<ClampTelemetrySession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('ALL')
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.corventa.service
      .getClampTelemetry(id)
      .then((r) => !cancelled && setS(r))
      .catch((e) => !cancelled && setError(errMsg(e)))
    return () => {
      cancelled = true
    }
  }, [id])

  const rows = useMemo(() => (s ? s.samples.filter((x) => view === 'ALL' || x.phase === view) : []), [s, view])
  const settings = useMemo(() => {
    try {
      return s?.settingsJson ? (JSON.parse(s.settingsJson) as Record<string, unknown>) : null
    } catch {
      return null
    }
  }, [s])
  const pasos = useMemo<ClampTelemetryPasoSummary[]>(() => {
    try {
      return s?.pasoSummaryJson ? (JSON.parse(s.pasoSummaryJson) as ClampTelemetryPasoSummary[]) : []
    } catch {
      return []
    }
  }, [s])

  async function exportCsv() {
    if (!s) return
    setExportMsg(null)
    const csv = buildCsv(s)
    const r = await window.corventa.bending.exportJobLogs({
      defaultFileName: `sikistirma-${s.id}.csv`,
      dialogTitle: t('Sıkıştırma kaydını kaydet'),
      csv,
      txt: csv,
    })
    if (r.ok) setExportMsg(t('Kaydedildi: {path}', { path: r.path ?? '' }))
    else if (!r.cancelled) setExportMsg(t('Kaydedilemedi: {err}', { err: r.error ?? '' }))
  }

  if (error)
    return (
      <div className={styles.body}>
        <div className={styles.errorBox}>
          {t('Kayıt okunamadı')}
          <span className={styles.errorDetail}>{error}</span>
        </div>
      </div>
    )
  if (!s) return <div className={styles.body}>{t('Yükleniyor…')}</div>

  return (
    <div className={`${styles.body} ${styles.detailBody}`}>
      <div className={styles.card}>
        <div className={styles.detailHead}>
          <span className={styles.detailTrigger}>
            {t(KIND_LABELS[s.kind] ?? s.kind)} · {s.bendingJobId != null ? t('İŞ #{id}', { id: s.bendingJobId }) : t('MANUEL')}
          </span>
          <span className={own.result} data-kind={s.success === true ? 'ok' : s.success === false ? 'bad' : undefined}>
            {s.success === true ? t('OK') : s.success === false ? t('HATA') : t('SÜRÜYOR')}
          </span>
          <span className={styles.detailTime}>{fmtDateTime(s.startedAt)}</span>
        </div>
        {s.errorMessage && <div className={styles.detailReason}>{t(translateProgress(s.errorMessage, lang))}</div>}
        <div className={styles.kvGrid}>
          <Kv label={t('HEDEF')} value={s.targetPositionMm != null ? `${n2(s.targetPositionMm)} mm` : t('BASINÇ MODU')} />
          <Kv label={t('BASINÇ / HIZ')} value={`${s.pressureBar} bar · %${s.speedPercent}`} />
          <Kv label={t('BAŞLANGIÇ ÜST/ALT')} value={`${n2(s.startUpperMm)} / ${n2(s.startLowerMm)}`} />
          <Kv label={t('BİTİŞ ÜST/ALT')} value={`${n2(s.endUpperMm)} / ${n2(s.endLowerMm)}`} />
          <Kv label={t('BİTİŞ SOL/SAĞ')} value={`${n2(s.endLeftMm)} / ${n2(s.endRightMm)}`} />
          <Kv label={t('BİTİŞ S1 / S2')} value={`${ni(s.endS1Bar)} / ${ni(s.endS2Bar)} bar`} />
          <Kv label={t('MAKS S1')} value={`${ni(s.maxS1Bar)} bar`} />
          <Kv label={t('YAĞ BAŞ/BİTİŞ')} value={`${ni(s.startOilTempC)} / ${ni(s.endOilTempC)} °C`} />
          <Kv label={t('SÜRE')} value={s.clampEndedAt ? `${((parseUtc(s.clampEndedAt) - parseUtc(s.startedAt)) / 1000).toFixed(1)} sn` : '—'} />
          <Kv label={t('İZLEME (SONRASI)')} value={`${n2(s.postWatchSec, 0)} sn`} />
          <Kv label={t('MAKS KAYMA ÜST/ALT')} value={`${n2(s.maxUpperDriftMm, 3)} / ${n2(s.maxLowerDriftMm, 3)} mm`} kind={driftKind(Math.max(Math.abs(s.maxUpperDriftMm ?? 0), Math.abs(s.maxLowerDriftMm ?? 0)))} />
          <Kv label={t('SON KAYMA ÜST/ALT')} value={`${n2(s.finalUpperDriftMm, 3)} / ${n2(s.finalLowerDriftMm, 3)} mm`} />
          {s.slackCount != null && (
            <>
              <Kv label={t('İŞ İZLEME')} value={s.jobEndedAt && s.clampEndedAt ? `${((parseUtc(s.jobEndedAt) - parseUtc(s.clampEndedAt)) / 1000).toFixed(0)} sn` : t('SÜRÜYOR')} />
              <Kv label={t('KOMUTSUZ ÜST GERİ (EN FAZLA)')} value={`${n2(s.maxUpperRetreatMm, 3)} mm`} kind={driftKind(s.maxUpperRetreatMm)} />
              <Kv label={t('KOMUTSUZ ÜST İLERİ (EN FAZLA)')} value={`${n2(s.maxUpperAdvanceMm, 3)} mm`} kind={driftKind(s.maxUpperAdvanceMm)} />
              <Kv label={t('KOMUTSUZ ALT')} value={`${n2(s.maxLowerUncmdMm, 3)} mm`} kind={driftKind(s.maxLowerUncmdMm)} />
              <Kv label={t('MİN S1 (TUTARKEN)')} value={`${ni(s.minS1HoldBar)} bar`} />
              <Kv label={t('BOŞLUK ALMA')} value={t('{n} kez · toplam {mm} mm', { n: s.slackCount, mm: n2(s.slackTotalMm, 3) })} />
            </>
          )}
        </div>
        {settings && (
          <div className={own.settings}>
            {Object.entries(settings).map(([k, v]) => (
              <span key={k} className={own.setting}>
                {k.replace(/^Clamp/, '')}: <b>{v == null ? '—' : String(v)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      {pasos.length > 0 && <PasoTable pasos={pasos} />}

      <div className={styles.viewTabs}>
        {(['ALL', 'CLAMP', 'JOB', 'AFTER', 'NOTE'] as View[]).map((v) => (
          <button key={v} type="button" className={styles.viewTab} data-on={view === v || undefined} onClick={() => setView(v)}>
            {v === 'ALL' ? t('TÜMÜ') : v === 'CLAMP' ? t('SIKIŞTIRMA') : v === 'JOB' ? t('BÜKÜM') : v === 'AFTER' ? t('SONRASI') : t('NOTLAR')}
          </button>
        ))}
        <button type="button" className={styles.refreshBtn} onClick={() => void exportCsv()}>
          CSV
        </button>
      </div>
      {exportMsg && <div className={styles.kvLine}>{exportMsg}</div>}

      <div className={`${styles.card} ${styles.logCard}`}>
        <div className={styles.logBox}>
          <table className={`${styles.table} ${own.samples}`}>
            <thead>
              <tr>
                <th className={styles.thNum}>ms</th>
                <th>{t('FAZ')}</th>
                <th className={styles.thNum}>{t('ÜST')}</th>
                <th className={styles.thNum}>{t('ALT')}</th>
                <th className={styles.thNum}>{t('SOL')}</th>
                <th className={styles.thNum}>{t('SAĞ')}</th>
                <th className={styles.thNum}>S1</th>
                <th className={styles.thNum}>S2</th>
                <th className={styles.thNum}>°C</th>
                <th className={styles.thNum}>{t('KAYMA Ü/A')}</th>
                <th>{t('ÜST KOMUT')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((r) =>
                r.phase === 'NOTE' ? (
                  <tr key={r.id} className={own.noteRow}>
                    <td className={`${styles.tdMono} ${styles.tdNum}`}>{r.elapsedMs}</td>
                    <td colSpan={10} className={styles.tdLog}>
                      {t(translateProgress(r.note ?? '', lang))}
                    </td>
                  </tr>
                ) : (
                  <SampleRow key={r.id} r={r} />
                ),
              )}
              {rows.length > MAX_ROWS && (
                <tr>
                  <td colSpan={11} className={styles.empty}>
                    {t('İlk {n} satır gösteriliyor — tamamı için CSV', { n: MAX_ROWS })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SampleRow({ r }: { r: ClampTelemetrySample }) {
  const m = `${own.mono}`
  return (
    <tr data-phase={r.phase}>
      <td className={`${m} ${own.num}`}>{r.elapsedMs}</td>
      <td className={own.phase}>{r.phase === 'CLAMP' ? 'SIK' : r.phase === 'JOB' ? 'İŞ' : 'SON'}</td>
      <td className={`${m} ${own.num}`} data-moving={r.upperMoving || undefined}>{r.upperMm.toFixed(2)}</td>
      <td className={`${m} ${own.num}`} data-moving={r.lowerMoving || undefined}>{r.lowerMm.toFixed(2)}</td>
      <td className={`${m} ${own.num}`}>{r.leftMm.toFixed(2)}</td>
      <td className={`${m} ${own.num}`}>{r.rightMm.toFixed(2)}</td>
      <td className={`${m} ${own.num}`}>{r.s1Bar}</td>
      <td className={`${m} ${own.num}`}>{r.s2Bar}</td>
      <td className={`${m} ${own.num}`}>{r.oilTempC}</td>
      <td className={`${m} ${own.num}`}>
        {r.phase === 'JOB' ? (
          r.upperUncmdMm != null || r.lowerUncmdMm != null ? (
            <>
              <span className={own.drift} data-kind={driftKind(r.upperUncmdMm)}>{r.upperUncmdMm != null ? r.upperUncmdMm.toFixed(3) : '—'}</span>/
              <span className={own.drift} data-kind={driftKind(r.lowerUncmdMm)}>{r.lowerUncmdMm != null ? r.lowerUncmdMm.toFixed(3) : '—'}</span>
            </>
          ) : (
            '—'
          )
        ) : r.upperDriftMm != null ? (
          <>
            <span className={own.drift} data-kind={driftKind(r.upperDriftMm)}>{r.upperDriftMm.toFixed(3)}</span>/
            <span className={own.drift} data-kind={driftKind(r.lowerDriftMm)}>{(r.lowerDriftMm ?? 0).toFixed(3)}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className={own.cmd}>{r.upperCmd ?? ''}</td>
    </tr>
  )
}

/** İş izlemesi: her paso için boşluk alma ve komutsuz kayma özeti */
function PasoTable({ pasos }: { pasos: ClampTelemetryPasoSummary[] }) {
  const t = useT()
  const lang = useLang()
  return (
    <div className={styles.card}>
      <div className={own.pasoTitle}>{t('PASO ÖZETİ — boşluk alma ve sıkışma (komutsuz kayma, − = üst top geri itildi)')}</div>
      <table className={`${styles.table} ${own.samples}`}>
        <thead>
          <tr>
            <th>{t('ADIM')}</th>
            <th className={styles.thNum}>{t('SÜRE')}</th>
            <th className={styles.thNum}>{t('BOŞLUK KOMUT/GERÇEK')}</th>
            <th className={styles.thNum}>{t('ÜST GERİ')}</th>
            <th className={styles.thNum}>{t('ÜST İLERİ')}</th>
            <th className={styles.thNum}>{t('ALT')}</th>
            <th className={styles.thNum}>{t('S1 MİN/MAKS')}</th>
            <th className={styles.thNum}>{t('ROTASYON')}</th>
          </tr>
        </thead>
        <tbody>
          {pasos.map((p) => (
            <tr key={p.no}>
              <td className={own.pasoLabel}>{t(translateProgress(p.label, lang))}</td>
              <td className={`${own.mono} ${own.num}`}>{p.durationSec != null ? `${p.durationSec.toFixed(1)} sn` : '…'}</td>
              <td className={`${own.mono} ${own.num}`}>
                {p.slackCount > 0 ? (
                  <span className={own.drift} data-kind={p.slackCmdMm > 0 && Math.abs(p.slackRealMm) < p.slackCmdMm * 0.5 ? 'warn' : undefined}>
                    {p.slackCmdMm.toFixed(2)} / {p.slackRealMm.toFixed(3)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className={`${own.mono} ${own.num}`}>
                <span className={own.drift} data-kind={driftKind(p.maxUpperRetreatMm)}>{p.maxUpperRetreatMm.toFixed(3)}</span>
              </td>
              <td className={`${own.mono} ${own.num}`}>
                <span className={own.drift} data-kind={driftKind(p.maxUpperAdvanceMm)}>{p.maxUpperAdvanceMm.toFixed(3)}</span>
              </td>
              <td className={`${own.mono} ${own.num}`}>
                <span className={own.drift} data-kind={driftKind(p.maxLowerUncmdMm)}>{p.maxLowerUncmdMm.toFixed(3)}</span>
              </td>
              <td className={`${own.mono} ${own.num}`}>
                {p.minS1Bar ?? '—'} / {p.maxS1Bar ?? '—'}
              </td>
              <td className={`${own.mono} ${own.num}`}>
                {p.rotStartMm.toFixed(0)} → {p.rotEndMm != null ? p.rotEndMm.toFixed(0) : '…'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Kv({ label, value, kind }: { label: string; value: string; kind?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className={styles.kv}>
      <span className={styles.filterLabel}>{label}</span>
      <span className={`${styles.kvValue} ${own.drift}`} data-kind={kind}>
        {value}
      </span>
    </div>
  )
}

/** Excel uyumlu CSV (';' ayraç, ondalık virgül) — DataApi /csv ile aynı sütunlar */
function buildCsv(s: ClampTelemetrySession): string {
  const f = (v: number | null | undefined, d = 3) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '')
  const b = (v: boolean) => (v ? '1' : '0')
  const esc = (x: string | null) => (x == null ? '' : `"${x.replace(/"/g, '""')}"`)
  const lines: string[] = []
  lines.push(
    `# Oturum #${s.id};${s.kind};İş #${s.bendingJobId ?? ''};${fmtDateTime(s.startedAt)};Sonuç ${s.success === true ? 'OK' : s.success === false ? 'HATA' : '?'};` +
      `Hedef ${f(s.targetPositionMm, 2)} mm;Bitiş üst ${f(s.endUpperMm)} alt ${f(s.endLowerMm)} mm;S1 ${s.endS1Bar ?? ''} bar;yağ ${s.endOilTempC ?? ''} °C;` +
      `Maks kayma üst ${f(s.maxUpperDriftMm)} alt ${f(s.maxLowerDriftMm)} mm;` +
      `Komutsuz üst geri ${f(s.maxUpperRetreatMm)} ileri ${f(s.maxUpperAdvanceMm)} alt ${f(s.maxLowerUncmdMm)} mm;` +
      `Min S1 (tutarken) ${s.minS1HoldBar ?? ''} bar;Boşluk alma ${s.slackCount ?? ''} kez ${f(s.slackTotalMm)} mm;${esc(s.errorMessage)}`,
  )
  if (s.pasoSummaryJson) lines.push(`# Paso özeti;${esc(s.pasoSummaryJson)}`)
  if (s.settingsJson) lines.push(`# Ayarlar;${esc(s.settingsJson)}`)
  lines.push(
    'ms;saat;faz;ust_mm;alt_mm;sol_mm;sag_mm;ust_hareket;ust_konumda;alt_hareket;rotasyon_mm;S1_bar;S2_bar;S1_akis;S2_akis;yag_C;nem_%;seviye_%;motor;sol_parca;sag_parca;ust_kayma_mm;alt_kayma_mm;ust_komut;alt_komut;ust_komutsuz_mm;alt_komutsuz_mm;adim;not',
  )
  for (const r of s.samples) {
    const time = fmtDateTime(r.capturedAt).slice(11)
    if (r.phase === 'NOTE') {
      lines.push(`${r.elapsedMs};${time};NOTE${';'.repeat(26)}${esc(r.note)}`)
      continue
    }
    lines.push(
      [
        r.elapsedMs, time, r.phase, f(r.upperMm), f(r.lowerMm), f(r.leftMm), f(r.rightMm), b(r.upperMoving), b(r.upperInPosition),
        b(r.lowerMoving), f(r.rotationMm, 2), r.s1Bar, r.s2Bar, r.s1FlowCms, r.s2FlowCms, r.oilTempC, r.oilHumidityPercent,
        r.oilLevelPercent, r.motorState, b(r.leftPartSensor), b(r.rightPartSensor), f(r.upperDriftMm), f(r.lowerDriftMm),
        esc(r.upperCmd ?? null), esc(r.lowerCmd ?? null), f(r.upperUncmdMm), f(r.lowerUncmdMm), esc(r.step ?? null), '',
      ].join(';'),
    )
  }
  return lines.join('\r\n')
}
