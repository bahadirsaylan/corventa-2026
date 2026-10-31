// Ayarlar > Kullanıcı Yönetimi — gerçek DataApi /api/users (rol sistemi 2026-11-01).
// ADMIN: sadece OPERATOR ekler / düzenler / pasifleştirir (kendi profilini de düzenleyebilir).
// SUPERADMIN: tüm roller. Kurallar backend'de de uygulanır; backend hata mesajı olduğu gibi gösterilir.
// Silme yok — pasifleştirme (aktif/pasif). Şifre sıfırlama hesabın kilidini de açar ve oturumlarını kapatır.

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { USER_ROLES, type AuthResult, type UserListItem, type UserRole } from '@shared/types'

import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import { LockIcon } from '@/components/RoleNotice/LockIcon'
import { ROLE_LABELS, hasRole, roleCan } from '@/constants/permissions'
import { endSession, useRole, useSessionStore } from '@/stores/sessionStore'
import { t as tr, useT } from '@/i18n'
import styles from './UserManagementPage.module.css'

const MIN_PASSWORD = 6

const ROLE_COLORS: Record<UserRole, string> = {
  OPERATOR: '#1a6fd4',
  ADMIN: '#d97706',
  SUPERADMIN: '#c93235',
}

/** Aktör bu role sahip kullanıcıyı yönetebilir mi (SUPERADMIN hepsi, ADMIN sadece OPERATOR) */
function canManage(actor: UserRole | null, target: UserRole): boolean {
  if (!actor) return false
  return roleCan(actor, 'manage-admins') || (hasRole(actor, 'ADMIN') && target === 'OPERATOR')
}

/** Aktörün atayabileceği roller */
function assignableRoles(actor: UserRole | null): UserRole[] {
  return USER_ROLES.filter((r) => canManage(actor, r))
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isLocked(u: UserListItem): boolean {
  return !!u.lockedUntil && Date.parse(u.lockedUntil) > Date.now()
}

/** Hata zarfı → ekran mesajı (backend metni; ulaşılamadı / oturum düştü durumları sabit) */
function errorText(res: Extract<AuthResult<unknown>, { ok: false }>): string {
  if (res.status === 0) return tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN')
  if (res.status === 401) return tr('OTURUM SÜRESİ DOLDU — TEKRAR GİRİŞ YAPIN')
  return res.error
}

type Editor = { mode: 'create' } | { mode: 'edit'; user: UserListItem }

export default function UserManagementPage() {
  const navigate = useNavigate()
  const t = useT()
  const actorRole = useRole()
  const actorName = useSessionStore((s) => s.username)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [editor, setEditor] = useState<Editor | null>(null)

  /** 401 → oturum geçersiz (süre doldu / kullanıcı pasifleşti): girişe dön */
  const handleUnauthorized = useCallback(
    (res: AuthResult<unknown>) => {
      if (!res.ok && res.status === 401) {
        void endSession().then(() => navigate('/login', { replace: true }))
        return true
      }
      return false
    },
    [navigate],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.corventa.auth.listUsers()
      if (res.ok) {
        setUsers(res.data)
        setLoadError(null)
      } else if (!handleUnauthorized(res)) {
        setLoadError(errorText(res))
      }
    } catch {
      setLoadError(tr('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
    } finally {
      setLoading(false)
    }
  }, [handleUnauthorized])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = users.filter((u) =>
    filter === 'all' ? true : filter === 'active' ? u.isActive : !u.isActive,
  )

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    admins: users.filter((u) => u.role !== 'OPERATOR').length,
  }

  const isSelf = (u: UserListItem) => u.username.toLocaleLowerCase('tr-TR') === (actorName ?? '').toLocaleLowerCase('tr-TR')

  function openEdit(u: UserListItem) {
    if (!isSelf(u) && !canManage(actorRole, u.role)) {
      showRoleNotice('SUPERADMIN')
      return
    }
    setEditor({ mode: 'edit', user: u })
  }

  function onSaved(saved: UserListItem) {
    setEditor(null)
    setUsers((list) => {
      const i = list.findIndex((x) => x.id === saved.id)
      if (i < 0) return [...list, saved]
      const next = list.slice()
      next[i] = saved
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('KULLANICI YÖNETİMİ')}</h1>
        <button className={styles.addBtn} onClick={() => setEditor({ mode: 'create' })}>
          + {t('YENİ KULLANICI')}
        </button>
      </div>

      <div className={styles.body}>
        {/* ── Özet kartı ─────────────────────────── */}
        <div className={styles.statsRow}>
          <StatCard label={t('TOPLAM')} value={stats.total} color="#2a2a2a" />
          <StatCard label={t('AKTİF')} value={stats.active} color="#16a34a" />
          <StatCard label={t('YÖNETİCİ')} value={stats.admins} color="#c93235" />
        </div>

        {/* ── Filtre butonları ───────────────────── */}
        <div className={styles.filterRow}>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>{t('TÜMÜ ({n})', { n: users.length })}</FilterBtn>
          <FilterBtn active={filter === 'active'} onClick={() => setFilter('active')}>{t('AKTİF ({n})', { n: stats.active })}</FilterBtn>
          <FilterBtn active={filter === 'passive'} onClick={() => setFilter('passive')}>{t('PASİF ({n})', { n: users.length - stats.active })}</FilterBtn>
          <button type="button" className={styles.refreshBtn} onClick={() => void load()} disabled={loading}>
            {t('YENİLE')}
          </button>
        </div>

        {loadError && <p className={styles.errorBox} role="alert">{loadError}</p>}

        {/* ── Kullanıcı tablosu ──────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('KULLANICILAR')}</div>
          {loading && users.length === 0 ? (
            <p className={styles.empty}>{t('YÜKLENİYOR…')}</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>{t('KAYIT YOK')}</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('AD SOYAD')}</th>
                  <th>{t('KULLANICI ADI')}</th>
                  <th>{t('ROL')}</th>
                  <th>{t('SON GİRİŞ')}</th>
                  <th>{t('DURUM')}</th>
                  <th>{t('İŞLEM')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const editable = isSelf(u) || canManage(actorRole, u.role)
                  return (
                    <tr key={u.id} className={!u.isActive ? styles.rowPassive : ''}>
                      <td className={styles.tdName}>
                        {u.displayName}
                        {isSelf(u) && <span className={styles.selfTag}>{t('SİZ')}</span>}
                      </td>
                      <td className={styles.tdMono}>{u.username}</td>
                      <td>
                        <span className={styles.roleTag} style={{ background: ROLE_COLORS[u.role] }}>
                          {t(ROLE_LABELS[u.role])}
                        </span>
                      </td>
                      <td className={styles.tdMono}>{formatDate(u.lastLoginAt)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${u.isActive ? styles.pillActive : styles.pillPassive}`}>
                          {u.isActive ? t('AKTİF') : t('PASİF')}
                        </span>
                        {isLocked(u) && <span className={`${styles.statusPill} ${styles.pillLocked}`}>{t('KİLİTLİ')}</span>}
                      </td>
                      <td className={styles.tdActions}>
                        <button
                          className={`${styles.actionBtn} ${editable ? '' : styles.actionLocked}`}
                          onClick={() => openEdit(u)}
                          aria-disabled={!editable || undefined}
                        >
                          {!editable && <LockIcon className={styles.actionLockIcon} />}
                          {t('DÜZENLE')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className={styles.note}>
          {t('Pasif kullanıcılar sisteme giriş yapamaz. 5 hatalı şifre denemesinde hesap 5 dakika kilitlenir; şifre sıfırlama kilidi açar. ADMİN sadece operatörleri, SÜPERADMİN tüm kullanıcıları yönetir.')}
        </p>
      </div>

      {editor && (
        <UserEditor
          editor={editor}
          actorRole={actorRole}
          isSelf={editor.mode === 'edit' && isSelf(editor.user)}
          onCancel={() => setEditor(null)}
          onSaved={onSaved}
          onUnauthorized={handleUnauthorized}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Ekle / düzenle penceresi
// ─────────────────────────────────────────────────────────────

function UserEditor({
  editor,
  actorRole,
  isSelf,
  onCancel,
  onSaved,
  onUnauthorized,
}: {
  editor: Editor
  actorRole: UserRole | null
  isSelf: boolean
  onCancel: () => void
  onSaved: (u: UserListItem) => void
  onUnauthorized: (res: AuthResult<unknown>) => boolean
}) {
  const t = useT()
  const editing = editor.mode === 'edit' ? editor.user : null
  const roles = assignableRoles(actorRole)
  // Kendi profilinde rol değişmez (yükseltme yetkisi zaten yok, düşürme backend'de 409)
  const roleOptions: UserRole[] = editing && (isSelf || !roles.includes(editing.role)) ? [editing.role] : roles

  const [displayName, setDisplayName] = useState(editing?.displayName ?? '')
  const [username, setUsername] = useState(editing?.username ?? '')
  const [role, setRole] = useState<UserRole>(editing?.role ?? roles[0] ?? 'OPERATOR')
  const [isActive, setIsActive] = useState(editing?.isActive ?? true)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    const dn = displayName.trim()
    if (!dn) return setError(t('AD SOYAD ZORUNLU'))
    if (!editing) {
      const name = username.trim()
      if (name.length < 3 || name.length > 50) return setError(t('KULLANICI ADI 3-50 KARAKTER OLMALI'))
      if (/\s/.test(name)) return setError(t('KULLANICI ADI BOŞLUK İÇEREMEZ'))
    }
    const pwRequired = !editing
    if ((pwRequired || password) && password.length < MIN_PASSWORD) {
      return setError(t('ŞİFRE EN AZ {n} KARAKTER OLMALI', { n: MIN_PASSWORD }))
    }
    if (password && password !== password2) return setError(t('ŞİFRELER AYNI DEĞİL'))

    setBusy(true)
    try {
      let res: AuthResult<UserListItem>
      if (!editing) {
        res = await window.corventa.auth.createUser({ username: username.trim(), displayName: dn, password, role })
      } else {
        // Sadece değişen alanlar gönderilir
        const body: { displayName?: string; role?: UserRole; isActive?: boolean; password?: string } = {}
        if (dn !== editing.displayName) body.displayName = dn
        if (role !== editing.role) body.role = role
        if (isActive !== editing.isActive) body.isActive = isActive
        if (password) body.password = password
        if (Object.keys(body).length === 0) return onCancel()
        res = await window.corventa.auth.updateUser(editing.id, body)
      }
      if (res.ok) return onSaved(res.data)
      if (onUnauthorized(res)) return
      setError(errorText(res))
    } catch {
      setError(t('VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.dialog} onSubmit={submit} noValidate>
        <div className={styles.dialogTitle}>
          {editing ? t('KULLANICIYI DÜZENLE') : t('YENİ KULLANICI')}
          {editing && <span className={styles.dialogSub}>{editing.username}</span>}
        </div>

        <Field label={t('AD SOYAD')}>
          <input className={styles.input} type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
        </Field>

        {!editing && (
          <Field label={t('KULLANICI ADI')}>
            <input className={styles.input} type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </Field>
        )}

        <Field label={t('ROL')}>
          <div className={styles.segment}>
            {roleOptions.map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.segmentBtn} ${role === r ? styles.segmentActive : ''}`}
                onClick={() => setRole(r)}
              >
                {t(ROLE_LABELS[r])}
              </button>
            ))}
          </div>
          {!editing && roles.length === 1 && (
            <span className={styles.fieldHint}>{t('ADMİN sadece OPERATÖR ekleyebilir')}</span>
          )}
        </Field>

        {editing && (
          <Field label={t('DURUM')}>
            <div className={styles.segment}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${isActive ? styles.segmentActive : ''}`}
                onClick={() => setIsActive(true)}
              >
                {t('AKTİF')}
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${!isActive ? styles.segmentActive : ''}`}
                onClick={() => setIsActive(false)}
                disabled={isSelf}
              >
                {t('PASİF')}
              </button>
            </div>
            {isSelf && <span className={styles.fieldHint}>{t('Kendinizi pasifleştiremezsiniz')}</span>}
          </Field>
        )}

        <div className={styles.fieldRow}>
          <Field label={editing ? t('YENİ ŞİFRE (SIFIRLAMA)') : t('ŞİFRE')}>
            <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t('ŞİFRE TEKRAR')}>
            <input className={styles.input} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        {editing && <span className={styles.fieldHint}>{t('Şifreyi değiştirmeyecekseniz boş bırakın.')}</span>}

        {error && <p className={styles.errorBox} role="alert">{error}</p>}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            {t('VAZGEÇ')}
          </button>
          <button type="submit" className={styles.saveBtn} disabled={busy}>
            {busy ? t('KAYDEDİLİYOR…') : t('KAYDET')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={{ color }}>{value}</span>
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`${styles.filterBtn} ${active ? styles.filterActive : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
