// DEMO MODU — UYARI KAYITLARI (2026-11-19) + yağ kirlilik sensörü simülasyonu.
//
// /api/alert-acks sözleşmesi gerçek DataApi AlertAcksController ile aynı (bellekte, en yeni 20 000 satır):
//   POST /api/alert-acks (OPERATOR+, alertKey virgüllü → anahtar başına satır, OccurrenceIndex = son RESOLVED'dan
//   bu yana kaçıncı kapatma) · GET /api/alert-acks (SUPERVISOR+, sayfalı) · GET /api/alert-acks/summary (SUPERVISOR+)
// Kirlilik: K1–K3 (true = KİRLİ). Başlangıç CORVENTA_DEMO_DIRTY=K2 (veya "K2,K3"); F7 → K2 kirli / temiz.
// CORVENTA_DEMO_DIRTY_DELAY_S=40 → CORVENTA_DEMO_DIRTY'deki sensörler açılıştan 40 sn sonra kirlenir (kuyruk gösterimi:
// bakım uyarısı açıkken kirlilik gelir, bakım kapatılınca kirlilik penceresi açılır).
// Gerçekteki Bending API AlertConditionWatcher gibi kirli 3 sn sürünce DETECTED, temiz 10 sn sürünce RESOLVED yazılır.
// Bakım "tamamlandı" işaretlenince o periyodun bakım uyarı bölümü kapanır (RESOLVED) — DataApi ile aynı.
// Geçmişten birkaç örnek kayıt ilk açılışta hazır (sayfa boş görünmesin).

import { app, globalShortcut } from 'electron'

import { demoRequireRole } from '@main/demo/demoAuth'
import { HttpError } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'

const log = childLogger('demo:alert-acks')

const MAX_ROWS = 20_000
const DIRTY_STABLE_MS = 3_000
const CLEAN_STABLE_MS = 10_000

interface DemoAck {
  id: number
  alertKind: string
  alertKey: string
  message: string
  severity: string
  shownAt: string | null
  acknowledgedAt: string
  username: string | null
  displayName: string | null
  role: string | null
  action: string
  source: 'UI' | 'SYSTEM'
  sessionId: string | null
  occurrenceIndex: number
  machineStateJson: string | null
}

const rows: DemoAck[] = []
let nextId = 1

function fail(status: number, url: string, error: string): never {
  throw new HttpError(status, url, error, { error })
}

/** Son RESOLVED'dan sonraki satırlar (bölüm) */
function episode(kind: string, key: string): DemoAck[] {
  const same = rows.filter((r) => r.alertKind === kind && r.alertKey === key)
  let last = -1
  same.forEach((r, i) => { if (r.action === 'RESOLVED') last = i })
  return same.slice(last + 1)
}

function push(r: Omit<DemoAck, 'id'>): DemoAck {
  const row = { ...r, id: nextId++ }
  rows.push(row)
  if (rows.length > MAX_ROWS) rows.splice(0, rows.length - MAX_ROWS)
  return row
}

function addUser(r: Omit<DemoAck, 'id' | 'occurrenceIndex' | 'source'>): DemoAck {
  const n = episode(r.alertKind, r.alertKey).filter((x) => x.source === 'UI').length
  return push({ ...r, source: 'UI', occurrenceIndex: n + 1 })
}

function addSystem(kind: string, key: string, action: 'DETECTED' | 'RESOLVED', message: string, severity: string, at = new Date().toISOString(), state: string | null = null): DemoAck | null {
  const ep = episode(kind, key)
  if (action === 'DETECTED' && ep.length > 0) return null
  if (action === 'RESOLVED' && ep.length === 0) return null
  return push({
    alertKind: kind, alertKey: key, message, severity, shownAt: null, acknowledgedAt: at,
    username: 'SİSTEM', displayName: null, role: null, action, source: 'SYSTEM', sessionId: null,
    occurrenceIndex: action === 'RESOLVED' ? ep.filter((x) => x.source === 'UI').length : 0,
    machineStateJson: state,
  })
}

// ── Geçmişten örnek kayıtlar ──
function seed(): void {
  const DAY = 86_400_000
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date(Date.now() - daysAgo * DAY)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const op = { username: 'operator', displayName: 'Makine Kullanıcısı', role: 'OPERATOR' }
  const k1Msg = 'YAĞ KİRLİLİK UYARISI — K1: FİLTRE KİRLİ VEYA KİRLİLİK SENSÖRÜ / KABLOSU ARIZALI — servis / bakım ekibine haber verin; devam ederseniz pistonlar ve hidrolik sistem zarar görebilir.'
  const st = JSON.stringify({ k1: true, k2: false, k3: false, oilTempC: 43, oilLevelPercent: 81, oilHumidityPercent: 19 })
  addSystem('Contamination', 'K1', 'DETECTED', 'K1 yağ kirlilik sensörü KİRLİ (veya sensör / kablo arızalı) algılandı', 'error', at(9, 8, 2), st)
  for (const [d, h, m] of [[9, 8, 5], [8, 8, 1], [7, 7, 58]] as const) {
    addUser({ alertKind: 'Contamination', alertKey: 'K1', message: k1Msg, severity: 'error', shownAt: at(d, h, m), acknowledgedAt: at(d, h, m + 1), ...op, action: 'DISMISSED', sessionId: null, machineStateJson: st })
  }
  addSystem('Contamination', 'K1', 'RESOLVED', 'K1 yağ kirlilik sensörü temiz — durum düzeldi', 'info', at(6, 14, 30))
  const wMsg = '2. HAFTA — BAKIM UYARISI: HAFTALIK BAKIM 9 GÜN GECİKME'
  addUser({ alertKind: 'MaintenanceOverdue', alertKey: 'weekly', message: wMsg, severity: 'warning', shownAt: at(2, 8, 10), acknowledgedAt: at(2, 8, 10), ...op, action: 'DISMISSED', sessionId: null, machineStateJson: null })
  addUser({ alertKind: 'MaintenanceOverdue', alertKey: 'weekly', message: wMsg, severity: 'warning', shownAt: at(1, 8, 3), acknowledgedAt: at(1, 8, 4), ...op, action: 'DISMISSED', sessionId: null, machineStateJson: null })
}
seed()

// ── Kirlilik sensörü simülasyonu ──
const dirtyEnv = (process.env.CORVENTA_DEMO_DIRTY ?? '').toUpperCase()
const dirtyDelayS = Math.max(0, Number(process.env.CORVENTA_DEMO_DIRTY_DELAY_S) || 0)
const initial = dirtyDelayS > 0 ? '' : dirtyEnv
const contamination = { K1: initial.includes('K1'), K2: initial.includes('K2'), K3: initial.includes('K3') }
type Key = keyof typeof contamination
if (dirtyDelayS > 0 && dirtyEnv) {
  setTimeout(() => {
    for (const k of ['K1', 'K2', 'K3'] as const) if (dirtyEnv.includes(k)) contamination[k] = true
    log.info('DEMO yağ kirlilik (gecikmeli)', { dirty: dirtyEnv })
  }, dirtyDelayS * 1000).unref()
}
const track: Record<Key, { value: boolean; since: number; reported: boolean | null }> = {
  K1: { value: contamination.K1, since: Date.now(), reported: null },
  K2: { value: contamination.K2, since: Date.now(), reported: null },
  K3: { value: contamination.K3, since: Date.now(), reported: null },
}

export function toggleDemoContamination(key: Key = 'K2'): void {
  contamination[key] = !contamination[key]
  log.info('DEMO yağ kirlilik', { key, dirty: contamination[key] })
}

// 2026-11-28 — DEMO ACİL STOP (F3): basılı / bırakıldı (ACİL STOP EKRANI denemesi)
let demoEstopPressed = false
export function isDemoEstopPressed(): boolean {
  return demoEstopPressed
}

if (process.env.CORVENTA_DEMO === '1') {
  void app.whenReady().then(() => {
    // F8 parça sensörü, F9 hız (index.ts) · F7 yağ kirlilik K2 · F3 acil stop
    globalShortcut.register('F7', () => toggleDemoContamination('K2'))
    globalShortcut.register('F3', () => {
      demoEstopPressed = !demoEstopPressed
      log.info('DEMO acil stop', { pressed: demoEstopPressed })
    })
  })
}

/**
 * DemoMachine her durum tick'inde çağırır: emniyet durumuna kirlilik bitlerini yazar ve
 * Bending API AlertConditionWatcher gibi kararlı değişimde DETECTED / RESOLVED kaydı açar.
 */
export function applyDemoContamination(safety: { contaminationK1: boolean; contaminationK2: boolean; contaminationK3: boolean }, oil: { oilTempC: number; oilLevelPercent: number; oilHumidityPercent: number }): void {
  safety.contaminationK1 = contamination.K1
  safety.contaminationK2 = contamination.K2
  safety.contaminationK3 = contamination.K3
  const now = Date.now()
  for (const key of Object.keys(track) as Key[]) {
    const t = track[key]
    if (t.value !== contamination[key]) {
      t.value = contamination[key]
      t.since = now
      continue
    }
    if (t.reported === t.value || now - t.since < (t.value ? DIRTY_STABLE_MS : CLEAN_STABLE_MS)) continue
    t.reported = t.value
    const state = JSON.stringify({ k1: contamination.K1, k2: contamination.K2, k3: contamination.K3, ...oil })
    if (t.value) addSystem('Contamination', key, 'DETECTED', `${key} yağ kirlilik sensörü KİRLİ (veya sensör / kablo arızalı) algılandı`, 'error', undefined, state)
    else addSystem('Contamination', key, 'RESOLVED', `${key} yağ kirlilik sensörü temiz — durum düzeldi`, 'info', undefined, state)
  }
}

/** Bakım "tamamlandı" işaretlendi → o periyodun gecikme / kilit bölümü kapanır */
export function demoResolveMaintenanceAlerts(period: string | null): void {
  if (!period) return
  for (const kind of ['MaintenanceOverdue', 'MaintenanceLock'])
    addSystem(kind, period, 'RESOLVED', `${period} bakımı tamamlandı olarak işaretlendi`, 'info')
}

const KEY_RX = /^[A-Za-z0-9_.:-]{1,64}$/

function summary() {
  const groups = new Map<string, DemoAck[]>()
  for (const r of rows) {
    const k = `${r.alertKind}|${r.alertKey}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  const items = [...groups.values()].map((list) => {
    let lastResolved = -1
    list.forEach((r, i) => { if (r.action === 'RESOLVED') lastResolved = i })
    const ep = list.slice(lastResolved + 1)
    const acks = list.filter((r) => r.source === 'UI')
    const lastAck = acks[acks.length - 1]
    const lastDetected = [...list].reverse().find((r) => r.action === 'DETECTED')
    const byUser = new Map<string, { username: string; displayName: string | null; count: number }>()
    for (const a of acks) {
      const u = byUser.get(a.username ?? '') ?? { username: a.username ?? '', displayName: a.displayName, count: 0 }
      u.count++
      byUser.set(u.username, u)
    }
    return {
      alertKind: list[0].alertKind,
      alertKey: list[0].alertKey,
      ackCount: acks.length,
      openAckCount: ep.filter((r) => r.source === 'UI').length,
      isOpen: ep.length > 0,
      lastAckAt: lastAck?.acknowledgedAt ?? null,
      lastAckBy: lastAck?.username ?? null,
      lastAckByDisplayName: lastAck?.displayName ?? null,
      lastDetectedAt: lastDetected?.acknowledgedAt ?? null,
      lastResolvedAt: lastResolved >= 0 ? list[lastResolved].acknowledgedAt : null,
      byUser: [...byUser.values()].sort((a, b) => b.count - a.count),
    }
  })
  const ts = (s: (typeof items)[number]) => s.lastAckAt ?? s.lastDetectedAt ?? s.lastResolvedAt ?? ''
  items.sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || ts(b).localeCompare(ts(a)))
  return { items }
}

export function demoAlertAcks(rawUrl: string, path: string, method: string, u: URL, b: Record<string, unknown>): unknown {
  if (path === '/api/alert-acks' && method === 'POST') {
    const actor = demoRequireRole(rawUrl, 'OPERATOR')
    const kind = String(b.alertKind ?? '')
    if (!/^[A-Za-z0-9_]{1,40}$/.test(kind)) fail(400, rawUrl, 'alertKind geçersiz (A-Z, 0-9, _; en fazla 40)')
    const action = String(b.action ?? '').trim().toUpperCase()
    if (!/^[A-Z_]{1,32}$/.test(action)) fail(400, rawUrl, 'action geçersiz (A-Z, _; en fazla 32)')
    if (action === 'DETECTED' || action === 'RESOLVED') fail(400, rawUrl, 'DETECTED / RESOLVED sadece sistem tarafından yazılır')
    const rawKey = typeof b.alertKey === 'string' ? b.alertKey : ''
    const keys = rawKey.trim() ? [...new Set(rawKey.split(',').map((k) => k.trim()).filter(Boolean))] : ['']
    if (keys.length > 10 || keys.some((k) => k && !KEY_RX.test(k))) fail(400, rawUrl, 'alertKey geçersiz')
    const now = new Date().toISOString()
    const items = keys.map((key) => {
      const row = addUser({
        alertKind: kind,
        alertKey: key,
        message: String(b.message ?? '').slice(0, 2000),
        severity: b.severity === 'info' || b.severity === 'error' ? String(b.severity) : 'warning',
        shownAt: typeof b.shownAt === 'string' ? b.shownAt : null,
        acknowledgedAt: now,
        username: actor.username,
        displayName: actor.displayName,
        role: actor.role,
        action,
        sessionId: typeof b.sessionId === 'string' ? b.sessionId.slice(0, 64) : null,
        machineStateJson: typeof b.machineStateJson === 'string' && b.machineStateJson.length <= 4000 ? b.machineStateJson : null,
      })
      log.info('uyarı kaydı', { kind, key, action, user: actor.username, n: row.occurrenceIndex })
      return { id: row.id, alertKey: row.alertKey, occurrenceIndex: row.occurrenceIndex }
    })
    return { items }
  }
  if (path === '/api/alert-acks' && method === 'GET') {
    demoRequireRole(rawUrl, 'SUPERVISOR')
    const page = Math.max(1, Number(u.searchParams.get('page') ?? 1) || 1)
    const pageSize = Number(u.searchParams.get('pageSize') ?? 20) || 20
    if (pageSize < 1 || pageSize > 100) fail(400, rawUrl, 'pageSize 1-100 arası olmalı')
    const kind = u.searchParams.get('kind')
    const key = u.searchParams.get('key')
    const action = u.searchParams.get('action')?.toUpperCase()
    const from = u.searchParams.get('from')
    const to = u.searchParams.get('to')
    const list = rows
      .filter((r) => (!kind || r.alertKind === kind) && (!key || r.alertKey === key) && (!action || r.action === action))
      .filter((r) => (!from || r.acknowledgedAt >= new Date(from).toISOString()) && (!to || r.acknowledgedAt <= new Date(to).toISOString()))
      .sort((a, b) => b.id - a.id)
    return { total: list.length, page, pageSize, items: list.slice((page - 1) * pageSize, page * pageSize).map((r) => ({ ...r })) }
  }
  if (path === '/api/alert-acks/summary' && method === 'GET') {
    demoRequireRole(rawUrl, 'SUPERVISOR')
    return summary()
  }
  fail(404, rawUrl, 'Demo modunda desteklenmiyor')
}
