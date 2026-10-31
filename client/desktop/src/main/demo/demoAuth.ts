// DEMO MODU — rol sistemi uçları (DataApi /api/auth/* + /api/users/* sözleşmesiyle birebir).
//
// Kullanıcılar bellekte (süreç boyunca): operator/1234 (OPERATOR), admin/1234 (ADMIN), super/1234 (SUPERADMIN).
// setup-status her zaman needsSetup=false. Hata kodları + { error } gövdeleri gerçek backend ile aynı
// (400 / 401 / 403 / 404 / 409 / 423 + lockedUntil).
//
// İstek başlıkları interceptor'a gelmediği için Bearer, main'deki oturumdan (authSession) okunur —
// gerçekte de aynı token gönderiliyor; demo onu kendi oturum tablosunda doğrular.

import { randomUUID } from 'node:crypto'

import { HttpError } from '@main/lib/http'
import { getAuthToken } from '@main/services/auth/authSession'
import { ROLE_RANK, normalizeRole, type UserRole } from '@shared/types'

interface DemoUser {
  id: number
  username: string
  displayName: string
  role: UserRole
  isActive: boolean
  password: string
  createdAt: string
  lastLoginAt: string | null
  lockedUntil: number | null
  failed: number
}

const MIN_PASSWORD = 6
const MAX_FAILED = 5
const LOCK_MS = 5 * 60_000
const SESSION_MS = 12 * 3_600_000
const INVALID = 'Kullanıcı adı veya şifre hatalı'

const created = new Date(Date.now() - 30 * 86_400_000).toISOString()
const users: DemoUser[] = [
  { id: 1, username: 'super', displayName: 'Süper Yönetici', role: 'SUPERADMIN', isActive: true, password: '1234', createdAt: created, lastLoginAt: null, lockedUntil: null, failed: 0 },
  { id: 2, username: 'admin', displayName: 'Atölye Yöneticisi', role: 'ADMIN', isActive: true, password: '1234', createdAt: created, lastLoginAt: null, lockedUntil: null, failed: 0 },
  { id: 3, username: 'operator', displayName: 'Makine Operatörü', role: 'OPERATOR', isActive: true, password: '1234', createdAt: created, lastLoginAt: null, lockedUntil: null, failed: 0 },
]
let nextId = 4

/** token → { userId, expiresAt } */
const sessions = new Map<string, { userId: number; expiresAt: number }>()

function fail(status: number, url: string, error: string, extra?: Record<string, unknown>): never {
  throw new HttpError(status, url, error, { error, ...extra })
}

function dto(u: DemoUser): Record<string, unknown> {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    lockedUntil: u.lockedUntil != null && u.lockedUntil > Date.now() ? new Date(u.lockedUntil).toISOString() : null,
  }
}

function findByName(name: string): DemoUser | undefined {
  const n = name.trim().toLocaleLowerCase('tr-TR')
  return users.find((u) => u.username.toLocaleLowerCase('tr-TR') === n)
}

function validateUsername(name: string): string | null {
  if (name.length < 3 || name.length > 50) return 'Kullanıcı adı 3-50 karakter olmalı'
  if (/\s/.test(name)) return 'Kullanıcı adı boşluk içeremez'
  return null
}

function validatePassword(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `Şifre en az ${MIN_PASSWORD} karakter olmalı`
  if (pw.length > 128) return 'Şifre en fazla 128 karakter olabilir'
  return null
}

function revokeAll(userId: number, keepToken?: string | null): void {
  for (const [tok, s] of sessions) if (s.userId === userId && tok !== keepToken) sessions.delete(tok)
}

/** Main'deki oturum token'ı → demo kullanıcısı (yoksa / süresi dolduysa / pasifse null) */
function currentUser(): DemoUser | null {
  const token = getAuthToken()
  if (!token) return null
  const s = sessions.get(token)
  if (!s || s.expiresAt <= Date.now()) return null
  const u = users.find((x) => x.id === s.userId)
  return u && u.isActive ? u : null
}

/** [RequireRole] filtresinin karşılığı: 401 oturum yok, 403 rol yetersiz */
export function demoRequireRole(url: string, min: UserRole): DemoUser {
  const actor = currentUser()
  if (!actor) fail(401, url, 'Oturum geçersiz veya süresi dolmuş — tekrar giriş yapın')
  if (ROLE_RANK[actor.role] < ROLE_RANK[min]) fail(403, url, `Bu işlem için yetkiniz yok (${min} gerekli)`)
  return actor
}

/** SUPERADMIN her rolü, ADMIN sadece OPERATOR'ı yönetir */
function canManage(actor: DemoUser, role: UserRole): boolean {
  return actor.role === 'SUPERADMIN' || (actor.role === 'ADMIN' && role === 'OPERATOR')
}

function activeSuperAdmins(): number {
  return users.filter((u) => u.isActive && u.role === 'SUPERADMIN').length
}

function loginResponse(u: DemoUser): Record<string, unknown> {
  const token = randomUUID().replace(/-/g, '')
  const expiresAt = Date.now() + SESSION_MS
  sessions.set(token, { userId: u.id, expiresAt })
  u.lastLoginAt = new Date().toISOString()
  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
    user: { id: u.id, username: u.username, displayName: u.displayName, role: u.role },
  }
}

export function demoAuth(rawUrl: string, path: string, method: string, b: Record<string, unknown>): unknown {
  // ── /api/auth ──
  if (path === '/api/auth/setup-status' && method === 'GET') return { needsSetup: false }
  if (path === '/api/auth/setup' && method === 'POST') fail(409, rawUrl, 'İlk kurulum zaten yapılmış — giriş yapın')
  if (path === '/api/auth/login' && method === 'POST') {
    const username = String(b.username ?? '').trim()
    const password = typeof b.password === 'string' ? b.password : ''
    if (!username || !password) fail(400, rawUrl, 'Kullanıcı adı ve şifre zorunlu')
    const u = findByName(username)
    if (!u) fail(401, rawUrl, INVALID)
    const now = Date.now()
    if (u.lockedUntil != null && u.lockedUntil > now) {
      fail(423, rawUrl, `Çok fazla hatalı deneme — hesap ${Math.ceil((u.lockedUntil - now) / 60_000)} dk kilitli`, {
        lockedUntil: new Date(u.lockedUntil).toISOString(),
      })
    }
    if (u.password !== password) {
      u.failed++
      if (u.failed >= MAX_FAILED) {
        u.failed = 0
        u.lockedUntil = now + LOCK_MS
        fail(423, rawUrl, `Çok fazla hatalı deneme — hesap ${LOCK_MS / 60_000} dk kilitlendi`, {
          lockedUntil: new Date(u.lockedUntil).toISOString(),
        })
      }
      fail(401, rawUrl, INVALID)
    }
    if (!u.isActive) fail(403, rawUrl, 'Kullanıcı pasif — yöneticinize başvurun')
    u.failed = 0
    u.lockedUntil = null
    return loginResponse(u)
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = getAuthToken()
    if (token) sessions.delete(token)
    return { ok: true }
  }
  if (path === '/api/auth/me' && method === 'GET') {
    const u = currentUser()
    if (!u) fail(401, rawUrl, 'Oturum geçersiz')
    return { id: u.id, username: u.username, displayName: u.displayName, role: u.role }
  }

  // ── /api/users (ADMIN+) ──
  if (path === '/api/users') {
    const actor = demoRequireRole(rawUrl, 'ADMIN')
    if (method === 'GET') return users.map(dto)
    if (method === 'POST') {
      const username = String(b.username ?? '').trim()
      const err = validateUsername(username) ?? validatePassword(b.password)
      if (err) fail(400, rawUrl, err)
      const roleRaw = String(b.role ?? '').trim().toUpperCase()
      if (!['OPERATOR', 'ADMIN', 'SUPERADMIN'].includes(roleRaw)) {
        fail(400, rawUrl, `Geçersiz rol '${String(b.role ?? '')}'. Beklenen: OPERATOR|ADMIN|SUPERADMIN`)
      }
      const role = normalizeRole(roleRaw)
      if (!canManage(actor, role)) fail(403, rawUrl, `${actor.role} sadece OPERATOR kullanıcı oluşturabilir`)
      const displayName = String(b.displayName ?? '').trim() || username
      if (displayName.length > 100) fail(400, rawUrl, 'Görünen ad en fazla 100 karakter olabilir')
      if (findByName(username)) fail(409, rawUrl, `'${username}' kullanıcı adı zaten kullanılıyor`)
      const u: DemoUser = {
        id: nextId++, username, displayName, role, isActive: true, password: String(b.password),
        createdAt: new Date().toISOString(), lastLoginAt: null, lockedUntil: null, failed: 0,
      }
      users.push(u)
      return dto(u)
    }
  }

  const m = /^\/api\/users\/(\d+)$/.exec(path)
  if (m) {
    const actor = demoRequireRole(rawUrl, 'ADMIN')
    const id = Number(m[1])
    const target = users.find((u) => u.id === id)
    if (!target) fail(404, rawUrl, `Kullanıcı ${id} bulunamadı`)
    const isSelf = target.id === actor.id

    if (method === 'PUT') {
      if (!isSelf && !canManage(actor, target.role)) fail(403, rawUrl, `${actor.role} sadece OPERATOR kullanıcıları düzenleyebilir`)
      let newRole: UserRole | null = null
      if (b.role != null) {
        const r = String(b.role).trim().toUpperCase()
        if (!['OPERATOR', 'ADMIN', 'SUPERADMIN'].includes(r)) {
          fail(400, rawUrl, `Geçersiz rol '${String(b.role)}'. Beklenen: OPERATOR|ADMIN|SUPERADMIN`)
        }
        newRole = normalizeRole(r)
        if (newRole === target.role) newRole = null
      }
      if (newRole) {
        if (isSelf && ROLE_RANK[newRole] < ROLE_RANK[target.role]) fail(409, rawUrl, 'Kendi rolünüzü düşüremezsiniz')
        if (!canManage(actor, newRole)) fail(403, rawUrl, `${actor.role} bu rolü atayamaz (${newRole})`)
      }
      const deactivate = b.isActive === false && target.isActive
      if (deactivate && isSelf) fail(409, rawUrl, 'Kendinizi pasifleştiremezsiniz')
      const losesSuper = target.role === 'SUPERADMIN' && target.isActive && (deactivate || (newRole != null && newRole !== 'SUPERADMIN'))
      if (losesSuper && activeSuperAdmins() <= 1) fail(409, rawUrl, 'Son aktif SUPERADMIN pasifleştirilemez veya rolü düşürülemez')
      if (b.displayName != null) {
        const dn = String(b.displayName).trim()
        if (dn.length === 0 || dn.length > 100) fail(400, rawUrl, 'Görünen ad 1-100 karakter olmalı')
        target.displayName = dn
      }
      let pwChanged = false
      if (b.password != null) {
        const pwErr = validatePassword(b.password)
        if (pwErr) fail(400, rawUrl, pwErr)
        target.password = String(b.password)
        target.failed = 0
        target.lockedUntil = null
        pwChanged = true
      }
      if (newRole) target.role = newRole
      if (typeof b.isActive === 'boolean') target.isActive = b.isActive
      if (deactivate) revokeAll(target.id)
      else if (pwChanged || newRole) revokeAll(target.id, isSelf ? getAuthToken() : null)
      return dto(target)
    }

    if (method === 'DELETE') {
      if (isSelf) fail(409, rawUrl, 'Kendinizi pasifleştiremezsiniz')
      if (!canManage(actor, target.role)) fail(403, rawUrl, `${actor.role} sadece OPERATOR kullanıcıları pasifleştirebilir`)
      if (!target.isActive) return dto(target)
      if (target.role === 'SUPERADMIN' && activeSuperAdmins() <= 1) fail(409, rawUrl, 'Son aktif SUPERADMIN pasifleştirilemez')
      target.isActive = false
      revokeAll(target.id)
      return dto(target)
    }
  }

  fail(404, rawUrl, 'Demo modunda desteklenmiyor')
}
