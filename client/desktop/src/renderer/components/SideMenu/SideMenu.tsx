// Sağ kenar hızlı menü (SEKIL-19) — sağdan tüm ekran yüksekliğinde şerit.
// Açma: sağ kenardaki ince şeritten parmakla sola çekme (dokunmatik) veya fare sağ kenara
// yaklaşınca beliren kare tuş. Kapatma: sağa çekme, X, karartılmış alana dokunma.
// Kenar şeridi 28 px — tuş takımının sağ tuşlarından (REEL) daha sağda, onları engellemez.
// Seçenekler kullanıcıya özel: katalog constants/sideMenuCatalog.ts, düzen DataApi'de (Ayarlar > Hızlı Menü).
// Otomatik büküm sürerken lockWhileBending seçenekleri (yeni büküm, oturumu kapat) pasif.
// Oturum: gerçek kimlik doğrulama henüz yok — "oturumu kapat" büküm seçimlerini ve oturum kullanıcısını
// temizleyip giriş ekranına döner.

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import { catalogItem, type SideMenuCatalogItem } from '@/constants/sideMenuCatalog'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useSessionStore, useUserKey } from '@/stores/sessionStore'
import { useSideMenuStore } from '@/stores/sideMenuStore'
import { useT } from '@/i18n'
import { SideMenuIcon, GearIcon } from './SideMenuIcons'
import styles from './SideMenu.module.css'

export default function SideMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const t = useT()
  const { pathname } = useLocation()
  const bendingActive = useBendingActive()
  const resetJob = useBendingJobStore((s) => s.resetJob)
  const setJobParams = useBendingJobStore((s) => s.setParams)
  const clearSession = useSessionStore((s) => s.clear)
  const userKey = useUserKey()
  const itemIds = useSideMenuStore((s) => s.items)
  const loadMenu = useSideMenuStore((s) => s.load)

  // Kullanıcı değişince o kullanıcının menü düzeni yüklenir
  useEffect(() => {
    void loadMenu(userKey)
  }, [userKey, loadMenu])

  const [peek, setPeek] = useState(false)   // fare kenara yaklaştı → kare tuş görünür
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)

  // Sayfa değişince menü kapanır
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (open) setPeek(false)
  }, [open])

  // Kenardan sola çekme → aç
  function edgeDown(e: PointerEvent<HTMLDivElement>) {
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  function edgeMove(e: PointerEvent<HTMLDivElement>) {
    const s = swipe.current
    if (!s || s.id !== e.pointerId) return
    if (s.x - e.clientX > 40 && Math.abs(e.clientY - s.y) < 120) {
      swipe.current = null
      setOpen(true)
    }
  }
  // Açık şeritte sağa çekme → kapat
  const railSwipe = useRef<{ x: number; id: number } | null>(null)
  function railDown(e: PointerEvent<HTMLElement>) {
    railSwipe.current = { x: e.clientX, id: e.pointerId }
  }
  function railMove(e: PointerEvent<HTMLElement>) {
    const s = railSwipe.current
    if (!s || s.id !== e.pointerId) return
    if (e.clientX - s.x > 60) {
      railSwipe.current = null
      setOpen(false)
    }
  }
  const endSwipe = () => {
    swipe.current = null
    railSwipe.current = null
  }

  function select(item: SideMenuCatalogItem) {
    setOpen(false)
    const a = item.action
    if (a.type === 'route') navigate(a.to)
    else if (a.type === 'new-bending') {
      resetJob()
      setJobParams({ bendingMode: 'ai' })
      navigate('/bending/ai')
    } else if (a.type === 'logout') {
      resetJob()
      clearSession()
      navigate('/login', { replace: true })
    }
  }

  const items = itemIds.map(catalogItem).filter((i): i is SideMenuCatalogItem => !!i)

  return (
    <>
      {/* Sağ kenar şeridi: çekme alanı + (fare için) beliren kare tuş + ipucu çizgisi */}
      <div
        className={styles.edge}
        data-hidden={open || undefined}
        onPointerDown={edgeDown}
        onPointerMove={edgeMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setPeek(true)}
        onPointerLeave={() => setPeek(false)}
      >
        <span className={styles.grip} aria-hidden />
        <button
          type="button"
          className={styles.handle}
          data-visible={(peek && !open) || undefined}
          onClick={() => setOpen(true)}
          aria-label={t('Menüyü aç')}
        >
          <GearIcon />
        </button>
      </div>

      <div className={styles.shade} data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden />

      <nav
        className={styles.rail}
        data-open={open || undefined}
        aria-label={t('Hızlı menü')}
        aria-hidden={!open}
        onPointerDown={railDown}
        onPointerMove={railMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
      >
        <div className={styles.logo}>
          <CorventaLogo size="compact" />
        </div>

        <div className={styles.items}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={styles.item}
              onClick={() => select(it)}
              disabled={bendingActive && it.lockWhileBending}
              tabIndex={open ? 0 : -1}
            >
              <span className={styles.icon}><SideMenuIcon name={it.icon} /></span>
              <span className={styles.label}>{t(it.label)}</span>
            </button>
          ))}
          {bendingActive && <span className={styles.lockNote}>{t('BÜKÜM SÜRÜYOR')}</span>}
        </div>

        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label={t('Menüyü kapat')}
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
