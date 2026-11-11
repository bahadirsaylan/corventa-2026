import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import BendingDirectionGrid from './BendingDirectionGrid'
import styles from './BendingDirectionPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { NO_DIRECTION_DEFAULT, PIPE_TYPE_OPTIONS, directionOptionsFor } from '@/constants/profileDirections'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'

export default function BendingDirectionPage() {
  const navigate = useNavigate()
  const t = useT()
  const modeLabel = useBendingModeLabel()
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
  const setParams = useBendingJobStore((s) => s.setParams)
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const profileSubType = useBendingJobStore((s) => s.params.profileSubType)
  const moldCode = useBendingJobStore((s) => s.params.moldCode)
  const options = directionOptionsFor(profileId) ?? []
  // Boş boru: yön yok — aynı ızgarada DİKİŞLİ / ETLİ boru tipi seçilir (profileSubType, eski pencereyle aynı alan)
  const isPipe = profileId === 'circle'

  // Profil değiştiyse önceki yön bu profilde olmayabilir (ör. IPN'de "TERS") → seçimi temizle
  const valid = isPipe ? !!profileSubType : options.some((o) => o.id === bendingDirection)
  useEffect(() => {
    if (!isPipe && bendingDirection && !valid) setParams({ bendingDirection: null })
  }, [isPipe, bendingDirection, valid, setParams])

  function handleConfirm() {
    if (isPipe) {
      // Boru tipinde yön kaydı eskisi gibi varsayılan (sadece kayıt)
      setParams({ bendingDirection: NO_DIRECTION_DEFAULT })
      navigate('/bending/ai/method')
    } else if (bendingDirection === 'other') {
      // DİĞER KIVRIM YÖNLERİ → kalıp kodu ekranı (oradan kıvrım metoduna devam eder)
      navigate('/bending/ai/mold-code')
    } else {
      // Kalıp ekranından geri dönülüp normal yön seçildiyse kalıp bırakılır
      if (moldCode) setParams({ moldCode: null, mold: null })
      navigate('/bending/ai/method')
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={modeLabel}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{isPipe ? t('BORU TİPİNİ SEÇİNİZ') : t('KIVRIM YÖNÜNÜ SEÇİNİZ')}</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        {isPipe ? (
          <BendingDirectionGrid
            options={PIPE_TYPE_OPTIONS}
            selected={profileSubType}
            onSelect={(id) => setParams({ profileSubType: id })}
          />
        ) : (
          <BendingDirectionGrid
            options={options}
            selected={valid ? bendingDirection : null}
            onSelect={(id) => setParams({ bendingDirection: id })}
          />
        )}
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai"
        confirmDisabled={!valid}
        onConfirm={handleConfirm}
      />

    </div>
  )
}
