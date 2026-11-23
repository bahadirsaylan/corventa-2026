// DEMO MODU — AI ÖĞRENME KURALLARI (2026-11-19). Sözleşme gerçek DataApi ile aynı:
//   GET /api/ai-recipe-rules → { settings, defaults, isDefault } · PUT /api/ai-recipe-rules (ADMIN+) → aynı şekil · 400 { error }
//   GET /api/bending-jobs/similar?…[&explain=true&explainLimit=N] → { match, iterations, recipeIndex [, explain] }
// Eşleşme mantığı DataApi BendingJobsController.FindSimilar + Core AiRecipeMatcher'ın birebir kopyası (bellekte).
// Geçmiş: 40x40x2 Ø1000 L3000 adım 10 top 220 merkez 300,82 — yağ sıcaklıkları farklı 10 örnek dairesel iş
// (yağ 41/45/36/49 °C, yağ kaydı yok, tek ölçüm, ölçüm hatalı, Ø1010, farklı merkez mesafesi, farklı adım) →
// "NEDEN EŞLEŞMEDİ" paneli gösterilebilir. Ayarlar süreç boyunca bellekte.

import { demoRequireRole } from '@main/demo/demoAuth'
import { HttpError } from '@main/lib/http'
import type {
  AiCandidateVerdict,
  AiCriterionCheck,
  AiCriterionKey,
  AiRecipeMatchSettings,
} from '@shared/types/ai-recipe-rules'

const DAY = 86_400_000

const PROFILE_TYPES: Record<number, string> = {
  0: 'Square', 1: 'Rectangular', 2: 'Round', 3: 'Angle', 4: 'Channel', 5: 'TProfile', 6: 'IProfile', 7: 'Flat', 99: 'Custom',
}

const DEFAULTS: AiRecipeMatchSettings = {
  targetDiameterEnabled: true, targetDiameterTol: 0, targetDiameterTolUnit: 'MM',
  partLengthEnabled: true, partLengthTolMm: 0,
  stepDistanceEnabled: true, stepDistanceTolMm: 0,
  profileAEnabled: true, profileATolMm: 0,
  profileBEnabled: true, profileBTolMm: 0,
  profileSEnabled: true, profileSTolMm: 0,
  ballDiameterEnabled: true, ballDiameterTolMm: 0,
  centerDistanceEnabled: true, centerDistanceTolMm: 0.01,
  oilTempEnabled: true, oilTempTolC: 2, oilTempAllowMissing: false,
  profileTypeEnabled: false,
  pistonSpeedEnabled: true, pistonSpeedTolPct: 0, firstMeasureEnabled: true, firstMeasureTolMm: 10,
  requireWithinTolerance: true, excludeFailedMeasurement: true, minSuccessfulRecords: 1,
  selection: 'FASTEST', maxRecordAgeDays: 0, includeCloudRecipes: true, cloudCenterDistanceTolMm: 0,
  updatedAt: null, updatedBy: null,
}

let settings: AiRecipeMatchSettings = { ...DEFAULTS }

interface Iter {
  iterationOrder: number
  measuredDiameterMm: number
  errorMm: number
  correctionPistonPositionMm: number
  measurementSide: string
  isWithinTolerance: boolean
}

interface AiJob {
  id: number
  profileType: number
  profileA: number
  profileB: number
  profileS: number
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  ballDiameterMm: number
  centerDistanceMm: number
  durationSeconds: number
  oilTempAtStartC: number | null
  oilTempAvgC: number | null
  hasFailedMeasurement: boolean
  createdAt: string
  completedAt: string
  iterations: Iter[]
}

function iters(rows: Array<[boolean, number]>, d: number): Iter[] {
  return rows.map(([within, pos], i) => ({
    iterationOrder: i + 1,
    measuredDiameterMm: within ? d + 1.2 : d + 14 - i * 4,
    errorMm: within ? 1.2 : 14 - i * 4,
    correctionPistonPositionMm: pos,
    measurementSide: i % 2 === 0 ? 'Right' : 'Left',
    isWithinTolerance: within,
  }))
}

const OK3: Array<[boolean, number]> = [[false, 6.4], [false, 7.1], [true, 0]]
const OK2: Array<[boolean, number]> = [[false, 6.8], [true, 0]]

const t0 = Date.now()
const jobs: AiJob[] = (
  [
    // id, gün önce, süre, yağ başl., yağ ort., iterasyonlar, ek
    [501, 1, 330, 41, 42, OK3, {}],
    [502, 3, 290, 45, 46, OK2, {}],
    [503, 6, 300, 36, 37, OK2, {}],
    [504, 9, 260, 49, 49, OK2, {}],
    [505, 40, 310, null, null, OK2, {}],
    [506, 2, 210, 42, 42, [[true, 0]] as Array<[boolean, number]>, {}],
    [507, 4, 200, 43, 43, OK2, { hasFailedMeasurement: true }],
    [508, 5, 280, 42, 42, OK2, { targetDiameterMm: 1010 }],
    [509, 7, 270, 42, 42, OK2, { centerDistanceMm: 302.4 }],
    [510, 8, 250, 41, 41, OK2, { stepDistanceMm: 12 }],
  ] as Array<[number, number, number, number | null, number | null, Array<[boolean, number]>, Partial<AiJob>]>
).map(([id, daysAgo, dur, oilS, oilA, its, extra]) => {
  const end = new Date(t0 - daysAgo * DAY - id * 60_000)
  const base: AiJob = {
    id, profileType: 0, profileA: 40, profileB: 40, profileS: 2, targetDiameterMm: 1000, partLengthMm: 3000,
    stepDistanceMm: 10, ballDiameterMm: 220, centerDistanceMm: 300.82, durationSeconds: dur,
    oilTempAtStartC: oilS, oilTempAvgC: oilA, hasFailedMeasurement: false,
    createdAt: new Date(end.getTime() - dur * 1000 - 40_000).toISOString(), completedAt: end.toISOString(),
    iterations: [],
  }
  const j = { ...base, ...extra }
  j.iterations = iters(its, j.targetDiameterMm)
  return j
})

function fail(status: number, url: string, error: string): never {
  throw new HttpError(status, url, error, { error })
}

// ── AiRecipeRules / AiRecipeMatcher kopyası ──

function pickRecipeIndex(its: Iter[], requireWithin: boolean): number | null {
  if (its.length < 2) return null
  if (requireWithin && !its[its.length - 1].isWithinTolerance) return null
  for (let i = its.length - 2; i >= 0; i--) if (its[i].correctionPistonPositionMm > 0) return i
  return null
}

function whyNoRecipeCode(its: Iter[], requireWithin: boolean): string | null {
  if (its.length === 0) return 'NO_ITERATIONS'
  if (its.length === 1) return 'SINGLE_MEASUREMENT'
  if (requireWithin && !its[its.length - 1].isWithinTolerance) return 'NOT_WITHIN_TOLERANCE'
  return pickRecipeIndex(its, requireWithin) == null ? 'NO_CORRECTION' : null
}

const NO_RECIPE_TEXT: Record<string, string> = {
  NO_ITERATIONS: 'geri esneme kaydı yok',
  SINGLE_MEASUREMENT: 'tek ölçümde bitmiş — düzeltme yapılmamış',
  NOT_WITHIN_TOLERANCE: 'kayıt tolerans içinde bitmemiş',
  NO_CORRECTION: 'geçerli düzeltme pozisyonu yok',
}

const within = (a: number, w: number, tol: number) => (tol <= 0 ? a === w : a >= w - tol && a <= w + tol)
const tdTol = (s: AiRecipeMatchSettings, w: number) =>
  s.targetDiameterTolUnit === 'PCT' ? (Math.abs(w) * Math.max(0, s.targetDiameterTol)) / 100 : Math.max(0, s.targetDiameterTol)
const f = (v: number) => (Math.round(v * 100) / 100).toLocaleString('tr-TR')

interface Query {
  targetDiameterMm: number
  partLengthMm: number
  stepDistanceMm: number
  profileA: number
  profileB: number
  profileS: number
  ballDiameterMm: number
  oilTempC: number | null
  centerDistanceMm: number | null
  profileType: number | null
}

function numCheck(key: AiCriterionKey, label: string, enabled: boolean, a: number, w: number, tol: number, unit: string): AiCriterionCheck {
  if (!enabled) return { key, enabled: false, applied: false, passed: true, actual: a, wanted: w, unit, note: 'IGNORED', text: `${label} ${f(a)} ${unit}, istenen ${f(w)} → YOK SAYILDI` }
  const ok = within(a, w, tol)
  return {
    key, enabled: true, applied: true, passed: ok, actual: a, wanted: w, tolerance: tol, unit,
    text: `${label} ${f(a)} ${unit}, istenen ${f(w)}${tol > 0 ? ` ±${f(tol)}` : ' (tam eşit)'} → ${ok ? 'UYGUN' : 'ELENDİ'}`,
  }
}

function evaluate(j: AiJob, q: Query, s: AiRecipeMatchSettings, now: number): AiCriterionCheck[] {
  const list: AiCriterionCheck[] = [
    numCheck('TargetDiameter', 'hedef çap', s.targetDiameterEnabled, j.targetDiameterMm, q.targetDiameterMm, tdTol(s, q.targetDiameterMm), 'mm'),
    numCheck('PartLength', 'parça boyu', s.partLengthEnabled, j.partLengthMm, q.partLengthMm, s.partLengthTolMm, 'mm'),
    numCheck('StepDistance', 'adım', s.stepDistanceEnabled, j.stepDistanceMm, q.stepDistanceMm, s.stepDistanceTolMm, 'mm'),
    numCheck('ProfileA', 'profil A', s.profileAEnabled, j.profileA, q.profileA, s.profileATolMm, 'mm'),
    numCheck('ProfileB', 'profil B', s.profileBEnabled, j.profileB, q.profileB, s.profileBTolMm, 'mm'),
    numCheck('ProfileS', 'profil S', s.profileSEnabled, j.profileS, q.profileS, s.profileSTolMm, 'mm'),
    numCheck('BallDiameter', 'top çapı', s.ballDiameterEnabled, j.ballDiameterMm, q.ballDiameterMm, s.ballDiameterTolMm, 'mm'),
  ]
  if (q.centerDistanceMm != null && q.centerDistanceMm > 0) {
    list.push(numCheck('CenterDistance', 'merkez mesafesi', s.centerDistanceEnabled, j.centerDistanceMm, q.centerDistanceMm, s.centerDistanceTolMm, 'mm'))
  } else {
    list.push({ key: 'CenterDistance', enabled: s.centerDistanceEnabled, applied: false, passed: true, actual: j.centerDistanceMm, unit: 'mm',
      note: s.centerDistanceEnabled ? 'NOT_REQUESTED' : 'IGNORED', text: `merkez mesafesi ${f(j.centerDistanceMm)} mm → bakılmadı` })
  }
  // yağ
  {
    const st = j.oilTempAtStartC, av = j.oilTempAvgC
    const have = st == null && av == null ? 'kayıt yok' : `başlangıç ${st ?? '—'} / ort. ${av ?? '—'} °C`
    if (!s.oilTempEnabled) {
      list.push({ key: 'OilTemp', enabled: false, applied: false, passed: true, actual: st, actual2: av, wanted: q.oilTempC, unit: '°C', note: 'IGNORED', text: `yağ ${have} → YOK SAYILDI` })
    } else if (q.oilTempC == null) {
      list.push({ key: 'OilTemp', enabled: true, applied: false, passed: true, actual: st, actual2: av, unit: '°C', note: 'NOT_REQUESTED', text: `yağ ${have} → istekte yok` })
    } else {
      const min = q.oilTempC - s.oilTempTolC, max = q.oilTempC + s.oilTempTolC
      const missing = st == null && av == null
      const ok = (st != null && st >= min && st <= max) || (av != null && av >= min && av <= max) || (missing && s.oilTempAllowMissing)
      list.push({ key: 'OilTemp', enabled: true, applied: true, passed: ok, actual: st, actual2: av, wanted: q.oilTempC, tolerance: s.oilTempTolC,
        unit: '°C', note: missing ? 'MISSING' : null, text: `yağ ${have}, istenen ${q.oilTempC} ±${f(s.oilTempTolC)} °C → ${ok ? 'UYGUN' : 'ELENDİ'}` })
    }
  }
  // profil tipi
  {
    const at = PROFILE_TYPES[j.profileType] ?? String(j.profileType)
    const wt = q.profileType != null ? (PROFILE_TYPES[q.profileType] ?? String(q.profileType)) : null
    if (!s.profileTypeEnabled) list.push({ key: 'ProfileType', enabled: false, applied: false, passed: true, unit: '', actualText: at, wantedText: wt, note: 'IGNORED', text: `profil tipi ${at} → YOK SAYILDI` })
    else if (q.profileType == null) list.push({ key: 'ProfileType', enabled: true, applied: false, passed: true, unit: '', actualText: at, note: 'NOT_REQUESTED', text: `profil tipi ${at} → istekte yok` })
    else {
      const ok = j.profileType === q.profileType
      list.push({ key: 'ProfileType', enabled: true, applied: true, passed: ok, unit: '', actualText: at, wantedText: wt, text: `profil tipi ${at}, istenen ${wt} → ${ok ? 'UYGUN' : 'ELENDİ'}` })
    }
  }
  {
    const applied = s.excludeFailedMeasurement
    list.push({ key: 'FailedMeasurement', enabled: applied, applied, passed: !applied || !j.hasFailedMeasurement, unit: '',
      actualText: String(j.hasFailedMeasurement), note: applied ? null : 'IGNORED', text: j.hasFailedMeasurement ? 'ölçüm hatası işaretli' : 'ölçüm hatası yok' })
  }
  {
    const ageDays = Math.max(0, (now - Date.parse(j.completedAt)) / DAY)
    const applied = s.maxRecordAgeDays > 0
    list.push({ key: 'MaxAge', enabled: applied, applied, passed: !applied || ageDays <= s.maxRecordAgeDays, actual: Math.round(ageDays * 10) / 10,
      tolerance: applied ? s.maxRecordAgeDays : null, unit: 'gün', note: applied ? null : 'IGNORED', text: `kayıt ${f(ageDays)} gün önce` })
  }
  list.push({ key: 'Duration', enabled: true, applied: true, passed: j.durationSeconds > 0, actual: j.durationSeconds, unit: 'sn', text: `süre ${f(j.durationSeconds)} sn` })
  return list
}

function parseQuery(u: URL, rawUrl: string): Query {
  const n = (k: string) => Number(u.searchParams.get(k))
  const opt = (k: string) => {
    const v = u.searchParams.get(k)
    return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
  }
  const q: Query = {
    targetDiameterMm: n('targetDiameterMm'), partLengthMm: n('partLengthMm'), stepDistanceMm: n('stepDistanceMm'),
    profileA: n('profileA'), profileB: n('profileB'), profileS: n('profileS'), ballDiameterMm: n('ballDiameterMm'),
    oilTempC: opt('oilTempC'), centerDistanceMm: opt('centerDistanceMm'), profileType: null,
  }
  const pt = u.searchParams.get('profileType')
  if (pt != null && pt !== '') {
    const byName = Object.entries(PROFILE_TYPES).find(([, name]) => name.toLowerCase() === pt.toLowerCase())
    q.profileType = byName ? Number(byName[0]) : Number.isFinite(Number(pt)) ? Number(pt) : null
  }
  if (!(q.targetDiameterMm > 0) || !(q.partLengthMm > 0) || !(q.stepDistanceMm > 0))
    fail(400, rawUrl, 'targetDiameterMm, partLengthMm, stepDistanceMm > 0 olmali')
  if (!(q.profileA > 0) || !(q.profileB >= 0) || !(q.profileS >= 0) || !(q.ballDiameterMm > 0))
    fail(400, rawUrl, 'profileA ve ballDiameterMm > 0, profileB/S >= 0 olmali')
  return q
}

function similar(u: URL, rawUrl: string): unknown {
  const q = parseQuery(u, rawUrl)
  const s = settings
  const now = Date.now()
  const newest = s.selection === 'NEWEST'
  const minRecords = Math.max(1, s.minSuccessfulRecords)

  const rows = jobs.map((j) => {
    const checks = evaluate(j, q, s, now)
    const idx = pickRecipeIndex(j.iterations, s.requireWithinTolerance)
    return { j, checks, idx, filterOk: checks.every((c) => c.passed) }
  })
  const ordered = rows
    .filter((r) => r.filterOk && r.j.iterations.length > 0)
    .sort((a, b) => (newest ? b.j.completedAt.localeCompare(a.j.completedAt) || a.j.durationSeconds - b.j.durationSeconds : a.j.durationSeconds - b.j.durationSeconds))
    .slice(0, 20)
  const qualifying = ordered.filter((r) => r.idx != null)
  const chosen = qualifying.length >= minRecords ? qualifying[0] : undefined

  const body: Record<string, unknown> = chosen
    ? {
        match: { ...chosen.j, iterations: undefined, method: 0, status: 4, totalSpringbackIterations: chosen.j.iterations.length },
        iterations: chosen.j.iterations,
        recipeIndex: chosen.idx,
      }
    : { match: null, iterations: [], recipeIndex: null }

  if (u.searchParams.get('explain') === 'true') {
    const limit = Math.min(50, Math.max(1, Number(u.searchParams.get('explainLimit')) || 10))
    const rank = (v: AiCandidateVerdict) => ({ SELECTED: 0, MATCH: 1, NO_RECIPE: 2, ELIMINATED: 3 })[v]
    const cand = rows.map((r) => {
      const verdict: AiCandidateVerdict = chosen && r.j.id === chosen.j.id ? 'SELECTED' : r.filterOk && r.idx != null ? 'MATCH' : r.filterOk ? 'NO_RECIPE' : 'ELIMINATED'
      const code = r.idx == null ? whyNoRecipeCode(r.j.iterations, s.requireWithinTolerance) : null
      return {
        jobId: r.j.id, createdAt: r.j.createdAt, completedAt: r.j.completedAt, durationSeconds: r.j.durationSeconds,
        profileType: PROFILE_TYPES[r.j.profileType] ?? String(r.j.profileType), targetDiameterMm: r.j.targetDiameterMm,
        profileA: r.j.profileA, profileB: r.j.profileB, profileS: r.j.profileS,
        oilTempAtStartC: r.j.oilTempAtStartC, oilTempAvgC: r.j.oilTempAvgC,
        verdict, failedKeys: r.checks.filter((c) => !c.passed).map((c) => c.key), checks: r.checks,
        iterationCount: r.j.iterations.length, recipeIndex: r.idx,
        recipePositionMm: r.idx != null ? r.j.iterations[r.idx].correctionPistonPositionMm : null,
        noRecipeCode: code, noRecipeText: code ? NO_RECIPE_TEXT[code] : null,
      }
    })
    cand.sort((a, b) =>
      rank(a.verdict) - rank(b.verdict) || a.failedKeys.length - b.failedKeys.length
      || (newest ? 0 : (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0)) || b.completedAt.localeCompare(a.completedAt))
    body.explain = {
      settings: s, query: q, scanned: rows.length, scanLimit: 500,
      filterPassedCount: rows.filter((r) => r.filterOk).length,
      recipeReadyCount: rows.filter((r) => r.filterOk && r.idx != null).length,
      minSuccessfulRecords: minRecords,
      selectedJobId: chosen?.j.id ?? null, source: chosen ? 'local' : null, cloudMatchId: null,
      cloudNote: chosen ? null : s.includeCloudRecipes ? 'CLOUD_SHARE_OFF' : 'CLOUD_DISABLED_BY_RULES',
      candidates: cand.slice(0, limit),
    }
  }
  return body
}

function isDefault(s: AiRecipeMatchSettings): boolean {
  return (Object.keys(DEFAULTS) as Array<keyof AiRecipeMatchSettings>)
    .filter((k) => k !== 'updatedAt' && k !== 'updatedBy')
    .every((k) => s[k] === DEFAULTS[k])
}

function validate(b: AiRecipeMatchSettings): string | null {
  const bad = (v: unknown, max: number) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max
  if (b.targetDiameterTolUnit !== 'MM' && b.targetDiameterTolUnit !== 'PCT') return 'targetDiameterTolUnit MM veya PCT olmalı'
  if (b.targetDiameterTolUnit === 'PCT' ? bad(b.targetDiameterTol, 20) : bad(b.targetDiameterTol, 500))
    return b.targetDiameterTolUnit === 'PCT' ? 'hedef çap toleransı 0..20 % olmalı' : 'hedef çap toleransı 0..500 mm olmalı'
  if (bad(b.partLengthTolMm, 2000)) return 'parça boyu toleransı 0..2000 mm olmalı'
  if (bad(b.stepDistanceTolMm, 100)) return 'adım toleransı 0..100 mm olmalı'
  if (bad(b.profileATolMm, 50) || bad(b.profileBTolMm, 50) || bad(b.profileSTolMm, 20)) return 'profil toleransı A/B 0..50 mm, S 0..20 mm olmalı'
  if (bad(b.ballDiameterTolMm, 50)) return 'top çapı toleransı 0..50 mm olmalı'
  if (bad(b.centerDistanceTolMm, 50) || bad(b.cloudCenterDistanceTolMm, 50)) return 'merkez mesafesi toleransı 0..50 mm olmalı'
  if (bad(b.oilTempTolC, 50)) return 'yağ sıcaklığı toleransı 0..50 °C olmalı'
  if (!(b.minSuccessfulRecords >= 1 && b.minSuccessfulRecords <= 20)) return 'en az uygun kayıt sayısı 1..20 olmalı'
  if (!(b.maxRecordAgeDays >= 0 && b.maxRecordAgeDays <= 3650)) return 'kayıt yaşı sınırı 0..3650 gün olmalı (0 = sınır yok)'
  if (b.selection !== 'FASTEST' && b.selection !== 'NEWEST') return 'selection FASTEST veya NEWEST olmalı'
  return null
}

/** DemoMachine http interceptor'ından: /api/ai-recipe-rules ve /api/bending-jobs/similar */
export function demoAiRecipeRules(rawUrl: string, path: string, method: string, u: URL, b: Record<string, unknown>): unknown {
  if (path === '/api/bending-jobs/similar') return similar(u, rawUrl)
  if (path === '/api/ai-recipe-rules' && method === 'GET') return { settings, defaults: DEFAULTS, isDefault: isDefault(settings) }
  if (path === '/api/ai-recipe-rules' && method === 'PUT') {
    const actor = demoRequireRole(rawUrl, 'ADMIN')
    const body = { ...DEFAULTS, ...(b as Partial<AiRecipeMatchSettings>) }
    const err = validate(body)
    if (err) fail(400, rawUrl, err)
    settings = { ...body, updatedAt: new Date().toISOString(), updatedBy: actor.username }
    return { settings, defaults: DEFAULTS, isDefault: isDefault(settings) }
  }
  fail(404, rawUrl, 'Bulunamadı')
}
