// DEMO MODU — DataApi /api/cloud/* (BULUT_API.md §4) sahte cevapları.
// Başlangıç: bulut yapılandırılmış, makine aktive EDİLMEMİŞ. Her geçerli biçimdeki kod kabul edilir;
// 0000-0000-0000-0000 → "CODE" hatası (hata akışını göstermek için). Aktivasyondan sonra yeni sürüm görünür,
// İNDİR ~8 sn'de tamamlanır (ilerleme %), sync-now bekleyen kayıtları sıfırlar.

import { HttpError } from '@main/lib/http'
import type { CloudStatus, CloudUpdateInfo } from '@shared/types'

const UPDATE_VERSION = '1.4.0'
const DOWNLOAD_MS = 8_000

interface DemoCloud {
  activated: boolean
  machineId: string | null
  activatedAt: number
  lastPushAt: string | null
  lastRecipePullAt: string | null
  pendingCount: number
  shareRecipes: boolean
  downloadStartedAt: number | null
}

const st: DemoCloud = {
  activated: false,
  machineId: null,
  activatedAt: 0,
  lastPushAt: null,
  lastRecipePullAt: null,
  pendingCount: 0,
  shareRecipes: false,
  downloadStartedAt: null,
}

/** Bulut v2 demo uçları (demoCloudData.ts) — makine aktive mi */
export function demoCloudActivated(): boolean {
  return st.activated
}

function fail(status: number, rawUrl: string, error: string): never {
  throw new HttpError(status, rawUrl, error, { error })
}

function updateInfo(): CloudUpdateInfo | null {
  if (!st.activated) return null
  let progress: number | null = null
  let downloading = false
  let downloaded = false
  if (st.downloadStartedAt != null) {
    const p = Math.min(100, Math.round(((Date.now() - st.downloadStartedAt) / DOWNLOAD_MS) * 100))
    downloaded = p >= 100
    downloading = !downloaded
    progress = p
  }
  return {
    version: UPDATE_VERSION,
    notes: 'Bulut bağlantısı ve reçete paylaşımı. Ön büküm iyileştirmeleri. Hata düzeltmeleri.',
    sizeBytes: 176 * 1024 * 1024,
    downloaded,
    downloadPath: downloaded ? `C:\\ProgramData\\Corventa\\updates\\Corventa Setup ${UPDATE_VERSION}.exe` : null,
    downloading,
    progress,
  }
}

function status(): CloudStatus {
  const now = new Date().toISOString()
  return {
    configured: true,
    activated: st.activated,
    machineId: st.machineId,
    serialNumber: st.activated ? 'CRV-MIDI-2026-0042' : null,
    name: st.activated ? 'MIDI #42 — Demo Atölye' : null,
    online: st.activated,
    // Heartbeat 60 sn'de bir → demoda "az önce"
    lastHeartbeatAt: st.activated ? now : null,
    lastPushAt: st.lastPushAt,
    lastRecipePullAt: st.lastRecipePullAt,
    pendingCount: st.activated ? st.pendingCount : 0,
    lastError: null,
    shareRecipes: st.shareRecipes,
    recipeCount: st.activated && st.shareRecipes ? 128 : 0,
    update: updateInfo(),
  }
}

export function demoCloud(rawUrl: string, path: string, method: string, b: Record<string, unknown>): unknown {
  if (path === '/api/cloud/status' && method === 'GET') return status()

  if (path === '/api/cloud/activate' && method === 'POST') {
    const code = String(b.code ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(code)) fail(400, rawUrl, 'INPUT: Aktivasyon kodu biçimi geçersiz')
    if (code === '0000-0000-0000-0000') fail(400, rawUrl, 'CODE: Aktivasyon kodu geçersiz, süresi dolmuş veya kullanılmış')
    if (st.activated) fail(409, rawUrl, 'Makine zaten aktive edilmiş')
    st.activated = true
    st.machineId = 'b3f1c9e2-7a4d-4e1b-9c55-0d2a8f6e1a42'
    st.activatedAt = Date.now()
    st.pendingCount = 37
    st.lastPushAt = null
    st.lastRecipePullAt = null
    st.downloadStartedAt = null
    return status()
  }

  if (path === '/api/cloud/sync-now' && method === 'POST') {
    if (!st.activated) fail(409, rawUrl, 'Makine aktive edilmemiş')
    const now = new Date().toISOString()
    st.pendingCount = 0
    st.lastPushAt = now
    if (st.shareRecipes) st.lastRecipePullAt = now
    return undefined // 202
  }

  if (path === '/api/cloud/update/download' && method === 'POST') {
    if (!st.activated) fail(409, rawUrl, 'Makine aktive edilmemiş')
    if (st.downloadStartedAt == null) st.downloadStartedAt = Date.now()
    return undefined // 202
  }

  if (path === '/api/cloud/share' && method === 'PUT') {
    st.shareRecipes = b.shareRecipes === true
    if (st.shareRecipes && st.activated) st.lastRecipePullAt = new Date().toISOString()
    return { shareRecipes: st.shareRecipes }
  }

  if (path === '/api/cloud/deactivate' && method === 'POST') {
    st.activated = false
    st.machineId = null
    st.pendingCount = 0
    st.lastPushAt = null
    st.lastRecipePullAt = null
    st.downloadStartedAt = null
    return status()
  }

  fail(404, rawUrl, 'Demo modunda desteklenmiyor')
}
