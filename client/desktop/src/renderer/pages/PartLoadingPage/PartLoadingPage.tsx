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

  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState<OrchestrationStep | null>(null)
  const [errorStep, setErrorStep] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // SLPIS sensoru saha kalibre edilmemis durumda — operator gerekli oldugunda
  // checkbox'i acar. Default kapali => skipAutoCorrect=true (3 adimli pipeline).
  const [useAutoCorrect, setUseAutoCorrect] = useState(false)
  // Parca boyu UI'da henuz dedicated ekrandan toplanmiyor — buraya direkt operator
  // girer. Default null => buton disable, girilince enable. Eski mapper hardcoded
  // 6000mm'ye dususun gercek parcayi gecmesi rotasyonun "hicbir zaman varmama"
  // hatasina yol aciyordu (saha gozlemi).
  const [partLengthMm, setPartLengthMm] = useState<number | ''>('')

  const sensorActive = !!partSensor && (partSensor.leftPartSensor || partSensor.rightPartSensor)
  const partLengthValid = typeof partLengthMm === 'number' && partLengthMm >= 100 && partLengthMm <= 12000

  // PartLoadingPage'in eski "manuel TOUCH onay" akışı korunur — operatör sensörü
  // beklemek istemiyorsa onay verir; sensör aktifse de zaten başlatabilir.
  const canStart = phase === 'loaded' || sensorActive
  const isBusy = phase === 'starting'

  async function handleStart() {
    if (!canStart || isBusy || !partLengthValid) return
    setPhase('starting')
    setActiveStep(null)
    setErrorStep(null)
    setErrorMessage(null)

    try {
      await executeBendingFlow({
        activeSensorSide: 'Left',
        operatorName: null,
        partLengthMm: partLengthMm as number,
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

      {phase !== 'starting' && phase !== 'started' && (
        <div className={styles.partLengthRow}>
          <label className={styles.partLengthLabel} htmlFor="partLengthInput">
            PARÇA BOYU (mm)
          </label>
          <input
            id="partLengthInput"
            type="number"
            min={100}
            max={12000}
            step={10}
            inputMode="numeric"
            className={`${styles.partLengthInput} ${
              !partLengthValid && partLengthMm !== '' ? styles.partLengthInputError : ''
            }`}
            placeholder="örn. 1500"
            value={partLengthMm}
            onChange={(e) => {
              const v = e.target.value
              setPartLengthMm(v === '' ? '' : Number(v))
            }}
          />
          {!partLengthValid && partLengthMm !== '' && (
            <span className={styles.partLengthHint}>100–12000 mm aralığında olmalı</span>
          )}
        </div>
      )}

      {phase !== 'starting' && phase !== 'started' && (
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
            disabled={isBusy || !params.profileId || !partLengthValid}
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
        backTo="/bending/ai/measurements/ring"
        onConfirm={() => {
          if (phase === 'idle') setPhase('loaded')
          else if (phase === 'error') setPhase('idle')
        }}
        confirmDisabled={isBusy || phase === 'started'}
      />
    </div>
  )
}
