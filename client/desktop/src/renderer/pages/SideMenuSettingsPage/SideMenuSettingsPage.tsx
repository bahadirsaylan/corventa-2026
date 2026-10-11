// Ayarlar > Hızlı Menü — sağ hızlı menüye katalogdaki seçenekleri ekle/çıkar ve sırala.
// Kullanıcıya özel: oturumdaki kullanıcı için DataApi'de saklanır (UserPreferences "side-menu").
// Sabit seçenekler (ana ekran, oturumu kapat) kaldırılamaz, sadece sırası değişir.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SIDE_MENU_CATALOG,
  catalogItem,
  defaultSideMenuOrder,
  type SideMenuCatalogItem,
  type SideMenuItemId,
} from '@/constants/sideMenuCatalog'
import { SideMenuIcon } from '@/components/SideMenu/SideMenuIcons'
import { useSessionStore, useUserKey } from '@/stores/sessionStore'
import { useSideMenuStore } from '@/stores/sideMenuStore'
import styles from './SideMenuSettingsPage.module.css'

type Status = { kind: 'ok' | 'error'; text: string } | null

export default function SideMenuSettingsPage() {
  const navigate = useNavigate()
  const username = useSessionStore((s) => s.username)
  const userKey = useUserKey()
  const saved = useSideMenuStore((s) => s.items)
  const save = useSideMenuStore((s) => s.save)

  const [draft, setDraft] = useState<SideMenuItemId[]>(saved)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  // Kayıtlı düzen (DataApi'den) gelince taslağı ona eşitle
  useEffect(() => setDraft(saved), [saved])

  const enabled = draft.map(catalogItem).filter((i): i is SideMenuCatalogItem => !!i)
  const available = SIDE_MENU_CATALOG.filter((i) => !draft.includes(i.id))
  const dirty = useMemo(() => draft.join('|') !== saved.join('|'), [draft, saved])

  function move(index: number, delta: -1 | 1) {
    const j = index + delta
    if (j < 0 || j >= draft.length) return
    const next = [...draft]
    ;[next[index], next[j]] = [next[j], next[index]]
    setDraft(next)
    setStatus(null)
  }
  function remove(id: SideMenuItemId) {
    setDraft(draft.filter((d) => d !== id))
    setStatus(null)
  }
  function add(id: SideMenuItemId) {
    setDraft([...draft, id])
    setStatus(null)
  }

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    try {
      await save(userKey, draft)
      setStatus({ kind: 'ok', text: 'KAYDEDİLDİ — MENÜ GÜNCELLENDİ.' })
    } catch (e) {
      setStatus({ kind: 'error', text: `KAYDEDİLEMEDİ: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>HIZLI MENÜ</h1>
        <span className={styles.user}>KULLANICI: {username ? username.toUpperCase() : 'VARSAYILAN'}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>MENÜDEKİLER</div>
          {enabled.map((it, i) => (
            <div key={it.id} className={styles.row}>
              <span className={styles.icon}><SideMenuIcon name={it.icon} /></span>
              <span className={styles.label}>{it.label}</span>
              {it.fixed && <span className={styles.fixed}>SABİT</span>}
              <div className={styles.actions}>
                <button className={styles.smallBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı">▲</button>
                <button className={styles.smallBtn} onClick={() => move(i, 1)} disabled={i === enabled.length - 1} aria-label="Aşağı">▼</button>
                <button className={styles.removeBtn} onClick={() => remove(it.id)} disabled={it.fixed}>KALDIR</button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>EKLENEBİLECEKLER</div>
          {available.length === 0 && <div className={styles.empty}>TÜM SEÇENEKLER MENÜDE.</div>}
          {available.map((it) => (
            <div key={it.id} className={styles.row}>
              <span className={styles.icon}><SideMenuIcon name={it.icon} /></span>
              <span className={styles.label}>{it.label}</span>
              <div className={styles.actions}>
                <button className={styles.addBtn} onClick={() => add(it.id)}>EKLE</button>
              </div>
            </div>
          ))}
        </div>

        {status && <div className={status.kind === 'ok' ? styles.statusOk : styles.statusError}>{status.text}</div>}

        <div className={styles.footer}>
          <button
            className={styles.secondaryBtn}
            onClick={() => {
              setDraft(defaultSideMenuOrder())
              setStatus(null)
            }}
          >
            VARSAYILANA DÖN
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'KAYDEDİLİYOR…' : 'KAYDET'}
          </button>
        </div>
      </div>
    </div>
  )
}
