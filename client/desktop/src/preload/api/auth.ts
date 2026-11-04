// window.corventa.auth.* — Rol sistemi köprüsü (DataApi /api/auth + /api/users).
// Token main süreçte kalır; burada sadece kimlik ({ username, displayName, role }) ve sonuç zarfları geçer.
// Demo modunda istekler main → DemoMachine'e gider (operator/admin/super, şifre 1234).

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type AuthResult,
  type AuthUser,
  type CreateUserBody,
  type UpdateUserBody,
  type UserListItem,
} from '@shared'

export const authApi = {
  /** İlk kurulum gerekli mi (DB'de hiç kullanıcı yok) */
  getSetupStatus: (): Promise<AuthResult<{ needsSetup: boolean }>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.AuthGetSetupStatus),

  /** İlk kurulum — SÜPERADMİN oluşturur ve oturumu açar */
  setup: (body: { username: string; displayName?: string; password: string }): Promise<AuthResult<AuthUser>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.AuthSetup, body),

  login: (username: string, password: string): Promise<AuthResult<AuthUser>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.AuthLogin, username, password),

  /** Main'deki token'ı siler + DataApi /api/auth/logout */
  logout: (): Promise<{ ok: true }> => ipcRenderer.invoke(Ipc.IpcInvoke.AuthLogout),

  /** Main'de açık oturum (renderer yeniden yüklenince kimliği geri almak için) */
  getCurrent: (): Promise<AuthUser | null> => ipcRenderer.invoke(Ipc.IpcInvoke.AuthGetCurrent),

  // ---------- Kullanıcı yönetimi (ADMIN+) ----------
  listUsers: (): Promise<AuthResult<UserListItem[]>> => ipcRenderer.invoke(Ipc.IpcInvoke.UsersList),

  createUser: (body: CreateUserBody): Promise<AuthResult<UserListItem>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UsersCreate, body),

  updateUser: (id: number, body: UpdateUserBody): Promise<AuthResult<UserListItem>> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.UsersUpdate, id, body),

  /** Silmez — pasifleştirir */
  deactivateUser: (id: number): Promise<AuthResult<true>> => ipcRenderer.invoke(Ipc.IpcInvoke.UsersDeactivate, id),
}

export type AuthApi = typeof authApi
