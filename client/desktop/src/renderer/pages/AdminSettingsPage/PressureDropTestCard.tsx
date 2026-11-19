// BASINÇ DÜŞÜŞ TESTİ (2026-11-19) — Admin Ayarları > TEST > BASINÇ DÜŞÜŞ TESTİ alt sekmesi.
// Operatör makineyi stage'e alıp parçayı ELLE sıkıştırır; burada top (sol/sağ), hız ve basınç düşüşü eşikleri seçilir.
// Bending API /api/pressure-drop-test: seçilen yan top güvenli ileri sınıra gider, büküm sırasındaki basınç düşüşü
// kuralıyla (aynı kod) izlenir; düşüş / kurs sonu / DURDUR'da top durur ve GERİ ÇEKİLMEZ.
// Eşikler Admin Ayarları'ndaki kayıtlı değerlerle dolar; burada değiştirmek ayarı KAYDETMEZ (sadece bu test).
// Yerleşim (üst alan, kaydırmasız): sol sütun = parametreler + TEST KAYITLARI, sağ sütun = başlat/durdur + canlı değerler +
// grafik + sonuç (+ KAYDI AÇ). KAYITLAR / KAYDI AÇ üst alanı kaplayan PressureDropLogsPanel'i açar (geçmiş CSV kayıtları).

import { useEffect, useRef, useState } from 'react'
import type { PressureDropTestSample, PressureDropTestSide, PressureDropTestStatus } from '@shared/types'
import {
  SettingsSection,
  settingsFormStyles as styles,
  type SectionDef,
  type SettingValue,
  type Values,
} from '@/components/SettingsForm/SettingsForm'
import { useT, tp } from '@/i18n'
import css from './PressureDropTestCard.module.css'
import PressureDropLogsPanel from './PressureDropLogsPanel'

const CHART_SAMPLES = 150 // 100 ms örnek → son 15 sn
const DEFAULT_SPEED = 20

const SECTION: SectionDef = {
  title: 'BASINÇ DÜŞÜŞ TESTİ',
  note: "Makineyi stage'e alıp parçayı elle sıkıştırın, sonra testi başlatın. Seçilen top kurs sonuna kadar ileri gider; basınç aniden düşerse durur. Buradaki eşikler kaydedilmez — sadece bu test için.",
  fields: [
    {
      type: 'select',
      key: 'side',
      label: 'TEST EDİLEN TOP',
      options: [
        { value: 'Left', label: 'SOL TOP' },
        { value: 'Right', label: 'SAĞ TOP' },
      ],
    },
    { key: 'speedPercent', label: 'HIZ', unit: '%', min: 1, max: 100, integer: true },
    { key: 'dropBar', label: 'BASINÇ DÜŞÜŞÜ EŞİĞİ', unit: 'bar', min: 1, max: 250, integer: true },
    { key: 'windowMs', label: 'BASINÇ DÜŞÜŞÜ PENCERESİ', unit: 'ms', min: 50, max: 5000, integer: true },
    { key: 'minBaseBar', label: 'BASINÇ DÜŞÜŞÜ EN DÜŞÜK TABAN', unit: 'bar', min: 0, max: 250, integer: true },
  ],
}

const STATE_LABEL: Record<string, string> = {
  Idle: 'HAZIR',
  Running: 'TEST SÜRÜYOR',
  Detected: 'DÜŞÜŞ ALGILANDI',
  NotDetected: 'ALGILANMADI',
  Stopped: 'DURDURULDU',
  Failed: 'HATA',
}
const STATE_KIND: Record<string, string> = { Running: 'run', Detected: 'ok', NotDetected: 'warn', Stopped: 'warn', Failed: 'err' }

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const num = (v: SettingValue | undefined, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** settings = Admin Ayarları'nın KAYITLI makine ayarları (eşiklerin başlangıç değeri). */
export default function PressureDropTestCard({ bendingActive, settings }: { bendingActive: boolean; settings: Values }) {
  const t = useT()
  const saved: Values = {
    side: 'Left',
    speedPercent: DEFAULT_SPEED,
    dropBar: num(settings.pressureDropBar, 20),
    windowMs: num(settings.pressureDropWindowMs, 300),
    minBaseBar: num(settings.pressureDropMinBaseBar, 30),
  }
  const [values, setValues] = useState<Values>(saved)
  const [st, setSt] = useState<PressureDropTestStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** KAYITLAR paneli: null = kapalı, { file: null } = liste, { file } = o kayıt */
  const [logs, setLogs] = useState<{ file: string | null } | null>(null)
  const active = st?.active === true
  const activeRef = useRef(active)
  activeRef.current = active

  // Kayıtlı ayarlar sonradan yüklenirse (veya KAYDET sonrası) eşikler güncellensin — kullanıcı değiştirmediyse
  const savedKey = `${saved.dropBar}|${saved.windowMs}|${saved.minBaseBar}`
  const savedKeyRef = useRef(savedKey)
  useEffect(() => {
    const prev = savedKeyRef.current.split('|').map(Number)
    savedKeyRef.current = savedKey
    setValues((v) => ({
      ...v,
      dropBar: v.dropBar === prev[0] ? saved.dropBar : v.dropBar,
      windowMs: v.windowMs === prev[1] ? saved.windowMs : v.windowMs,
      minBaseBar: v.minBaseBar === prev[2] ? saved.minBaseBar : v.minBaseBar,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  // Durum: çalışırken 300 ms, değilse 2 sn'de bir
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const s = await window.corventa.bending.pressureDropTestStatus(CHART_SAMPLES)
        if (alive) setSt(s)
      } catch {
        /* backend anlık yok — bir sonraki turda */
      }
      if (alive) timer = setTimeout(tick, activeRef.current ? 300 : 2000)
    }
    void tick()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  async function start() {
    setBusy(true)
    setErr(null)
    try {
      const r = await window.corventa.bending.pressureDropTestStart({
        side: (values.side === 'Right' ? 'Right' : 'Left') as PressureDropTestSide,
        speedPercent: num(values.speedPercent, DEFAULT_SPEED),
        dropBar: num(values.dropBar, 20),
        windowMs: num(values.windowMs, 300),
        minBaseBar: num(values.minBaseBar, 30),
      })
      if (!r.success) setErr(r.errorMessage ?? t('Test başlatılamadı'))
      if (r.status) setSt(r.status)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    setBusy(true)
    try {
      const r = await window.corventa.bending.pressureDropTestStop()
      if (r.status) setSt(r.status)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const blocked = bendingActive ? 'Büküm devam ediyor — test başlatılamaz.' : null
  const ran = st != null && st.state !== 'Idle'
  const sideLabel = st?.side === 'Right' ? t('SAĞ TOP') : t('SOL TOP')
  const pos = st?.currentPositionMm
  // Biten testin kaydı (backend csvFileName; eski backend → yoldan)
  const lastFile = st?.csvFileName ?? st?.csvPath?.split(/[\\/]/).pop()?.replace(/\s.*$/, '') ?? null
  const canOpenLast = ran && !active && !!lastFile && /^pdt-.*\.csv$/.test(lastFile)

  return (
    <>
      {/* ── Sol sütun: parametreler + başlat/durdur + canlı değerler ── */}
      <SettingsSection
        section={SECTION}
        values={values}
        original={saved}
        disabled={active || busy}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
      />

      {/* Geçmiş testler — sol sütunun altında tek satır (kaydırmasız) */}
      <div className={`${styles.card} ${css.logsCard}`}>
        <div className={css.logsText}>
          <span className={css.logsTitle}>{t('TEST KAYITLARI')}</span>
          <span className={css.logsNote}>{t('Geçmiş testler: grafik, eşikler, tüm örnekler')}</span>
        </div>
        <button type="button" className={styles.resetBtn} onClick={() => setLogs({ file: null })}>
          {t('KAYITLAR')}
        </button>
      </div>

      {/* ── Sağ sütun: başlat/durdur + canlı değerler + grafik + sonuç (tek kart, kaydırmasız) ── */}
      <div className={styles.card} style={{ breakBefore: 'column' }}>
        <div className={css.buttons}>
          {active ? (
            <button type="button" className={styles.resetBtn} disabled={busy} onClick={() => void stop()}>
              {t('DURDUR')}
            </button>
          ) : (
            <button type="button" className={styles.saveBtn} disabled={busy || !!blocked} onClick={() => void start()}>
              {t('TESTİ BAŞLAT')}
            </button>
          )}
          <span className={css.stateTag} data-kind={STATE_KIND[st?.state ?? ''] ?? undefined}>
            {t(STATE_LABEL[st?.state ?? 'Idle'] ?? st?.state ?? '')}
            {ran ? ` · ${sideLabel} · %${st?.speedPercent}` : ''}
          </span>
        </div>
        <div className={css.live}>
          <Cell label={t('KONUM')} value={ran && pos != null ? `${pos.toFixed(1)} mm` : '—'} />
          {/* 2026-11-19 (kullanıcı): yan toplar S2 devresinde — sadece S2 izlenir / gösterilir */}
          <Cell label={t('BASINÇ S2')} value={st?.s2 != null ? `${st.s2} bar` : '—'} />
          <Cell label={t('SÜRE')} value={ran ? `${((st?.elapsedMs ?? 0) / 1000).toFixed(1)} ${t('sn')}` : '—'} />
          <Cell label={t('TEPE S2')} value={ran ? `${st?.peakS2 ?? 0} bar` : '—'} />
          <Cell label={t('DÜŞÜŞ S2')} value={ran ? `${st?.dropS2 ?? 0} bar` : '—'} />
          <Cell label={t('EN BÜYÜK DÜŞÜŞ')} value={ran ? `${st?.maxDropS2 ?? 0} bar` : '—'} />
        </div>
        <Chart samples={st?.recentSamples ?? []} status={st} />
        <div className={css.legend}>
          <span>
            <i className={css.swatch} style={{ background: '#dc2626' }} />S2
          </span>
          <span>
            <i className={css.swatch} style={{ background: '#9ca3af' }} />
            {t('EN DÜŞÜK TABAN')}
          </span>
          <span>{t('Son {n} sn', { n: CHART_SAMPLES / 10 })}</span>
        </div>
        {/* Başlatma hatası / engel sonuç alanının YERİNE gösterilir — kart sütun yüksekliğini aşmasın (kaydırmasız) */}
        {err || (!active && blocked) ? (
          <p className={styles.message} data-kind="err">
            {err ?? t(blocked ?? '')}
          </p>
        ) : (
          <Result st={st} />
        )}
        {!err && ran && st && (
          <p className={css.resultNote}>
            {t('Kullanılan eşikler: {d} bar · {w} ms · taban {b} bar (kayıtlı ayar: {sd} bar · {sw} ms · {sb} bar)', {
              d: st.dropBar, w: st.windowMs, b: st.minBaseBar, sd: st.settingsDropBar, sw: st.settingsWindowMs, sb: st.settingsMinBaseBar,
            })}
          </p>
        )}
        {st?.csvPath && (
          <div className={css.pathRow}>
            <p className={css.path}>
              {t('Kayıt dosyası (CSV):')} {st.csvPath}
            </p>
            {canOpenLast && (
              <button type="button" className={`${styles.resetBtn} ${css.openBtn}`} onClick={() => setLogs({ file: lastFile })}>
                {t('KAYDI AÇ')}
              </button>
            )}
          </div>
        )}
      </div>
      {logs && <PressureDropLogsPanel initialFile={logs.file} onClose={() => setLogs(null)} />}
    </>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.cell}>
      <span className={css.cellLabel}>{label}</span>
      <span className={css.cellValue}>{value}</span>
    </div>
  )
}

function Result({ st }: { st: PressureDropTestStatus | null }) {
  const t = useT()
  if (!st || st.state === 'Idle')
    return <p className={css.result} data-kind="info">{t('Henüz test yapılmadı.')}</p>
  if (st.state === 'Running')
    return <p className={css.result} data-kind="info">{t('Test sürüyor — top ileri gidiyor, basınç izleniyor.')}</p>
  const maxDrop = t('en büyük düşüş S2 {s2} bar', { s2: st.maxDropS2 })
  const left = <p className={css.resultNote}>{t('Top durduruldu ve geri çekilmedi — gerekirse elle geri alın.')}</p>
  if (st.state === 'Detected' && st.detectedAt) {
    const d = st.detectedAt
    return (
      <>
        <p className={css.result} data-kind="ok">
          {t("BASINÇ DÜŞÜŞÜ ALGILANDI — {sensor} {from}→{to} bar, {pos} mm'de", {
            sensor: d.sensor, from: d.fromBar, to: d.toBar, pos: d.positionMm.toFixed(1),
          })}
          {` (${(d.elapsedMs / 1000).toFixed(1)} ${t('sn')})`}
        </p>
        {left}
      </>
    )
  }
  if (st.state === 'NotDetected') {
    return (
      <>
        <p className={css.result} data-kind="none">
          {st.endReason === 'Stall'
            ? t('ALGILANMADI — top ilerlemedi ({pos} mm) ({max})', { pos: (st.currentPositionMm ?? 0).toFixed(1), max: maxDrop })
            : t('KURS SONUNA KADAR ALGILANMADI ({max})', { max: maxDrop })}
        </p>
        {left}
      </>
    )
  }
  // Stopped / Failed — backend mesajı (sebep) olduğu gibi
  return (
    <>
      <p className={css.result} data-kind="none">
        {t(STATE_LABEL[st.state] ?? st.state)}
        {st.message ? ` — ${tp(st.message)}` : ''}
      </p>
      {left}
    </>
  )
}

/** S1/S2 çizgi grafiği (son örnekler) — en düşük taban kesik çizgi, algılama anı dikey çizgi. */
function Chart({ samples, status }: { samples: PressureDropTestSample[]; status: PressureDropTestStatus | null }) {
  const W = 460
  const H = 112
  const PAD_L = 30
  const PAD_B = 16
  const PAD_T = 6
  const PAD_R = 6
  if (!samples.length) {
    return (
      <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden>
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#d1d5db" />
      </svg>
    )
  }
  const t0 = samples[0].elapsedMs
  const t1 = Math.max(t0 + 1000, samples[samples.length - 1].elapsedMs)
  const yMax = Math.max(50, Math.ceil((Math.max(...samples.map((s) => s.s2), status?.minBaseBar ?? 0) * 1.1) / 25) * 25)
  const x = (ms: number) => PAD_L + ((ms - t0) / (t1 - t0)) * (W - PAD_L - PAD_R)
  const y = (bar: number) => H - PAD_B - (Math.max(0, bar) / yMax) * (H - PAD_B - PAD_T)
  const line = (sel: (s: PressureDropTestSample) => number) =>
    samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.elapsedMs).toFixed(1)},${y(sel(s)).toFixed(1)}`).join(' ')
  const ticks = [0, yMax / 2, yMax]
  const det = status?.detectedAt
  const detX = det && det.elapsedMs >= t0 ? x(det.elapsedMs) : null
  return (
    <svg className={css.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="#eef0f3" />
          <text x={PAD_L - 4} y={y(v) + 3} fontSize="9" textAnchor="end" fill="#6b7280">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {status && status.minBaseBar > 0 && status.minBaseBar < yMax && (
        <line x1={PAD_L} y1={y(status.minBaseBar)} x2={W - PAD_R} y2={y(status.minBaseBar)} stroke="#9ca3af" strokeDasharray="4 3" />
      )}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#d1d5db" />
      <text x={PAD_L} y={H - 3} fontSize="9" fill="#6b7280">
        {(t0 / 1000).toFixed(1)} s
      </text>
      <text x={W - PAD_R} y={H - 3} fontSize="9" textAnchor="end" fill="#6b7280">
        {(t1 / 1000).toFixed(1)} s
      </text>
      <path d={line((s) => s.s2)} fill="none" stroke="#dc2626" strokeWidth="1.8" />
      {detX != null && <line x1={detX} y1={PAD_T} x2={detX} y2={H - PAD_B} stroke="#111827" strokeDasharray="3 2" />}
    </svg>
  )
}
