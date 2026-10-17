import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import BendingDirectionGrid from './BendingDirectionGrid'
import styles from './BendingDirectionPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { directionOptionsFor } from '@/constants/profileDirections'
import { useT } from '@/i18n'

export default function BendingDirectionPage() {
  const navigate = useNavigate()
  const t = useT()
  const bendingDirection = useBendingJobStore((s) => s.params.bendingDirection)
  const setParams = useBendingJobStore((s) => s.setParams)
  const profileId = useBendingJobStore((s) => s.params.profileId)
  const options = directionOptionsFor(profileId) ?? []

  // Profil değiştiyse önceki yön bu profilde olmayabilir (ör. IPN'de "TERS") → seçimi temizle
  const valid = options.some((o) => o.id === bendingDirection)
  useEffect(() => {
    if (bendingDirection && !valid) setParams({ bendingDirection: null })
  }, [bendingDirection, valid, setParams])

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={t('YAPAY ZEKA MODU')}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{t('KIVIRIM YÖNÜNÜ SEÇİNİZ')}</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <BendingDirectionGrid
          options={options}
          selected={valid ? bendingDirection : null}
          onSelect={(id) => setParams({ bendingDirection: id })}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai"
        confirmDisabled={!valid}
        onConfirm={() => navigate('/bending/ai/method')}
      />

    </div>
  )
}
