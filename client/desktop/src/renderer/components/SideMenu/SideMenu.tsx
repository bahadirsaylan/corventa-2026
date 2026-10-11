// Sağ kenar hızlı menü (SEKIL-19) — üst alanın sağında tutamak, dokununca sağdan şerit açılır.
// Seçenekler: yeni büküm, ana ekran, servis, oturumu kapat. Arka plan karartılır; dışarı dokununca kapanır.
// Otomatik büküm sürerken "yeni büküm" ve "oturumu kapat" pasif.
// Oturum: gerçek kimlik doğrulama henüz yok — "oturumu kapat" büküm seçimlerini temizleyip giriş ekranına döner.

import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import styles from './SideMenu.module.css'

interface Item {
  key: string
  label: string
  icon: ReactNode
  onSelect: () => void
  disabled?: boolean
}

export default function SideMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const bendingActive = useBendingActive()
  const resetJob = useBendingJobStore((s) => s.resetJob)

  // Sayfa değişince menü kapanır
  useEffect(() => setOpen(false), [pathname])

  const go = (to: string) => () => {
    setOpen(false)
    navigate(to)
  }

  const items: Item[] = [
    {
      key: 'new',
      label: 'YENİ BÜKÜM',
      icon: <PlusIcon />,
      disabled: bendingActive,
      onSelect: () => {
        resetJob()
        go('/bending/mode')()
      },
    },
    { key: 'home', label: 'ANA EKRAN', icon: <HomeIcon />, onSelect: go('/dashboard') },
    { key: 'service', label: 'SERVİS', icon: <ServiceIcon />, onSelect: go('/service') },
    {
      key: 'logout',
      label: 'OTURUMU KAPAT',
      icon: <LogoutIcon />,
      disabled: bendingActive,
      onSelect: () => {
        setOpen(false)
        resetJob()
        navigate('/login', { replace: true })
      },
    },
  ]

  return (
    <>
      <button
        type="button"
        className={styles.handle}
        data-hidden={open || undefined}
        onClick={() => setOpen(true)}
        aria-label="Menüyü aç"
      >
        <span className={styles.handleDots} aria-hidden>
          <i /><i /><i />
        </span>
      </button>

      <div className={styles.shade} data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden />

      <nav className={styles.rail} data-open={open || undefined} aria-label="Hızlı menü" aria-hidden={!open}>
        <div className={styles.logo}>
          <CorventaLogo size="compact" />
        </div>

        <div className={styles.items}>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={styles.item}
              onClick={it.onSelect}
              disabled={it.disabled}
              tabIndex={open ? 0 : -1}
            >
              <span className={styles.icon}>{it.icon}</span>
              <span className={styles.label}>{it.label}</span>
            </button>
          ))}
          {bendingActive && <span className={styles.lockNote}>BÜKÜM SÜRÜYOR</span>}
        </div>

        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Menüyü kapat"
          tabIndex={open ? 0 : -1}
        >
          <svg viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="28" />
            <path d="M21 21 L43 43 M43 21 L21 43" />
          </svg>
        </button>
      </nav>
    </>
  )
}

/* ── İkonlar (SEKIL-19 çizgi stili) ─────────────── */

function PlusIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M26 8h12v18h18v12H38v18H26V38H8V26h18z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M6 31 L32 8 L58 31" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M13 26v30h14V40h10v16h14V26" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M44 15V8h7v13" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  )
}

function ServiceIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M10 30C10 18.95 19.4 10 31 10s21 8.95 21 20" stroke="currentColor" strokeWidth="3.5" />
      <rect x="6" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3.5" />
      <rect x="46" y="30" width="10" height="18" rx="4" stroke="currentColor" strokeWidth="3.5" />
      <path d="M51 48c0 6-4 9-10 9H36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="57" r="4" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M36 10H12v44h24" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M26 32h30M46 21l11 11-11 11" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
