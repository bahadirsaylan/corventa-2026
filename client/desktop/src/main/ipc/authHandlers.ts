// Rol sistemi IPC handler'ları — DataApi /api/auth/* + /api/users/* (2026-11-01).
//
// Token main süreçte kalır (authSession). Renderer'a sadece { username, displayName, role } döner.
// HTTP hataları fırlatılmaz: AuthResult zarfı { ok:false, status, error, lockedUntil? } — renderer
// durum koduna göre net Türkçe mesaj seçer (401 / 403 / 409 / 423, 0 = DataApi'ye ulaşılamadı).
// Kullanıcı uçlarında 401 → oturum geçersiz (süre doldu / kullanıcı pasifleşti) → main oturumu silinir.

import { ipcMain } from 'electron'

import { HttpError } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  installAuthHeaderProvider,
  setAuthSession,
} from '@main/services/auth/authSession'
import { dataApi, type AuthLoginResponse } from '@main/services/data-api/DataApiClient'
import {
  Ipc,
  normalizeRole,
  type AuthResult,
  type AuthUser,
  type CreateUserBody,
  type UpdateUserBody,
  type UserListItem,
} from '@shared'

const log = childLogger('ipc:auth')

function failure(err: unknown, op: string): { ok: false; status: number; error: string; lockedUntil?: string | null } {
  if (err instanceof HttpError) {
    const body = (err.body ?? {}) as { lockedUntil?: unknown }
    const lockedUntil = typeof body.lockedUntil === 'string' ? body.lockedUntil : null
    log.warn(`${op} failed`, { status: err.status, error: err.message })
    return { ok: false, status: err.status, error: err.message, lockedUntil }
  }
  const message = err instanceof Error ? err.message : String(err)
  log.warn(`${op} unreachable`, { error: message })
  return { ok: false, status: 0, error: message }
}

/** Giriş / kurulum cevabı → main'de oturumu aç, renderer'a token'sız kimlik ver */
function openSession(res: AuthLoginResponse): AuthUser {
  const user: AuthUser = {
    username: res.user.username,
    displayName: res.user.displayName?.trim() || res.user.username,
    role: normalizeRole(res.user.role),
  }
  setAuthSession(res.token, res.expiresAt ?? null, user)
  log.info('session opened', { username: user.username, role: user.role })
  return user
}

function normalizeUser(u: UserListItem): UserListItem {
  return { ...u, role: normalizeRole(u.role) }
}

/** Token gerektiren kullanıcı uçları — oturum yoksa istek atılmadan 401; 401 gelirse oturum silinir */
async function withSession<T>(op: string, fn: () => Promise<T>): Promise<AuthResult<T>> {
  if (!getAuthToken()) return { ok: false, status: 401, error: 'Oturum yok' }
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) clearAuthSession()
    return failure(err, op)
  }
}

export function registerAuthHandlers(): void {
  installAuthHeaderProvider()

  ipcMain.handle(Ipc.IpcInvoke.AuthGetSetupStatus, async (): Promise<AuthResult<{ needsSetup: boolean }>> => {
    try {
      const res = await dataApi.getAuthSetupStatus()
      return { ok: true, data: { needsSetup: res?.needsSetup === true } }
    } catch (err) {
      return failure(err, 'setup-status')
    }
  })

  ipcMain.handle(
    Ipc.IpcInvoke.AuthSetup,
    async (_evt, body: { username: string; displayName?: string; password: string }): Promise<AuthResult<AuthUser>> => {
      try {
        return { ok: true, data: openSession(await dataApi.authSetup(body)) }
      } catch (err) {
        return failure(err, 'setup')
      }
    },
  )

  ipcMain.handle(
    Ipc.IpcInvoke.AuthLogin,
    async (_evt, username: string, password: string): Promise<AuthResult<AuthUser>> => {
      clearAuthSession() // önceki oturum (varsa) yeni girişte düşer
      try {
        return { ok: true, data: openSession(await dataApi.authLogin(username, password)) }
      } catch (err) {
        return failure(err, 'login')
      }
    },
  )

  ipcMain.handle(Ipc.IpcInvoke.AuthLogout, async (): Promise<{ ok: true }> => {
    if (getAuthToken()) {
      try {
        await dataApi.authLogout()
      } catch (err) {
        // DataApi'ye ulaşılamasa da yerel oturum kapanır (token zaten süreyle düşer)
        log.warn('logout request failed', { error: (err as Error).message })
      }
    }
    const user = getAuthUser()
    clearAuthSession()
    if (user) log.info('session closed', { username: user.username })
    return { ok: true }
  })

  ipcMain.handle(Ipc.IpcInvoke.AuthGetCurrent, async (): Promise<AuthUser | null> => getAuthUser())

  // ---------- Kullanıcı yönetimi (ADMIN+ — yetkiyi backend de kontrol eder) ----------

  ipcMain.handle(Ipc.IpcInvoke.UsersList, async (): Promise<AuthResult<UserListItem[]>> =>
    withSession('users:list', async () => ((await dataApi.listUsers()) ?? []).map(normalizeUser)),
  )

  ipcMain.handle(Ipc.IpcInvoke.UsersCreate, async (_evt, body: CreateUserBody): Promise<AuthResult<UserListItem>> =>
    withSession('users:create', async () => normalizeUser(await dataApi.createUser(body))),
  )

  ipcMain.handle(
    Ipc.IpcInvoke.UsersUpdate,
    async (_evt, id: number, body: UpdateUserBody): Promise<AuthResult<UserListItem>> =>
      withSession('users:update', async () => normalizeUser(await dataApi.updateUser(id, body))),
  )

  ipcMain.handle(Ipc.IpcInvoke.UsersDeactivate, async (_evt, id: number): Promise<AuthResult<true>> =>
    withSession('users:deactivate', async () => {
      await dataApi.deactivateUser(id)
      return true as const
    }),
  )
}
