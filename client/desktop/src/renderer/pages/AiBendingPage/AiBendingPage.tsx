import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import BendingProfileGrid from './BendingProfileGrid'
import ProfileInfoPanel from './ProfileInfoPanel'
import { NO_DIRECTION_DEFAULT, hasDirectionPage } from '@/constants/profileDirections'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './AiBendingPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function AiBendingPage() {
  const navigate = useNavigate()
  const t = useT()
  const modeLabel = useBendingModeLabel()
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const bendingMode = useBendingJobStore((s) => s.params.bendingMode)
  const setParams = useBendingJobStore((s) => s.setParams)
  const resetJob = useBendingJobStore((s) => s.resetJob)
  const profileSubType = useBendingJobStore((s) => s.params.profileSubType)
  // Kalıp kodu (ÖZEL KIVRIM PROFİLLERİ, BULUT_API_V2.md §2.4) — profil + A/B/S kalıptan, yön sayfası atlanır
  const moldCode = useBendingJobStore((s) => s.params.moldCode)
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
  // Boş boru → dikişli / etli seçimi yön sayfasında yapılır (dolu boru sormaz; kalıpta sorulmaz)

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={modeLabel}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{t('KIVRIM PROFİLİNİ SEÇİNİZ')}</h2>
      {moldCode ? (
        <p className={styles.subtitle}>{t('KALIP: {code}', { code: moldCode })}</p>
      ) : profileId === 'circle' && profileSubType && (
        <p className={styles.subtitle}>{profileSubType === 'ETLI' ? t('ETLİ BORU') : t('DİKİŞLİ BORU')}</p>
      )}

      {/* ── Content row ─────────────────────────── */}
      <div className={styles.content}>
        <BendingProfileGrid
          selected={moldCode ? null : profileId}
          specialSelected={!!moldCode}
          onSpecial={() => {
            // ÖZEL KIVRIM PROFİLLERİ'nden girişte "DİĞER yön → kalıp" işareti kalmasın (geri → profil seçimi)
            if (bendingDirection === 'other') setParams({ bendingDirection: null })
            navigate('/bending/ai/mold-code')
          }}
          onSelect={(id) => {
            // Normal profil seçimi kalıp kodunu bırakır (A/B/S kilidi kalkar); boru tipi sadece boruda kalır
            setParams({
              profileId: id,
              profileSubType: id === 'circle' && profileId === 'circle' ? profileSubType : null,
              moldCode: null,
              mold: null,
            })
          }}
        />
        <ProfileInfoPanel />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        onBack={() => {
          // Seçimleri sıfırla; yarı otodaysa Manuel/Yarı Oto seçimine, AI'daysa ana ekrana dön
          const backTo = bendingMode === 'semi' ? '/bending/manual-mode' : '/dashboard'
          resetJob()
          navigate(backTo)
        }}
        confirmDisabled={!profileId}
        onConfirm={() => {
          // Kalıp kodu: yön kalıp ekranında NO_DIRECTION_DEFAULT yapıldı → doğrudan metod
          if (moldCode) {
            setParams({ bendingDirection: NO_DIRECTION_DEFAULT })
            navigate('/bending/ai/method')
            return
          }
          // Yön seçimi olmayan profil (dolu boru) → yön sayfası atlanır; boş boru yön sayfasında boru tipi seçer
          if (profileId && !hasDirectionPage(profileId)) {
            setParams({ bendingDirection: NO_DIRECTION_DEFAULT })
            navigate('/bending/ai/method')
          } else navigate('/bending/ai/direction')
        }}
      />
    </div>
  )
}
