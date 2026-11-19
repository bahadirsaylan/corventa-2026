// BASINÇ DÜŞÜŞ TESTİ — KAYITLAR (2026-11-19). Admin Ayarları > TEST > BASINÇ DÜŞÜŞ TESTİ kartındaki KAYITLAR / KAYDI AÇ.
// Kaynak: Bending API GET /api/pressure-drop-test/logs (+ /{fileName}) — her testin CSV dosyası (pdt-*.csv) okunur.
// Üst alanı (1080×750) tamamen kaplayan panel; KAYDIRMA YOK: liste ve örnek tablosu sayfalanır, grafik sabit boyutlu.
//   Liste: zaman · top · hız · eşikler · sonuç · algılama / en büyük düşüş · süre — satıra dokun → kayıt.
//   Kayıt: sonuç + özet, S1/S2 grafiği (zaman veya konum ekseni, en düşük taban, algılama anı, tablo sayfası bandı —
//          grafiğe dokununca tablo o örneğe gider) ve sayfalı örnek tablosu.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PressureDropTestLogDetail, PressureDropTestLogSample, PressureDropTestLogSummary } from '@shared/types'
import { Icon } from '@/components/Icon'
import { useT, tp } from '@/i18n'
import css from './PressureDropLogsPanel.module.css'

const LIST_ROWS = 9
const TABLE_ROWS = 16
const S2_COLOR = '#dc2626'

const STATE_LABEL: Record<string, string> = {
  Detected: 'ALGILANDI',
  NotDetected: 'ALGILANMADI',
  Stopped: 'DURDURULDU',
  Failed: 'HATA',
  Running: 'SÜRÜYOR',
  Incomplete: 'YARIM',
}
// kart durum etiketiyle aynı: algılandı yeşil, algılanmadı sarı, durduruldu gri, hata kırmızı
const STATE_KIND: Record<string, string> = { Detected: 'ok', NotDetected: 'warn', Failed: 'err', Running: 'run' }

const errMsg = (e: unknown) => tp(e instanceof Error ? e.message : String(e))
/** "2026-11-19T13:39:47+03:00" → "2026-11-19 13:39:47" (makinenin yerel saati — dönüştürmeden) */
const fmtTime = (iso: string | null) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 19)}` : '—')
const sec = (ms: number) => (ms / 1000).toFixed(1)
const mm = (v: number | null | undefined, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—')
const dash = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '—')

/** Üst alanın ekrandaki yeri (AppLayout data-top-zone) — panel onu tam kaplar */
function useTopZoneRect() {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 1080, height: 750 })
  useLayoutEffect(() => {
    const el = document.querySelector('[data-top-zone]')
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return rect
}

export default function PressureDropLogsPanel({ initialFile, onClose }: { initialFile?: string | null; onClose: () => void }) {
  const t = useT()
  const rect = useTopZoneRect()
  const [file, setFile] = useState<string | null>(initialFile ?? null)
  const [listPage, setListPage] = useState(0)

  return createPortal(
    <div className={css.panel} style={rect} role="dialog" aria-modal>
      <div className={css.header}>
        <button type="button" className={css.roundBtn} onClick={() => (file ? setFile(null) : onClose())} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={css.title}>{file ? t('BASINÇ DÜŞÜŞ TESTİ KAYDI') : t('BASINÇ DÜŞÜŞ TESTİ KAYITLARI')}</h1>
        <span className={css.fileName}>{file ?? ''}</span>
        <button type="button" className={css.roundBtn} onClick={onClose} aria-label={t('Kapat')}>
          <Icon name="close" size="lg" />
        </button>
      </div>
      {file ? <LogDetail fileName={file} /> : <LogList page={listPage} setPage={setListPage} onOpen={setFile} />}
    </div>,
    document.body,
  )
}

// ───────────────────────────── LİSTE ─────────────────────────────

function LogList({ page, setPage, onOpen }: { page: number; setPage: (p: number) => void; onOpen: (f: string) => void }) {
  const t = useT()
  const [items, setItems] = useState<PressureDropTestLogSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await window.corventa.bending.pressureDropTestLogs())
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => void load(), [load])

  // Çalışan test listede ise 2 sn'de bir yenile (örnek sayısı / sonuç)
  const running = items?.some((x) => x.state === 'Running') ?? false
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => void load(), 2000)
    return () => clearInterval(id)
  }, [running, load])

  const pages = Math.max(1, Math.ceil((items?.length ?? 0) / LIST_ROWS))
  const p = Math.min(page, pages - 1)
  const rows = (items ?? []).slice(p * LIST_ROWS, (p + 1) * LIST_ROWS)

  return (
    <div className={css.body}>
      <div className={css.infoRow}>
        <p className={css.hint}>
          {t('Her test bir CSV dosyasına kaydedilir (en yeni önce, en fazla 200). Satıra dokunun: grafik ve örnekler.')}
        </p>
        <button type="button" className={css.btn} disabled={loading} onClick={() => void load()}>
          {loading ? t('YÜKLENİYOR…') : t('YENİLE')}
        </button>
      </div>
      {error && (
        <p className={css.error}>
          {t('Kayıtlar okunamadı')} — {error}
        </p>
      )}
      <div className={`${css.card} ${css.listCard}`}>
        <table className={css.table}>
          <colgroup>
            <col style={{ width: 166 }} />
            <col style={{ width: 98 }} />
            <col style={{ width: 58 }} />
            <col style={{ width: 214 }} />
            <col style={{ width: 150 }} />
            <col />
            <col style={{ width: 86 }} />
            <col style={{ width: 18 }} />
          </colgroup>
          <thead>
            <tr>
              <th>{t('ZAMAN')}</th>
              <th>{t('TOP')}</th>
              <th className={css.num}>{t('HIZ')}</th>
              <th>{t('EŞİK · PENCERE · TABAN')}</th>
              <th>{t('SONUÇ')}</th>
              <th>{t('ALGILAMA / EN BÜYÜK DÜŞÜŞ')}</th>
              <th className={css.num}>{t('SÜRE')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items && items.length === 0 && (
              <tr>
                <td colSpan={8} className={css.empty}>
                  {t('Henüz kayıtlı test yok')}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.fileName} className={css.listRow} onClick={() => onOpen(r.fileName)}>
                <td className={css.mono}>{fmtTime(r.startedAt)}</td>
                <td>{r.side === 'Right' ? t('SAĞ TOP') : r.side === 'Left' ? t('SOL TOP') : '—'}</td>
                <td className={`${css.mono} ${css.num}`}>{r.speedPercent != null ? `%${r.speedPercent}` : '—'}</td>
                <td className={css.mono}>
                  {dash(r.dropBar)} bar · {dash(r.windowMs)} ms · {dash(r.minBaseBar)} bar
                </td>
                <td>
                  <StateChip state={r.state} />
                </td>
                <td className={css.mono}>{detectText(r, t)}</td>
                <td className={`${css.mono} ${css.num}`}>
                  {sec(r.durationMs)} {t('sn')}
                </td>
                <td className={css.chev}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={p} pages={pages} setPage={setPage} />
      </div>
    </div>
  )
}

function detectText(r: PressureDropTestLogSummary, t: ReturnType<typeof useT>): string {
  const d = r.detectedAt
  if (d) return t('{sensor} {from}→{to} bar · {pos} mm', { sensor: d.sensor, from: d.fromBar, to: d.toBar, pos: mm(d.positionMm) })
  return t('en büyük: S2 {s2} bar', { s2: r.maxDropS2 })
}

function StateChip({ state }: { state: string }) {
  const t = useT()
  return (
    <span className={css.chip} data-kind={STATE_KIND[state]}>
      {t(STATE_LABEL[state] ?? state)}
    </span>
  )
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
  const t = useT()
  return (
    <div className={css.pager}>
      <button type="button" className={css.pagerBtn} disabled={page <= 0} onClick={() => setPage(page - 1)} aria-label={t('Önceki sayfa')}>
        ‹
      </button>
      <span className={css.pagerInfo}>
        {page + 1} / {pages}
      </span>
      <button type="button" className={css.pagerBtn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label={t('Sonraki sayfa')}>
        ›
      </button>
    </div>
  )
}

// ───────────────────────────── KAYIT ─────────────────────────────

type Axis = 'time' | 'pos'

function LogDetail({ fileName }: { fileName: string }) {
  const t = useT()
  const [d, setD] = useState<PressureDropTestLogDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [axis, setAxis] = useState<Axis>('time')
  const [page, setPage] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setD(await window.corventa.bending.pressureDropTestLog(fileName))
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    }
  }, [fileName])
  useEffect(() => void load(), [load])
  const running = d?.state === 'Running'
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => void load(), 1000)
    return () => clearInterval(id)
  }, [running, load])

  const samples = d?.samples ?? []
  // Sayfalar SONDAN hizalı: son sayfa dolu (algılama / sonuç anı test sonunda), eksik sayfa en başta
  const n = samples.length
  const pages = Math.max(1, Math.ceil(n / TABLE_ROWS))
  const pageOf = (i: number) => pages - 1 - Math.floor((n - 1 - i) / TABLE_ROWS)
  // Varsayılan sayfa: algılama anının sayfası (yoksa son sayfa — sonuç anı)
  const detIdx = useMemo(() => samples.findIndex((s) => s.detected), [samples])
  const p = Math.max(0, Math.min(page ?? (detIdx >= 0 ? pageOf(detIdx) : pages - 1), pages - 1))
  const start = Math.max(0, n - (pages - p) * TABLE_ROWS)
  const rows = samples.slice(start, n - (pages - 1 - p) * TABLE_ROWS)

  if (error)
    return (
      <div className={css.body}>
        <p className={css.error}>
          {t('Kayıt okunamadı')} — {error}
        </p>
      </div>
    )
  if (!d) return <div className={css.body}>{t('Yükleniyor…')}</div>

  const settingsDiffer =
    d.settingsDropBar != null &&
    (d.settingsDropBar !== d.dropBar || d.settingsWindowMs !== d.windowMs || d.settingsMinBaseBar !== d.minBaseBar)

  return (
    <div className={css.body}>
      <div className={`${css.card} ${css.summary}`}>
        <div className={css.resultRow}>
          <StateChip state={d.state} />
          <span className={css.resultText} data-kind={STATE_KIND[d.state]}>
            {resultText(d, t)}
          </span>
          <span className={css.time}>{fmtTime(d.startedAt)}</span>
        </div>
        <div className={css.kvGrid}>
          <Kv label={t('TOP · HIZ')} value={`${d.side === 'Right' ? t('SAĞ TOP') : d.side === 'Left' ? t('SOL TOP') : '—'} · %${dash(d.speedPercent)}`} />
          <Kv label={t('EŞİK · PENCERE · TABAN')} value={`${dash(d.dropBar)} bar · ${dash(d.windowMs)} ms · ${dash(d.minBaseBar)} bar`} />
          <Kv
            label={t('KAYITLI AYAR')}
            value={d.settingsDropBar != null ? `${d.settingsDropBar} · ${dash(d.settingsWindowMs)} · ${dash(d.settingsMinBaseBar)}` : '—'}
            kind={settingsDiffer ? 'warn' : undefined}
          />
          <Kv label={t('KONUM BAŞ → BİTİŞ')} value={`${mm(d.startPositionMm)} → ${mm(d.endPositionMm)} mm`} />
          <Kv label={t('KURS SONU (HEDEF)')} value={`${mm(d.targetPositionMm)} mm`} />
          <Kv label={t('SÜRE · ÖRNEK')} value={`${sec(d.durationMs)} ${t('sn')} · ${d.sampleCount}`} />
          {/* 2026-11-19: sadece S2 (yan toplar S2 devresinde) */}
          <Kv label={t('EN BÜYÜK DÜŞÜŞ S2')} value={`${d.maxDropS2} bar`} />
          <Kv label={t('EN YÜKSEK S2')} value={`${d.maxS2} bar`} />
        </div>
      </div>

      <div className={css.detailRow}>
        <div className={`${css.card} ${css.chartCard}`}>
          <div className={css.chartHead}>
            <div className={css.seg}>
              <button type="button" className={css.segBtn} data-on={axis === 'time' || undefined} onClick={() => setAxis('time')}>
                {t('ZAMAN EKSENİ')}
              </button>
              <button type="button" className={css.segBtn} data-on={axis === 'pos' || undefined} onClick={() => setAxis('pos')}>
                {t('KONUM EKSENİ')}
              </button>
            </div>
            <div className={css.legend}>
              <span>
                <i className={css.swatch} style={{ background: S2_COLOR }} />S2
              </span>
              <span>
                <i className={css.swatch} data-dashed />
                {t('EN DÜŞÜK TABAN')}
              </span>
            </div>
          </div>
          <LogChart
            samples={samples}
            axis={axis}
            minBaseBar={d.minBaseBar ?? 0}
            band={rows.length ? [start, start + rows.length - 1] : null}
            onPick={(i) => setPage(pageOf(i))}
          />
          <p className={css.chartNote}>{t('Grafiğe dokunun: tablo o ana gider. Gri bant = tablodaki örnekler.')}</p>
        </div>

        <div className={`${css.card} ${css.tableCard}`}>
          <table className={`${css.table} ${css.sampleTable}`}>
            <thead>
              <tr>
                <th className={css.num}>{t('ZAMAN')}</th>
                <th className={css.num}>{t('KONUM')}</th>
                <th className={css.num}>S2</th>
                <th className={css.num}>{t('TEPE')}</th>
                <th className={css.num}>{t('DÜŞÜŞ')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className={css.empty}>
                    {t('Örnek yok')}
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <SampleRow key={s.elapsedMs} s={s} />
              ))}
            </tbody>
          </table>
          <div className={css.tableFoot}>
            <span className={css.unitNote}>{t('sn · mm · bar')}</span>
            <Pager page={p} pages={pages} setPage={setPage} />
          </div>
        </div>
      </div>
    </div>
  )
}

function resultText(d: PressureDropTestLogSummary, t: ReturnType<typeof useT>): string {
  const det = d.detectedAt
  if (d.state === 'Detected' && det)
    return (
      t("BASINÇ DÜŞÜŞÜ ALGILANDI — {sensor} {from}→{to} bar, {pos} mm'de", {
        sensor: det.sensor, from: det.fromBar, to: det.toBar, pos: mm(det.positionMm),
      }) + ` (${sec(det.elapsedMs)} ${t('sn')})`
    )
  if (d.state === 'Running') return t('Test sürüyor — top ileri gidiyor, basınç izleniyor.')
  if (d.state === 'Incomplete') return t('Sonuç satırı yok — test tamamlanmadan kapanmış olabilir.')
  return d.message ? tp(d.message) : t(STATE_LABEL[d.state] ?? d.state)
}

function Kv({ label, value, kind }: { label: string; value: string; kind?: string }) {
  return (
    <div className={css.kv} data-kind={kind}>
      <span className={css.kvLabel}>{label}</span>
      <span className={css.kvValue}>{value}</span>
    </div>
  )
}

function SampleRow({ s }: { s: PressureDropTestLogSample }) {
  const hi = (v: number, kind: boolean) => (kind ? <b className={css.hot}>{v}</b> : v)
  return (
    <tr data-det={s.detected || undefined} data-wait={!s.ready || undefined}>
      <td className={`${css.mono} ${css.num}`}>{sec(s.elapsedMs)}</td>
      <td className={`${css.mono} ${css.num}`}>{s.positionMm.toFixed(2)}</td>
      <td className={`${css.mono} ${css.num}`}>
        <span style={{ color: S2_COLOR }}>{s.s2}</span>
      </td>
      <td className={`${css.mono} ${css.num}`}>
        {s.peakS2}
      </td>
      <td className={`${css.mono} ${css.num}`}>
        {hi(s.dropS2, s.detected)}
      </td>
    </tr>
  )
}

/** S1/S2 çizgi grafiği — tüm örnekler; en düşük taban kesik çizgi, algılama dikey çizgi, tablo sayfası gri bant. */
function LogChart({
  samples, axis, minBaseBar, band, onPick,
}: {
  samples: PressureDropTestLogSample[]
  axis: Axis
  minBaseBar: number
  band: [number, number] | null
  onPick: (index: number) => void
}) {
  // SVG kutunun gerçek boyutunda çizilir (viewBox = piksel) — yazılar ölçeklenmez, boşluk kalmaz
  const boxRef = useRef<HTMLDivElement>(null)
  const hasData = samples.length > 0
  const [size, setSize] = useState({ w: 600, h: 400 })
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(120, el.clientHeight) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasData]) // boş ↔ dolu geçişinde kutu elemanı değişir
  const W = size.w
  const H = size.h
  const PAD_L = 38
  const PAD_R = 10
  const PAD_T = 10
  const PAD_B = 26
  if (!samples.length) {
    return (
      <div ref={boxRef} className={css.chartBox}>
        <svg className={css.chart} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#d1d5db" />
        </svg>
      </div>
    )
  }
  const xv = (s: PressureDropTestLogSample) => (axis === 'time' ? s.elapsedMs / 1000 : s.positionMm)
  let x0 = Infinity
  let x1 = -Infinity
  let top = minBaseBar
  for (const s of samples) {
    const v = xv(s)
    if (v < x0) x0 = v
    if (v > x1) x1 = v
    top = Math.max(top, s.s2)
  }
  if (x1 - x0 < 1) x1 = x0 + 1
  // yuvarlak ölçek: adım 25 / 50 / 100 bar, en fazla ~6 çizgi
  const step = top <= 110 ? 25 : top <= 280 ? 50 : 100
  const yMax = Math.max(50, Math.ceil((top * 1.05) / step) * step)
  const X = (v: number) => PAD_L + ((v - x0) / (x1 - x0)) * (W - PAD_L - PAD_R)
  const Y = (bar: number) => H - PAD_B - (Math.max(0, bar) / yMax) * (H - PAD_B - PAD_T)
  const path = (sel: (s: PressureDropTestLogSample) => number) =>
    samples.map((s, i) => `${i ? 'L' : 'M'}${X(xv(s)).toFixed(1)},${Y(sel(s)).toFixed(1)}`).join(' ')
  const yTicks: number[] = []
  for (let v = 0; v <= yMax; v += yMax / step > 6 ? step * 2 : step) yTicks.push(v)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => x0 + f * (x1 - x0))
  const unit = axis === 'time' ? 's' : 'mm'
  const detIdx = samples.findIndex((s) => s.detected)
  const det = detIdx >= 0 ? samples[detIdx] : null
  const bandX = band ? [X(xv(samples[band[0]])), X(xv(samples[band[1]]))].sort((a, b) => a - b) : null

  // Dokunulan x → en yakın örnek (konum ekseninde geri dönüş olabilir — en yakın x)
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    let best = 0
    let bd = Infinity
    samples.forEach((s, i) => {
      const dd = Math.abs(X(xv(s)) - vx)
      if (dd < bd) {
        bd = dd
        best = i
      }
    })
    onPick(best)
  }

  return (
    <div ref={boxRef} className={css.chartBox}>
    <svg className={css.chart} width={W} height={H} viewBox={`0 0 ${W} ${H}`} onPointerDown={pick} role="img" aria-hidden>
      {bandX && <rect x={bandX[0] - 2} y={PAD_T} width={Math.max(4, bandX[1] - bandX[0] + 4)} height={H - PAD_B - PAD_T} fill="#e5e7eb" />}
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={PAD_L} y1={Y(v)} x2={W - PAD_R} y2={Y(v)} stroke="#eef0f3" />
          <text x={PAD_L - 5} y={Y(v) + 4} fontSize="11" textAnchor="end" fill="#6b7280">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {xTicks.map((v, i) => (
        <text
          key={`x${i}`}
          x={X(v)}
          y={H - 8}
          fontSize="11"
          textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          fill="#6b7280"
        >
          {v.toFixed(1)} {unit}
        </text>
      ))}
      <text x={PAD_L + 2} y={PAD_T + 11} fontSize="11" fill="#6b7280">
        bar
      </text>
      {minBaseBar > 0 && minBaseBar < yMax && (
        <line x1={PAD_L} y1={Y(minBaseBar)} x2={W - PAD_R} y2={Y(minBaseBar)} stroke="#9ca3af" strokeDasharray="5 4" />
      )}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#d1d5db" />
      <path d={path((s) => s.s2)} fill="none" stroke={S2_COLOR} strokeWidth="2" />
      {det && (
        <g>
          <line x1={X(xv(det))} y1={PAD_T} x2={X(xv(det))} y2={H - PAD_B} stroke="#111827" strokeDasharray="4 3" />
          <circle cx={X(xv(det))} cy={Y(det.s2)} r="5" fill="#111827" />
        </g>
      )}
    </svg>
    </div>
  )
}
