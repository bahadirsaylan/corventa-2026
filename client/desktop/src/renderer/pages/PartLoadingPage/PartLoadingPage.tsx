import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import { usePartSensor } from '@/hooks/usePartSensor'
import {
  BendingOrchestratorError,
  executeBendingFlow,
  type OrchestrationStep,
} from '@/services/bendingOrchestrator'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import styles from './PartLoadingPage.module.css'
import ManualPlacementModal, { type PlacementSide } from './ManualPlacementModal'
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

// Vals topu dizilimi onaylanmadan parça yükleme açılmaz (SEKIL-13-H ekranına yönlendir)
export default function PartLoadingPage() {
  const confirmed = useBendingJobStore((s) => s.params.rollArrangementConfirmed)
  if (!confirmed) return <Navigate to="/bending/ai/roll-arrangement" replace />
  return <PartLoadingContent />
}

function PartLoadingContent() {
  const navigate = useNavigate()
  const t = useT()
  const params = useBendingJobStore((s) => s.params)
  const partSensor = usePartSensor()

  // Geri → vals topu dizilimi ekranı (oradan ölçü ekranına dönülür)
  const backTo = '/bending/ai/roll-arrangement'

  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState<OrchestrationStep | null>(null)
  const [errorStep, setErrorStep] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // bendingMode'a gore useAutoCorrect SABIT (operator toggle'i kaldirildi):
  //   mode='ai'   → true  (tam otomatik + geri esneme duzeltmesi)
  //   mode='semi' → false (yari oto, geri esneme USTAYA)
  //   mode=null   → true  (AI gibi davran — duzeltme acik)
  // Mod: ana ekran OTOMATİK BÜKÜM → 'ai', Manuel > Yarı Oto → 'semi' (ManualModeSelectPage).
  const isSemiAuto = params.bendingMode === 'semi'
  const useAutoCorrect = !isSemiAuto

  // Sensör sıfırlama mesafesi (mm) — MachineSettings.ZeroResetDistanceMm (sensör ↔ merkez).
  // Zero handler'ları parçayı sensörden bu mesafeye göre konumlar; sensör görmüyorsa operatör
  // parça ucunu merkezden bu kadar uzağa (sensör hizasına) koyar. Ayar okunamazsa not gösterilmez.
  const [zeroResetMm, setZeroResetMm] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    window.corventa.settings
      .getMachine()
      .then((m) => {
        const v = Number(m?.zeroResetDistanceMm)
        if (!cancelled && Number.isFinite(v) && v > 0) setZeroResetMm(v)
      })
      .catch(() => {
        /* ayar okunamadı — bilgi notu gösterilmez */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sensorActive = !!partSensor && (partSensor.leftPartSensor || partSensor.rightPartSensor)

  // PartLoadingPage'in eski "manuel TOUCH onay" akışı korunur — operatör sensörü
  // beklemek istemiyorsa onay verir; sensör aktifse de zaten başlatabilir.
  const canStart = phase === 'loaded' || sensorActive
  const isBusy = phase === 'starting'

  // ELLE KONUMLANDIRMA (sensörsüz) — sensör arızalıyken ayrı yol: modal → taraf + onay → start
  // manualPlacement=true ile (pipeline parça sensörünü beklemez, Zero'da sensör aramasını atlar).
  // Varsayılan sensörlü akış (handleStart parametresiz) birebir aynı kalır.
  const [manualOpen, setManualOpen] = useState(false)

  async function handleStart(manualSide?: PlacementSide) {
    if ((!manualSide && !canStart) || isBusy) return
    setManualOpen(false)
    setPhase('starting')
    setActiveStep(null)
    setErrorStep(null)
    setErrorMessage(null)

    try {
      await executeBendingFlow({
        // Elle konumlandırmada job operatörün seçtiği tarafla kaydedilir (backend taraf eşleşmesi şart)
        activeSensorSide: manualSide ?? 'Left',
        operatorName: null,
        skipAutoCorrect: !useAutoCorrect,
        manualPlacement: !!manualSide,
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
        label={t('ALARM MODU')}
      />

      <div className={styles.banner}>
        <img src={readyBanner} alt="Ready" className={styles.bannerImage} />
      </div>

      {phase === 'loaded' && (
        <div className={styles.loadedBar}>{t('PARÇA BAŞARIYLA YÜKLENDİ')}</div>
      )}

      {phase === 'starting' && (
        <div className={styles.loadedBar}>
          {activeStep ? t(STEP_LABELS[activeStep]) : t('BÜKÜM BAŞLATILIYOR…')}
        </div>
      )}

      {phase === 'error' && errorMessage && (
        <div className={styles.loadedBar} style={{ color: '#ff6b6b' }}>
          {errorStep ? `[${errorStep.toUpperCase()}] ` : ''}
          {t(errorMessage)}
        </div>
      )}

      {phase !== 'starting' && phase !== 'started' && isSemiAuto && (
        <div className={styles.loadedBar} style={{ background: '#27ae60', color: '#fff' }}>
          <IconLabel icon="technician" size="lg">
            {t('YARI OTO MOD — Büküm bitince geri esneme ölçümü/düzeltmesi SİZE bırakılacak')}
          </IconLabel>
        </div>
      )}
      <div className={styles.content}>
        {canStart ? (
          <button
            className={styles.startBtn}
            disabled={isBusy || !params.profileId}
            onClick={() => void handleStart()}
          >
            <span className={styles.startLabel}>{t('KIVRIMI')}</span>
            <img src={touchIcon} alt="touch" className={styles.startIcon} />
            <span className={styles.startLabel}>{t('BAŞLAT')}</span>
          </button>
        ) : (
          <>
            <div className={styles.description}>
              <div className={styles.descriptionText}>
                <p>
                  {t('MAKİNA KIVIRIM İÇİN HAZIRLANMIŞTIR. LÜTFEN KIVIRIM PARÇASINI SENSÖRÜN GÖRECEĞİ ŞEKİLDE YÜKLEYİNİZ.')}
                </p>
                <div className={styles.warningRow}>
                  <img src={alertIcon} alt="Warning" className={styles.warningIcon} />
                  <p>
                    {t('SENSÖR ARIZALIYSA YÜKLEMEYİ YAPTIKTAN SONRA TOUCH İLE ONAYLAMALISINİZ.')}
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

      {/* Sensör arızalıysa elle konumlandırma — alt paneldeki mesafe notunun hemen üstünde */}
      {phase !== 'starting' && phase !== 'started' && (
        <div className={styles.manualRow}>
          <button
            type="button"
            className={styles.manualBtn}
            disabled={isBusy || !params.profileId}
            onClick={() => setManualOpen(true)}
          >
            <Icon name="warning" size={26} className={styles.manualIcon} />
            {t('SENSÖR ÇALIŞMIYOR — ELLE KONUMLANDIR')}
          </button>
        </div>
      )}

      {manualOpen && (
        <ManualPlacementModal
          distanceMm={zeroResetMm}
          onCancel={() => setManualOpen(false)}
          onConfirm={(side) => void handleStart(side)}
        />
      )}

      <StatusBar
        backTo={backTo}
        hint={
          zeroResetMm != null
            ? t('SENSÖR ÇALIŞMIYORSA PARÇAYI MERKEZDEN {mm} MM UZAĞA YERLEŞTİRİN', {
                mm: Number.isInteger(zeroResetMm) ? zeroResetMm : zeroResetMm.toFixed(1),
              })
            : undefined
        }
        onConfirm={() => {
          if (phase === 'idle') setPhase('loaded')
          else if (phase === 'error') setPhase('idle')
        }}
        confirmDisabled={isBusy || phase === 'started'}
      />
    </div>
  )
}
