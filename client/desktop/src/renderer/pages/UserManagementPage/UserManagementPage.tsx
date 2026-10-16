// Ayarlar > Kullanıcı Yönetimi — mock kullanıcı listesi + rol + son giriş + ekle/düzenle/sil butonları.
// Gerçek user CRUD gelecekte DataApi.users endpoint'lerine bağlanacak.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import styles from './UserManagementPage.module.css'

type Role = 'ADMIN' | 'OPERATÖR' | 'BAKIM' | 'TEKNİSYEN'

interface UserRow {
  id: number
  fullName: string
  username: string
  role: Role
  active: boolean
  lastLogin: string | null
}

// Mock — gerçek liste DataApi'den gelecek
const INITIAL_USERS: UserRow[] = [
  { id: 1, fullName: 'Serkan Öztürk',     username: 'serkan',   role: 'ADMIN',      active: true,  lastLogin: '2026-08-14 09:15' },
  { id: 2, fullName: 'Ahmet Yılmaz',       username: 'ahmet',    role: 'OPERATÖR',   active: true,  lastLogin: '2026-08-13 16:42' },
  { id: 3, fullName: 'Mehmet Demir',       username: 'mehmet',   role: 'OPERATÖR',   active: true,  lastLogin: '2026-08-14 07:30' },
  { id: 4, fullName: 'Ali Kaya',           username: 'ali',      role: 'BAKIM',      active: true,  lastLogin: '2026-08-12 11:08' },
  { id: 5, fullName: 'Sersovis Servis',    username: 'servis',   role: 'TEKNİSYEN',  active: true,  lastLogin: '2026-08-01 14:22' },
  { id: 6, fullName: 'Osman Şahin',        username: 'osman',    role: 'OPERATÖR',   active: false, lastLogin: '2026-06-05 09:00' },
]

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: '#dc2626', OPERATÖR: '#1a6fd4', BAKIM: '#16a34a', TEKNİSYEN: '#7c3aed',
}

export default function UserManagementPage() {
  const navigate = useNavigate()
  const t = useT()
  const [users] = useState<UserRow[]>(INITIAL_USERS)
  const [filter, setFilter] = useState<'all' | 'active' | 'passive'>('all')

  const filtered = users.filter((u) =>
    filter === 'all' ? true : filter === 'active' ? u.active : !u.active,
  )

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>←</button>
        <h1 className={styles.title}>{t('KULLANICI YÖNETİMİ')}</h1>
        <button className={styles.addBtn} onClick={() => alert(t('Yeni kullanıcı formu (mock)'))}>
          + {t('YENİ KULLANICI')}
        </button>
      </div>

      <div className={styles.body}>
        {/* ── Özet kartı ─────────────────────────── */}
        <div className={styles.statsRow}>
          <StatCard label={t('TOPLAM')} value={stats.total} color="#2a2a2a" />
          <StatCard label={t('AKTİF')} value={stats.active} color="#16a34a" />
          <StatCard label={t('YÖNETİCİ')} value={stats.admins} color="#dc2626" />
        </div>

        {/* ── Filtre butonları ───────────────────── */}
        <div className={styles.filterRow}>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>{t('TÜMÜ ({n})', { n: users.length })}</FilterBtn>
          <FilterBtn active={filter === 'active'} onClick={() => setFilter('active')}>{t('AKTİF ({n})', { n: stats.active })}</FilterBtn>
          <FilterBtn active={filter === 'passive'} onClick={() => setFilter('passive')}>{t('PASİF ({n})', { n: users.length - stats.active })}</FilterBtn>
        </div>

        {/* ── Kullanıcı tablosu ──────────────────── */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('KULLANICILAR')}</div>
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
              {filtered.map((u) => (
                <tr key={u.id} className={!u.active ? styles.rowPassive : ''}>
                  <td className={styles.tdName}>{u.fullName}</td>
                  <td className={styles.tdMono}>{u.username}</td>
                  <td>
                    <span className={styles.roleTag} style={{ background: ROLE_COLORS[u.role] }}>
                      {t(u.role)}
                    </span>
                  </td>
                  <td className={styles.tdMono}>{u.lastLogin ?? '—'}</td>
                  <td>
                    <span className={`${styles.statusPill} ${u.active ? styles.pillActive : styles.pillPassive}`}>
                      {u.active ? t('AKTİF') : t('PASİF')}
                    </span>
                  </td>
                  <td className={styles.tdActions}>
                    <button className={styles.actionBtn} onClick={() => alert(t('{user} düzenle (mock)', { user: u.username }))}>
                      {t('DÜZENLE')}
                    </button>
                    <button className={styles.actionBtnRed} onClick={() => alert(t('{user} sıfırla (mock)', { user: u.username }))}>
                      {t('ŞİFRE SIFIRLA')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.note}>
          {t('Kullanıcı listesi henüz veritabanından gelmemektedir (mock). Şifre sıfırlama işlemi yönetici SMS onayı gerektirir. Aktif olmayan kullanıcılar sisteme giriş yapamaz.')}
        </p>
      </div>
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

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
