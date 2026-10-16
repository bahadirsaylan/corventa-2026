import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMachineStateStore } from '@/stores/machineStateStore'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
import KioskExitCorner from '@/components/KioskExitCorner/KioskExitCorner'
import SideMenu from '@/components/SideMenu/SideMenu'
import WelcomeOverlay from '@/components/WelcomeOverlay/WelcomeOverlay'
import { startBendingActivityPoller, useBendingActive } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  // "Otomatik büküm aktif mi?" izleyicisi — uygulama boyunca tek örnek.
  useEffect(() => startBendingActivityPoller(), [])
  const bendingActive = useBendingActive()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const t = useT()

  // Tahliye ekranı (SEKIL-18): büküm HATASIZ bitince (son mesaj "...tamamlandı") açılır.
  // Şimdilik sadece DEMO modunda — gerçek backend'de tahliye komutu henüz yok.
  const [isDemo, setIsDemo] = useState(false)
  useEffect(() => {
    window.corventa.system.isDemo().then(setIsDemo).catch(() => setIsDemo(false))
  }, [])
  const wasActive = useRef(false)
  useEffect(() => {
    if (wasActive.current && !bendingActive && isDemo) {
      const msg = useMachineStateStore.getState().bendingProgress?.message ?? ''
      if (/büküm tamamlandı/i.test(msg)) navigate('/bending/unload')
    }
    wasActive.current = bendingActive
  }, [bendingActive, isDemo, navigate])

  // Otomatik / yarı oto büküm kurulum ekranlarında (profil, yön, metot, ölçü girişi) odak üst alanda:
  // orta + alt alan karartılır ve etkileşime kapanır (inert). Parça yükleme adımı hariç —
  // operatör orada makineye müdahale edebilmeli. Büküm başlayınca odak modu kapanır.
  const focusTop =
    !bendingActive &&
    pathname.startsWith('/bending/ai') &&
    pathname !== '/bending/ai/part-loading'

  return (
    <div className={styles.root}>
      {/* Üst alan — normalde sayfalar; otomatik büküm sırasında top pozisyon/ilerleme monitörü.
          Büküm modalları (segment, ölçüm hatası) App.tsx'te global — bu değişimden etkilenmez. */}
      <div className={styles.top}>
        {bendingActive ? <BendingBallsPanel variant="monitor" /> : <Outlet />}
      </div>

      {/* Orta alan — başlık + manuel tuş takımı (her zaman sabit) */}
      <main className={styles.middle} inert={focusTop}>
        <BendingBallsPanel variant="control" />
      </main>

      {/* Alt alan — uyarı şeridi + sensör kartları */}
      <div className={styles.bottom} inert={focusTop}>
        <BottomStatsPanel />
      </div>

      {/* Odak modu karartması — orta + alt alanı kaplar; modal/klavyeler (z ≥ 180) üstte kalır */}
      <div className={styles.focusShade} data-on={focusTop || undefined} aria-hidden>
        <span className={styles.focusHint}>{t('OTOMATİK BÜKÜM AYARLARI — ÜST EKRANDAN DEVAM EDİN')}</span>
      </div>

      {/* Kiosk moddan cikis: sag ust kose gizli hot-spot (5-tap veya 5sn basili tut).
          Klavye Ctrl+Alt+Shift+X global shortcut main process'te — bu component'ten bagimsiz. */}
      <KioskExitCorner />

      {/* Sağ kenar hızlı menü (SEKIL-19) — tüm ekranı boydan boya kaplar */}
      <SideMenu />

      {/* Girişten sonra bir kez karşılama mesajı (Ayarlar > Karşılama Mesajı) */}
      <WelcomeOverlay />
    </div>
  )
}
