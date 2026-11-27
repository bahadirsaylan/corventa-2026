// Demo — KIVRIM ADETLERİ RAPORU (GET /api/reports/bending-count).
// Gerçek DataApi ReportsController sözleşmesiyle birebir; kaynak = demo büküm geçmişi (DemoMachine.jobs),
// böylece rapor BÜKÜM GEÇMİŞİ ekranıyla aynı işleri sayar.

import { HttpError } from '@main/lib/http'

interface DemoReportJob {
  status: number
  method: number
  profileType?: unknown
  startedAt?: unknown
  createdAt?: unknown
  completedPasos?: unknown
  partLengthMm?: unknown
  durationSeconds?: unknown
}

type Row = { total: number; completed: number; failed: number; cancelled: number; interrupted: number; running: number }

const STARTED = new Set([3, 4, 5, 6, 7]) // Running · Completed · Failed · Cancelled · Interrupted
const MAX_RANGE_DAYS = 3700
const MAX_DAY_BUCKETS = 400

const emptyRow = (): Row => ({ total: 0, completed: 0, failed: 0, cancelled: 0, interrupted: 0, running: 0 })

function add(r: Row, status: number): void {
  r.total++
  if (status === 4) r.completed++
  else if (status === 5) r.failed++
  else if (status === 6) r.cancelled++
  else if (status === 7) r.interrupted++
  else if (status === 3) r.running++
}

function fail(rawUrl: string, error: string): never {
  throw new HttpError(400, rawUrl, error, { error })
}

const pad = (n: number): string => String(n).padStart(2, '0')
const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 ? d : null
}

/** Zaman damgası (Z'siz = UTC, DataApi gibi) → yerel gün başlangıcı */
function localDay(v: unknown): Date | null {
  const s = String(v ?? '')
  if (!s) return null
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z')
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function bucketStart(d: Date, g: string): Date {
  if (g === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth(), 1)
  return d
}

function nextBucket(d: Date, g: string): Date {
  if (g === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
  if (g === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}

const bucketKey = (d: Date, g: string): string => (g === 'month' ? monthKey(d) : dayKey(d))
const dayNumber = (d: Date): number => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)

export function demoBendingCountReport(rawUrl: string, sp: URLSearchParams, jobs: readonly DemoReportJob[]): unknown {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const toRaw = sp.get('to')
  const to = toRaw ? parseDay(toRaw) : today
  if (!to) fail(rawUrl, `to geçersiz '${toRaw}' — beklenen yyyy-MM-dd`)
  const fromRaw = sp.get('from')
  const from = fromRaw ? parseDay(fromRaw) : new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29)
  if (!from) fail(rawUrl, `from geçersiz '${fromRaw}' — beklenen yyyy-MM-dd`)
  if (from > to) fail(rawUrl, "from, to'dan sonra olamaz")
  const days = dayNumber(to) - dayNumber(from) + 1
  if (days > MAX_RANGE_DAYS) fail(rawUrl, `Aralık en fazla ${MAX_RANGE_DAYS} gün olabilir`)

  const g = (sp.get('groupBy') ?? 'day').trim().toLowerCase()
  if (g !== 'day' && g !== 'week' && g !== 'month') fail(rawUrl, 'groupBy day | week | month olmalı')
  if (g === 'day' && days > MAX_DAY_BUCKETS)
    fail(rawUrl, `groupBy=day için aralık en fazla ${MAX_DAY_BUCKETS} gün olabilir (week / month kullanın)`)

  const intParam = (name: string): number | null => {
    const v = sp.get(name)
    if (v == null || v === '') return null
    const n = Number(v)
    if (!Number.isInteger(n)) fail(rawUrl, `${name} geçersiz (${v})`)
    return n
  }
  const method = intParam('method')
  if (method != null && (method < 0 || method > 3)) fail(rawUrl, `method geçersiz (${method}) — 0 FullCircle, 1 Arc, 2 Serpantin, 3 Sivama`)
  const profileType = intParam('profileType')

  const series: (Row & { key: string; from: string; to: string })[] = []
  const index = new Map<string, Row>()
  for (let d = bucketStart(from, g); d <= to; d = nextBucket(d, g)) {
    const nb = nextBucket(d, g)
    const end = new Date(nb.getFullYear(), nb.getMonth(), nb.getDate() - 1)
    const row = emptyRow()
    const key = bucketKey(d, g)
    series.push(Object.assign(row, { key, from: dayKey(d < from ? from : d), to: dayKey(end > to ? to : end) }))
    index.set(key, row)
  }

  const totals = emptyRow()
  const methods = new Map<number, Row>([0, 1, 2, 3].map((m) => [m, emptyRow()]))
  const profiles = new Map<number, Row>()
  let completedPasos = 0
  let lengthMm = 0
  let durSum = 0
  let durCount = 0

  for (const j of jobs) {
    if (!STARTED.has(j.status)) continue
    const day = localDay(j.startedAt ?? j.createdAt)
    if (!day || day < from || day > to) continue
    const pt = Number(j.profileType) || 0
    if (method != null && j.method !== method) continue
    if (profileType != null && pt !== profileType) continue

    const b = index.get(bucketKey(bucketStart(day, g), g))
    if (b) add(b, j.status)
    add(totals, j.status)
    if (!methods.has(j.method)) methods.set(j.method, emptyRow())
    add(methods.get(j.method)!, j.status)
    if (!profiles.has(pt)) profiles.set(pt, emptyRow())
    add(profiles.get(pt)!, j.status)

    if (j.status === 4) {
      completedPasos += Math.max(0, Number(j.completedPasos) || 0)
      const len = Number(j.partLengthMm) || 0
      if (len > 0) lengthMm += len
      const dur = Number(j.durationSeconds) || 0
      if (dur > 0) { durSum += dur; durCount++ }
    }
  }

  return {
    from: dayKey(from),
    to: dayKey(to),
    days,
    groupBy: g,
    method,
    profileType,
    totals: {
      ...totals,
      completedPasos,
      completedPartLengthM: Math.round(lengthMm / 100) / 10,
      avgCompletedDurationSeconds: durCount > 0 ? Math.round((durSum / durCount) * 10) / 10 : null,
    },
    series,
    methods: [...methods.entries()].sort((a, b) => a[0] - b[0]).map(([m, r]) => ({ method: m, ...r })),
    profileTypes: [...profiles.entries()]
      .sort((a, b) => b[1].total - a[1].total || a[0] - b[0])
      .map(([p, r]) => ({ profileType: p, ...r })),
  }
}
