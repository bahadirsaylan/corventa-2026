// DEMO MODU — STANDART SÜRÜM (2026-11-17) kayıtlı bükümler. DataApi /api/saved-bends sözleşmesiyle (docs/STANDART_SURUM.md §3.3):
//   GET liste (özet, son güncellenen önce) · GET {id} (+ paramsJson, correctionsJson, sourceJobId) · POST (OPERATOR+, 201)
//   PUT {id} (OPERATOR+, null alanlar korunur) · POST {id}/ran (RunCount++) · DELETE {id} (SUPERVISOR+, 204)
// Kayıtlar süreç boyunca bellekte tutulur; başlangıçta tek örnek kayıt vardır.

import { demoRequireRole } from '@main/demo/demoAuth'
import { HttpError } from '@main/lib/http'

interface DemoSavedBend {
  id: number
  name: string
  method: string
  paramsJson: string | null
  targetDiameterMm: number
  profileA: number
  pushDepthMm: number
  stepDistanceMm: number
  stageNumber: number | null
  correctionsJson: string | null
  sourceJobId: number | null
  runCount: number
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

const DAY = 86_400_000
let nextSavedBendId = 2
const savedBends: DemoSavedBend[] = [
  {
    id: 1,
    name: 'ÖRNEK — 40x40 Ø1500',
    method: 'FullCircle',
    paramsJson: JSON.stringify({
      bendingMethod: 'ring',
      profileId: 'square-out',
      bendingDirection: 'left',
      ringBending: { A: 40, B: 40, S: 2, R: 1500, H: 50, G: 30, L: 3000 },
    }),
    targetDiameterMm: 1500,
    profileA: 40,
    pushDepthMm: 327.11,
    stepDistanceMm: 30,
    stageNumber: 1,
    correctionsJson: JSON.stringify([
      { at: new Date(Date.now() - 2 * DAY).toISOString(), fromMm: 324.28, toMm: 327.11, measuredDiameterMm: 1562, mode: 'part' },
    ]),
    sourceJobId: null,
    runCount: 3,
    createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
    updatedAt: new Date(Date.now() - DAY).toISOString(),
    createdBy: 'operator',
    updatedBy: 'operator',
  },
]

function fail(status: number, url: string, error: string): never {
  throw new HttpError(status, url, error, { error })
}

function summary(s: DemoSavedBend) {
  return {
    id: s.id,
    name: s.name,
    method: s.method,
    targetDiameterMm: s.targetDiameterMm,
    profileA: s.profileA,
    pushDepthMm: s.pushDepthMm,
    stepDistanceMm: s.stepDistanceMm,
    stageNumber: s.stageNumber,
    runCount: s.runCount,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    createdBy: s.createdBy,
  }
}

const num = (v: unknown): number | null => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : NaN)
const str = (v: unknown): string | null => (typeof v === 'string' ? v : v == null ? null : JSON.stringify(v))

/** POST (create=true: zorunlu alanlar) / PUT (sadece gelen alanlar) doğrulaması — hata metni ya da null */
function validate(b: Record<string, unknown>, create: boolean): string | null {
  if (create || b.name !== undefined) {
    const name = String(b.name ?? '').trim()
    if (!name) return 'İsim zorunlu'
    if (name.length > 100) return 'İsim en fazla 100 karakter'
  }
  // Backend ile aynı (SavedBendsController, 2026-11-17): ÇEMBER dışı metotta hedef çap / itme / adım opsiyonel
  // (gönderilmezse 0), parametreler paramsJson'da (zorunlu)
  const isFullCircle = typeof b.method !== 'string' || !b.method || b.method === 'FullCircle'
  if (create && !isFullCircle && !str(b.paramsJson)) return 'paramsJson zorunlu (ÇEMBER dışı metot)'
  for (const k of ['targetDiameterMm', 'profileA', 'pushDepthMm', 'stepDistanceMm'] as const) {
    const v = num(b[k])
    if (v == null) {
      if (create && (isFullCircle || k === 'profileA')) return `${k} zorunlu`
      continue
    }
    if (!(v > 0)) return `${k} 0'dan büyük olmalı`
  }
  return null
}

export function demoSavedBends(rawUrl: string, path: string, method: string, b: Record<string, unknown>): unknown {
  if (path === '/api/saved-bends' && method === 'GET') {
    return [...savedBends].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).map(summary)
  }
  if (path === '/api/saved-bends' && method === 'POST') {
    const actor = demoRequireRole(rawUrl, 'OPERATOR')
    const err = validate(b, true)
    if (err) fail(400, rawUrl, err)
    const now = new Date().toISOString()
    const rec: DemoSavedBend = {
      id: nextSavedBendId++,
      name: String(b.name).trim(),
      method: typeof b.method === 'string' && b.method ? b.method : 'FullCircle',
      paramsJson: str(b.paramsJson),
      targetDiameterMm: num(b.targetDiameterMm) ?? 0,
      profileA: Number(b.profileA),
      pushDepthMm: num(b.pushDepthMm) ?? 0,
      stepDistanceMm: num(b.stepDistanceMm) ?? 0,
      stageNumber: num(b.stageNumber),
      correctionsJson: str(b.correctionsJson),
      sourceJobId: num(b.sourceJobId),
      runCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.username,
      updatedBy: actor.username,
    }
    savedBends.push(rec)
    return { ...rec }
  }
  const m = /^\/api\/saved-bends\/(\d+)(\/ran)?$/.exec(path)
  if (m) {
    const id = Number(m[1])
    const rec = savedBends.find((x) => x.id === id)
    if (m[2]) {
      if (method !== 'POST') fail(404, rawUrl, 'Demo modunda desteklenmiyor')
      if (!rec) fail(404, rawUrl, `Kayıtlı büküm #${id} bulunamadı`)
      rec.runCount++
      return { ...rec }
    }
    if (method === 'GET') {
      if (!rec) fail(404, rawUrl, `Kayıtlı büküm #${id} bulunamadı`)
      return { ...rec }
    }
    if (method === 'PUT') {
      const actor = demoRequireRole(rawUrl, 'OPERATOR')
      const err = validate(b, false)
      if (err) fail(400, rawUrl, err)
      if (!rec) fail(404, rawUrl, `Kayıtlı büküm #${id} bulunamadı`)
      // null / gönderilmeyen alanlar korunur
      if (b.name != null) rec.name = String(b.name).trim()
      if (typeof b.method === 'string' && b.method) rec.method = b.method
      if (b.paramsJson != null) rec.paramsJson = str(b.paramsJson)
      if (b.correctionsJson != null) rec.correctionsJson = str(b.correctionsJson)
      for (const k of ['targetDiameterMm', 'profileA', 'pushDepthMm', 'stepDistanceMm'] as const) {
        const v = num(b[k])
        if (v != null) rec[k] = v
      }
      if (num(b.stageNumber) != null) rec.stageNumber = num(b.stageNumber)
      if (num(b.sourceJobId) != null) rec.sourceJobId = num(b.sourceJobId)
      rec.updatedAt = new Date().toISOString()
      rec.updatedBy = actor.username
      return { ...rec }
    }
    if (method === 'DELETE') {
      demoRequireRole(rawUrl, 'SUPERVISOR')
      if (!rec) fail(404, rawUrl, `Kayıtlı büküm #${id} bulunamadı`)
      savedBends.splice(savedBends.indexOf(rec), 1)
      return null // 204
    }
  }
  fail(404, rawUrl, 'Demo modunda desteklenmiyor')
}
