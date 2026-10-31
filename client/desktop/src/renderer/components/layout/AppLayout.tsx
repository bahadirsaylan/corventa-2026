import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BendingJobStatus, type BendingJob } from '@shared/types'
import BendingBallsPanel from '@/components/BendingBallsPanel/BendingBallsPanel'
import BottomStatsPanel from '@/components/BottomStatsPanel/BottomStatsPanel'
import KioskExitCorner from '@/components/KioskExitCorner/KioskExitCorner'
import SideMenu from '@/components/SideMenu/SideMenu'
import WelcomeOverlay from '@/components/WelcomeOverlay/WelcomeOverlay'
import { startBendingActivityPoller, useBendingActive, useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'
import styles from './AppLayout.module.css'

// Bitiş kontrolü (getJob) tekrar denemesi — DataApi anlık ulaşılamaz / henüz Running görünüyorsa
const FINISH_CHECK_RETRIES = 3
const FINISH_CHECK_RETRY_MS = 1500

export default function AppLayout() {
  // "Otomatik büküm aktif mi?" izleyicisi — uygulama boyunca tek örnek.
  useEffect(() => startBendingActivityPoller(), [])
  const bendingActive = useBendingActive()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const t = useT()

  // Tahliye ekranı (SEKIL-18): otomatik / yarı oto job Completed bitince açılır.
  // Bitiş progress mesajından DEĞİL, DataApi'deki job durumundan okunur (backend'in son mesajı
  // metoda göre değişiyor: "Geri esneme düzeltmesi başlıyor...", "BUKUM TAMAMLANDI (...)", "Serpantin
  // tamamlandı"…). İzlenen job Running'den çıkınca (runningJobId değişti) veya monitör kapanınca
  // (aktif → pasif) GET /api/bending-jobs/{id}: Status = Completed ise açılır. errorMessage doluysa
  // (ör. geri esneme düzeltmesi maks. iterasyonda yakınsamadı — büküm bitti, parça hâlâ sıkılı) ekran
  // yine açılır ve mesaj uyarı olarak gösterilir (navigate state.jobWarning).
  // Failed / Cancelled'da açılmaz. getJob hata verirse veya job hâlâ Running görünürse (DataApi gecikmesi)
  // kısa aralıkla birkaç kez tekrar bakılır; sonra bir sonraki değişimde. Aynı job için bir kez açılır.
  // Manuel programlar DataApi job'u yaratmaz → manuel bükümde bu ekran açılmaz (eski davranış).
  const runningJobId = useBendingActivityStore((s) => s.runningJobId)
  const wasActive = useRef(false)
  const watchedJobId = useRef<number | null>(null)
  const handledJobId = useRef<number | null>(null)
  useEffect(() => {
    const prevId = watchedJobId.current
    const finished =
      prevId != null && (runningJobId !== prevId || (wasActive.current && !bendingActive))
    watchedJobId.current = runningJobId
    wasActive.current = bendingActive
    if (!finished || prevId == null || handledJobId.current === prevId) return

    const jobId = prevId
    const check = (attempt: number) => {
      const retry = () => {
        if (attempt < FINISH_CHECK_RETRIES) setTimeout(() => check(attempt + 1), FINISH_CHECK_RETRY_MS)
      }
      window.corventa.bending
        .getJob(jobId)
        .then((job: BendingJob) => {
          if (handledJobId.current === jobId) return
          if (!job) return retry()
          const status = job.status as unknown
          if (status === BendingJobStatus.Running || status === 'Running') return retry() // henüz bitmedi / gecikme
          handledJobId.current = jobId // son durum (Completed / Failed / Cancelled) — bir daha bakma
          const completed = status === BendingJobStatus.Completed || status === 'Completed'
          if (completed) navigate('/bending/unload', job.errorMessage ? { state: { jobWarning: job.errorMessage } } : undefined)
        })
        .catch(() => {
          // DataApi'ye anlık ulaşılamadı — birkaç kez tekrar; yine olmazsa ekran açılmaz (manuel tuşlarla alınır)
          retry()
        })
    }
    check(0)
  }, [runningJobId, bendingActive, navigate])

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
