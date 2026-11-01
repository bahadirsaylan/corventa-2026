// Bulut v2 IPC handler'ları (BULUT_API_V2.md §6) — kalıp kütüphanesi + lisans etkinleştirme, bulut yönetilen
// veriler (GET /api/cloud/config) ve kalite kontrol checklist sonucu (POST /api/checklist/results).
// Sonuçlar { ok, data } | { ok:false, status, error } zarfında (CloudResult) — DataApi Türkçe hata metni taşınır.
// status 0 = DataApi'ye ulaşılamadı · 501 = DataApi bu ucu henüz bilmiyor (eski sürüm, gövdesiz 404).
//
// Yetki: kalıp sorgu / liste herkes (oturum açık); lisans etkinleştirme OPERATOR+ (anahtar zaten gizli bilgi);
// checklist sonucu ADMIN+ (CHECK LIST sayfası ADMIN yetkisinde).

import { ipcMain } from 'electron'

import { HttpError } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import { getAuthUser, sessionHasRole } from '@main/services/auth/authSession'
import { dataApi } from '@main/services/data-api/DataApiClient'
import { normalizeMoldCode } from '@shared/moldCode'
import {
  Ipc,
  type ChecklistResultBody,
  type CloudConfig,
  type CloudResult,
  type MoldListQuery,
  type MoldListResponse,
  type MoldLookupResult,
} from '@shared'

const log = childLogger('ipc:mold')

const LICENSE_KEY_RE = /^KL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
const MAX_CODE_LEN = 32

function failure(err: unknown): { ok: false; status: number; error: string } {
  if (err instanceof HttpError) {
    log.warn('cloud-data request failed', { status: err.status, error: err.message })
    // Gövdesiz 404 = uç yok (DataApi v2 öncesi) — "bulunamadı" ile karışmasın
    if (err.status === 404 && err.message === 'HTTP 404') {
      return { ok: false, status: 501, error: 'DataApi bu özelliği desteklemiyor (güncelleme gerekli)' }
    }
    return { ok: false, status: err.status, error: err.message }
  }
  const message = err instanceof Error ? err.message : String(err)
  log.warn('cloud-data request unreachable', { error: message })
  return { ok: false, status: 0, error: message }
}

async function wrap<T>(fn: () => Promise<T>): Promise<CloudResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return failure(err)
  }
}

function cleanCode(raw: unknown): string | null {
  const c = normalizeMoldCode(String(raw ?? ''))
  return c && c.length <= MAX_CODE_LEN ? c : null
}

function str(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max)
}

export function registerMoldHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.MoldList, async (_evt, q?: MoldListQuery): Promise<CloudResult<MoldListResponse>> => {
    const query: MoldListQuery = {
      q: q?.q ? str(q.q, 64) : undefined,
      profileType: q?.profileType || undefined,
      licensed: typeof q?.licensed === 'boolean' ? q.licensed : null,
    }
    return wrap(() => dataApi.listMolds(query))
  })

  ipcMain.handle(Ipc.IpcInvoke.MoldGet, async (_evt, code: unknown): Promise<CloudResult<MoldLookupResult>> => {
    const c = cleanCode(code)
    if (!c) return { ok: false, status: 400, error: 'Kalıp kodu boş' }
    log.info('mold-get', { code: c })
    return wrap(() => dataApi.getMold(c))
  })

  ipcMain.handle(
    Ipc.IpcInvoke.MoldActivate,
    async (_evt, code: unknown, licenseKey: unknown): Promise<CloudResult<MoldLookupResult>> => {
      if (!sessionHasRole('OPERATOR')) return { ok: false, status: 401, error: 'Oturum açık değil' }
      const c = cleanCode(code)
      if (!c) return { ok: false, status: 400, error: 'Kalıp kodu boş' }
      const key = String(licenseKey ?? '').trim().toUpperCase()
      if (!LICENSE_KEY_RE.test(key)) {
        return { ok: false, status: 400, error: 'Lisans anahtarı KL-XXXX-XXXX-XXXX biçiminde olmalı' }
      }
      // Anahtarın tamamı log'a yazılmaz
      log.info('mold-activate', { code: c, keyTail: key.slice(-4), username: getAuthUser()?.username ?? null })
      return wrap(() => dataApi.activateMoldLicense(c, key))
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.CloudGetConfig, async (): Promise<CloudResult<CloudConfig>> =>
    wrap(() => dataApi.getCloudConfig()))

  ipcMain.handle(
    Ipc.IpcInvoke.ChecklistSubmitResult,
    async (_evt, body: ChecklistResultBody): Promise<CloudResult<unknown>> => {
      if (!sessionHasRole('ADMIN')) return { ok: false, status: 403, error: 'ADMİN yetkisi gerekli' }
      const inspectorName = str(body?.inspectorName, 120)
      if (!inspectorName) return { ok: false, status: 400, error: 'Kontrolcü adı zorunlu' }
      const items = Array.isArray(body?.items) ? body.items.slice(0, 200) : []
      if (!items.length) return { ok: false, status: 400, error: 'Checklist maddesi yok' }
      const clean: ChecklistResultBody = {
        templateId: str(body.templateId, 64),
        templateVersion: Math.round(Number(body.templateVersion) || 0),
        inspectorName,
        items: items.map((i) => ({
          id: str(i?.id, 64),
          checked: i?.checked === true,
          note: str(i?.note, 500) || null,
        })),
      }
      log.info('checklist-submit', {
        templateId: clean.templateId,
        version: clean.templateVersion,
        checked: clean.items.filter((i) => i.checked).length,
        total: clean.items.length,
      })
      return wrap(() => dataApi.submitChecklistResult(clean))
    },
  )
}
