import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
import KioskExitCorner from '@/components/KioskExitCorner/KioskExitCorner'
import { startBendingActivityPoller, useBendingActive } from '@/stores/bendingActivityStore'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  // "Otomatik büküm aktif mi?" izleyicisi — uygulama boyunca tek örnek.
  useEffect(() => startBendingActivityPoller(), [])
  const bendingActive = useBendingActive()
  const { pathname } = useLocation()

  // Otomatik büküm kurulum ekranlarında (mod, profil, yön, metot, ölçü girişi) odak üst alanda:
  // orta + alt alan karartılır ve etkileşime kapanır (inert). Parça yükleme adımı hariç —
  // operatör orada makineye müdahale edebilmeli. Büküm başlayınca odak modu kapanır.
  const focusTop =
    !bendingActive &&
    (pathname === '/bending/mode' || pathname.startsWith('/bending/ai')) &&
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
        <span className={styles.focusHint}>OTOMATİK BÜKÜM AYARLARI — ÜST EKRANDAN DEVAM EDİN</span>
      </div>

      {/* Kiosk moddan cikis: sag ust kose gizli hot-spot (5-tap veya 5sn basili tut).
          Klavye Ctrl+Alt+Shift+X global shortcut main process'te — bu component'ten bagimsiz. */}
      <KioskExitCorner />
    </div>
  )
}
