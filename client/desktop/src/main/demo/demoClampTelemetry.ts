// DEMO — makineden alınan SIKIŞTIRMA KAYDI CSV'lerini (Sıkıştırma Kayıtları ekranındaki CSV düğmesi) demoda göstermek
// için (2026-11-05). Klasör: <userData>/demo-clamp-logs/*.csv — ekrandaki "CSV İÇE AKTAR" buraya kopyalar.
// CSV'den DataApi sözleşmesindeki ClampTelemetrySession (+ samples) geri kurulur; ekran gerçek makinedeki gibi açılır.
// Sadece okuma — makineye / DataApi'ye hiçbir şey gönderilmez.

import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ClampTelemetryPage, ClampTelemetryPhase, ClampTelemetrySample, ClampTelemetrySession } from '@shared'

export function clampLogsDir(): string {
  const dir = join(app.getPath('userData'), 'demo-clamp-logs')
  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    /* okuma sırasında tekrar denenir */
  }
  return dir
}

/** ';' ayraçlı, "..." tırnaklı ("" kaçışlı) CSV — tırnak içinde satır sonu olabilir (log satırları). */
function parseRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += ch
      continue
    }
    if (ch === '"') inQ = true
    else if (ch === ';') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}
const n0 = (s: string | undefined) => num(s) ?? 0
const bool = (s: string | undefined) => (s ?? '').trim() === '1'

/** "2026-11-05 18:43:56" (ekran yerel saati) → ms */
function localToMs(s: string): number | null {
  const m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
}

function pick(re: RegExp, s: string): RegExpExecArray | null {
  return re.exec(s)
}

export function parseClampCsv(text: string, fileName: string): ClampTelemetrySession {
  const rows = parseRows(text.replace(/^﻿/, ''))
  if (rows.length === 0 || !rows[0][0]?.startsWith('# Oturum')) throw new Error(`${fileName}: sıkıştırma kaydı CSV'si değil`)
  const head = rows[0]
  const headLine = head.join(';')
  const startMs = localToMs(head[3] ?? '') ?? Date.now()
  let pasoSummaryJson: string | null = null
  let settingsJson: string | null = null
  let hdrIdx = -1
  for (let i = 1; i < rows.length; i++) {
    const r0 = rows[i][0] ?? ''
    if (r0.startsWith('# Paso özeti')) pasoSummaryJson = rows[i][1] ?? null
    else if (r0.startsWith('# Ayarlar')) settingsJson = rows[i][1] ?? null
    else if (r0 === 'ms') {
      hdrIdx = i
      break
    }
  }
  if (hdrIdx < 0) throw new Error(`${fileName}: sütun başlığı bulunamadı`)
  const H = rows[hdrIdx]
  const col = (name: string) => H.indexOf(name)
  const c = {
    ms: col('ms'), faz: col('faz'), ust: col('ust_mm'), alt: col('alt_mm'), sol: col('sol_mm'), sag: col('sag_mm'),
    ustH: col('ust_hareket'), ustK: col('ust_konumda'), altH: col('alt_hareket'), rot: col('rotasyon_mm'),
    s1: col('S1_bar'), s2: col('S2_bar'), s1a: col('S1_akis'), s2a: col('S2_akis'), yag: col('yag_C'), nem: col('nem_%'),
    sev: col('seviye_%'), motor: col('motor'), solP: col('sol_parca'), sagP: col('sag_parca'), uK: col('ust_kayma_mm'),
    aK: col('alt_kayma_mm'), uCmd: col('ust_komut'), aCmd: col('alt_komut'), uU: col('ust_komutsuz_mm'),
    aU: col('alt_komutsuz_mm'), adim: col('adim'), not: col('not'),
  }
  const g = (r: string[], i: number) => (i >= 0 ? r[i] : undefined)

  const samples: ClampTelemetrySample[] = []
  let id = 1
  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 3 || r[0].trim() === '') continue
    const ms = n0(g(r, c.ms))
    const phase = (g(r, c.faz) ?? '').trim() as ClampTelemetryPhase
    const at = new Date(startMs + ms).toISOString()
    if (phase === 'NOTE') {
      samples.push({
        id: id++, sessionId: 0, capturedAt: at, elapsedMs: ms, phase, upperMm: 0, lowerMm: 0, leftMm: 0, rightMm: 0,
        upperMoving: false, upperInPosition: false, lowerMoving: false, rotationMm: 0, s1Bar: 0, s2Bar: 0, s1FlowCms: 0,
        s2FlowCms: 0, oilTempC: 0, oilHumidityPercent: 0, oilLevelPercent: 0, motorState: 0, leftPartSensor: false,
        rightPartSensor: false, upperDriftMm: null, lowerDriftMm: null, note: g(r, c.not) ?? r[r.length - 1] ?? '',
      })
      continue
    }
    samples.push({
      id: id++, sessionId: 0, capturedAt: at, elapsedMs: ms, phase,
      upperMm: n0(g(r, c.ust)), lowerMm: n0(g(r, c.alt)), leftMm: n0(g(r, c.sol)), rightMm: n0(g(r, c.sag)),
      upperMoving: bool(g(r, c.ustH)), upperInPosition: bool(g(r, c.ustK)), lowerMoving: bool(g(r, c.altH)),
      rotationMm: n0(g(r, c.rot)), s1Bar: n0(g(r, c.s1)), s2Bar: n0(g(r, c.s2)), s1FlowCms: n0(g(r, c.s1a)),
      s2FlowCms: n0(g(r, c.s2a)), oilTempC: n0(g(r, c.yag)), oilHumidityPercent: n0(g(r, c.nem)),
      oilLevelPercent: n0(g(r, c.sev)), motorState: n0(g(r, c.motor)), leftPartSensor: bool(g(r, c.solP)),
      rightPartSensor: bool(g(r, c.sagP)), upperDriftMm: num(g(r, c.uK)), lowerDriftMm: num(g(r, c.aK)),
      upperCmd: g(r, c.uCmd) || null, lowerCmd: g(r, c.aCmd) || null, upperUncmdMm: num(g(r, c.uU)),
      lowerUncmdMm: num(g(r, c.aU)), step: g(r, c.adim) || null, note: null,
    })
  }

  const data = samples.filter((s) => s.phase !== 'NOTE')
  const clamp = data.filter((s) => s.phase === 'CLAMP')
  const job = data.filter((s) => s.phase === 'JOB')
  const after = data.filter((s) => s.phase === 'AFTER')
  const lastClamp = clamp[clamp.length - 1]
  const m = (re: RegExp) => pick(re, headLine)
  const sonuc = m(/Sonuç (OK|HATA|\?)/)?.[1]
  const bitis = m(/Bitiş üst ([-\d.,]+) alt ([-\d.,]+) mm/)
  const kayma = m(/Maks kayma üst ([-\d.,]+) alt ([-\d.,]+) mm/)
  const kom = m(/Komutsuz üst geri ([-\d.,]*) ileri ([-\d.,]*) alt ([-\d.,]*) mm/)
  const slack = m(/Boşluk alma (\d*) kez ([-\d.,]*) mm/)
  const errField = head[head.length - 1]?.trim()
  const hasJob = job.length > 0

  return {
    id: Number(m(/# Oturum #(\d+)/)?.[1] ?? 0),
    bendingJobId: num(m(/İş #(\d+)/)?.[1]),
    kind: (head[1] ?? 'Clamp').trim(),
    startedAt: new Date(startMs).toISOString(),
    clampEndedAt: lastClamp ? lastClamp.capturedAt : null,
    endedAt: data.length ? data[data.length - 1].capturedAt : null,
    success: sonuc === 'OK' ? true : sonuc === 'HATA' ? false : null,
    errorMessage: errField && !/^(Komutsuz|Min S1|Boşluk|Maks kayma)/.test(errField) && !errField.includes(' mm') ? errField : null,
    targetPositionMm: num(m(/Hedef ([-\d.,]+) mm/)?.[1]),
    pressureBar: 0,
    speedPercent: 0,
    settingsJson,
    startUpperMm: clamp[0]?.upperMm ?? null,
    startLowerMm: clamp[0]?.lowerMm ?? null,
    startOilTempC: clamp[0]?.oilTempC ?? null,
    endUpperMm: num(bitis?.[1]) ?? lastClamp?.upperMm ?? null,
    endLowerMm: num(bitis?.[2]) ?? lastClamp?.lowerMm ?? null,
    endLeftMm: lastClamp?.leftMm ?? null,
    endRightMm: lastClamp?.rightMm ?? null,
    endS1Bar: num(m(/;S1 (\d+) bar/)?.[1]) ?? lastClamp?.s1Bar ?? null,
    endS2Bar: lastClamp?.s2Bar ?? null,
    endOilTempC: num(m(/yağ (-?\d+) °C/)?.[1]) ?? lastClamp?.oilTempC ?? null,
    maxS1Bar: clamp.length ? Math.max(...clamp.map((s) => s.s1Bar)) : null,
    maxUpperDriftMm: num(kayma?.[1]),
    maxLowerDriftMm: num(kayma?.[2]),
    finalUpperDriftMm: after.length ? after[after.length - 1].upperDriftMm : null,
    finalLowerDriftMm: after.length ? after[after.length - 1].lowerDriftMm : null,
    postWatchSec: after.length > 1 ? Math.round((after[after.length - 1].elapsedMs - after[0].elapsedMs) / 100) / 10 : 0,
    jobEndedAt: hasJob ? job[job.length - 1].capturedAt : null,
    maxUpperRetreatMm: num(kom?.[1]),
    maxUpperAdvanceMm: num(kom?.[2]),
    maxLowerUncmdMm: num(kom?.[3]),
    minS1HoldBar: num(m(/Min S1 \(tutarken\) (\d+)/)?.[1]),
    slackCount: hasJob || slack ? num(slack?.[1]) ?? 0 : null,
    slackTotalMm: num(slack?.[2]),
    pasoSummaryJson,
    sampleCount: data.length,
    noteCount: samples.length - data.length,
    samples,
  }
}

// ── klasör önbelleği ──
let cache: { key: string; sessions: ClampTelemetrySession[] } | null = null

function loadAll(): ClampTelemetrySession[] {
  const dir = clampLogsDir()
  let files: string[] = []
  try {
    files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort()
  } catch {
    return []
  }
  const key = files.map((f) => `${f}:${statSync(join(dir, f)).mtimeMs}`).join('|')
  if (cache?.key === key) return cache.sessions
  const sessions: ClampTelemetrySession[] = []
  const used = new Set<number>()
  for (const f of files) {
    try {
      const s = parseClampCsv(readFileSync(join(dir, f), 'utf8'), f)
      // Farklı makinelerden aynı oturum no gelebilir — ekranda tekil olsun
      let sid = s.id > 0 ? s.id : 1
      while (used.has(sid)) sid += 1000
      used.add(sid)
      s.id = sid
      for (const x of s.samples) x.sessionId = sid
      sessions.push(s)
    } catch {
      /* bozuk dosya atlanır */
    }
  }
  sessions.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  cache = { key, sessions }
  return sessions
}

export function listClampLogs(page: number, pageSize: number, jobId?: number): ClampTelemetryPage {
  let all = loadAll()
  if (jobId) all = all.filter((s) => s.bendingJobId === jobId)
  const items = all.slice((page - 1) * pageSize, page * pageSize).map((s) => ({ ...s, samples: [], settingsJson: null }))
  return { total: all.length, page, pageSize, items }
}

export function getClampLog(id: number): ClampTelemetrySession | null {
  return loadAll().find((s) => s.id === id) ?? null
}

/** Seçilen CSV'leri demo klasörüne kopyala (geçersiz olanlar reddedilir). */
export function importClampCsvs(paths: string[]): { imported: number; errors: string[] } {
  const dir = clampLogsDir()
  let imported = 0
  const errors: string[] = []
  for (const p of paths) {
    try {
      parseClampCsv(readFileSync(p, 'utf8'), basename(p)) // önce doğrula
      const target = join(dir, basename(p))
      if (existsSync(target) && statSync(target).size === statSync(p).size) {
        imported++
        continue
      }
      copyFileSync(p, target)
      imported++
    } catch (e) {
      errors.push(`${basename(p)}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  cache = null
  return { imported, errors }
}
