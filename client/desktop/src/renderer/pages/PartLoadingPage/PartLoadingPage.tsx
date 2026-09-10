import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import { usePartSensor } from '@/hooks/usePartSensor'
import {
  BendingOrchestratorError,
  executeBendingFlow,
  type OrchestrationStep,
} from '@/services/bendingOrchestrator'
import { useBendingJobStore } from '@/store/bendingJobStore'
import styles from './PartLoadingPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import readyBanner from '@/assets/images/itsready.png'
import partIllustration from '@/assets/images/blend8-tasvir.png'
import alertIcon from '@/assets/images/alert.png'
import touchIcon from '@/assets/images/touch.png'

type Phase = 'idle' | 'loaded' | 'starting' | 'started' | 'error'

// Pipeline 6 adim — operatore "su an ne yapildigini" net anlatan kisa Turkce etiketler.
const STEP_LABELS: Record<OrchestrationStep, string> = {
  mapping: '1/6 PARAMETRELER HAZIRLANIYOR',
  calculate: '2/6 PISTON POZISYONU HESAPLANIYOR',
  preview: '3/6 PASO SAYISI HESAPLANIYOR',
  'recommend-stage': '4/6 STAGE ÖNERISI ALINIYOR',
  'create-job': '5/6 JOB KAYDEDILIYOR',
  'apply-stage': '5/6 STAGE GEÇISI YAPILIYOR',
  start: '6/6 PIPELINE BAŞLATILIYOR',
}

export default function PartLoadingPage() {
  const navigate = useNavigate()
  const params = useBendingJobStore((s) => s.params)
  const partSensor = usePartSensor()

  // 2026-09-03: geri butonu bende geldiğim büküm yöntemi sayfasına dönmeli
  // (eskiden sabit /ring idi → arc'tan geldiysem yanlış yere gidiyordu).
  const backTo =
    params.bendingMethod === 'arc'    ? '/bending/ai/measurements/arc'    :
    params.bendingMethod === 'spiral' ? '/bending/ai/measurements/spiral' :
    params.bendingMethod === 'sivama' ? '/bending/ai/measurements/sivama' :
                                        '/bending/ai/measurements/ring'

  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState<OrchestrationStep | null>(null)
  const [errorStep, setErrorStep] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // 2026-09-05: bendingMode'a gore useAutoCorrect otomatik.
  //   mode='ai'   → true  (tam otomatik + geri esneme)
  //   mode='semi' → false (yari oto, geri esneme USTAYA)
  //   mode=null   → false (backward compat: mevcut default)
  // Kullanici modu BendingModeSelectPage'de setti, PartLoading burada saygi gosterir.
  const isSemiAuto = params.bendingMode === 'semi'
  const [useAutoCorrect, setUseAutoCorrect] = useState(params.bendingMode === 'ai')

  const sensorActive = !!partSensor && (partSensor.leftPartSensor || partSensor.rightPartSensor)

  // PartLoadingPage'in eski "manuel TOUCH onay" akışı korunur — operatör sensörü
  // beklemek istemiyorsa onay verir; sensör aktifse de zaten başlatabilir.
  const canStart = phase === 'loaded' || sensorActive
  const isBusy = phase === 'starting'

  async function handleStart() {
    if (!canStart || isBusy) return
    setPhase('starting')
    setActiveStep(null)
    setErrorStep(null)
    setErrorMessage(null)

    try {
      await executeBendingFlow({
        activeSensorSide: 'Left',
        operatorName: null,
        skipAutoCorrect: !useAutoCorrect,
        onStep: (step) => setActiveStep(step),
      })
      setPhase('started')
      // İlerleme dashboard'da BendingBallsPanel üzerinde görünür
      navigate('/dashboard')
    } catch (err) {
      setPhase('error')
      if (err instanceof BendingOrchestratorError) {
        setErrorStep(err.step)
        setErrorMessage(err.message)
      } else {
        setErrorStep('unknown')
        setErrorMessage(err instanceof Error ? err.message : String(err))
      }
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Alarm Mode"
        label="ALARM MODE"
      />

      <div className={styles.banner}>
        <img src={readyBanner} alt="Ready" className={styles.bannerImage} />
      </div>

      {phase === 'loaded' && (
        <div className={styles.loadedBar}>PARÇA BAŞARIYLA YÜKLENDİ</div>
      )}

      {phase === 'starting' && (
        <div className={styles.loadedBar}>
          {activeStep ? STEP_LABELS[activeStep] : 'BÜKÜM BAŞLATILIYOR…'}
        </div>
      )}

      {phase === 'error' && errorMessage && (
        <div className={styles.loadedBar} style={{ color: '#ff6b6b' }}>
          {errorStep ? `[${errorStep.toUpperCase()}] ` : ''}
          {errorMessage}
        </div>
      )}

      {phase !== 'starting' && phase !== 'started' && isSemiAuto && (
        <div className={styles.loadedBar} style={{ background: '#27ae60', color: '#fff' }}>
          🧑‍🔧 YARI OTO MOD — Büküm bitince geri esneme ölçümü/düzeltmesi SİZE bırakılacak
        </div>
      )}
      {phase !== 'starting' && phase !== 'started' && !isSemiAuto && (
        <button
          type="button"
          className={`${styles.autoCorrectToggle} ${
            useAutoCorrect ? styles.autoCorrectToggleActive : ''
          }`}
          onClick={() => setUseAutoCorrect((v) => !v)}
          aria-pressed={useAutoCorrect}
        >
          {useAutoCorrect ? '☑' : '☐'} OTOMATİK GERİ ESNEME DÜZELTMESİ
          {!useAutoCorrect && (
            <span className={styles.autoCorrectHint}>
              &nbsp;— SLPIS KAPALI (3 ADIM PIPELINE)
            </span>
          )}
        </button>
      )}

      <div className={styles.content}>
        {canStart ? (
          <button
            className={styles.startBtn}
            disabled={isBusy || !params.profileId}
            onClick={handleStart}
          >
            <span className={styles.startLabel}>KIVRIMI</span>
            <img src={touchIcon} alt="touch" className={styles.startIcon} />
            <span className={styles.startLabel}>BAŞLAT</span>
          </button>
        ) : (
          <>
            <div className={styles.description}>
              <div className={styles.descriptionText}>
                <p>
                  MAKİNA KIVIRIM İÇİN HAZIRLANMIŞTIR. LÜTFEN KIVIRIM PARÇASINI SENSÖRÜN
                  GÖRECEĞİ ŞEKİLDE YÜKLEYİNİZ.
                </p>
                <div className={styles.warningRow}>
                  <img src={alertIcon} alt="Warning" className={styles.warningIcon} />
                  <p>
                    SENSÖR ARIZALIYSA YÜKLEMEYİ YAPTIKTAN SONRA TOUCH İLE
                    ONAYLAMALISINİZ.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.illustrationBox}>
              <img
                src={partIllustration}
                alt="Part loading illustration"
                className={styles.illustration}
              />
            </div>
          </>
        )}
      </div>

      <StatusBar
        backTo={backTo}
        onConfirm={() => {
          if (phase === 'idle') setPhase('loaded')
          else if (phase === 'error') setPhase('idle')
        }}
        confirmDisabled={isBusy || phase === 'started'}
      />
    </div>
  )
}
