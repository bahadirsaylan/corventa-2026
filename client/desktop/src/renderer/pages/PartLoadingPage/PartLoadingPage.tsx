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
import { useMaintenanceLock } from '@/hooks/useMaintenance'
import { useMaintenanceStore } from '@/stores/maintenanceStore'
import { translateProgress, useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import styles from './PartLoadingPage.module.css'
import ManualPlacementModal, { type PlacementSide } from './ManualPlacementModal'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import readyBanner from '@/assets/images/itsready.png'
import touchIcon from '@/assets/images/touch.png'

type Phase = 'idle' | 'starting' | 'started' | 'error'

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
  const lang = useLang()
  const params = useBendingJobStore((s) => s.params)
  const partSensor = usePartSensor()
  // EXCEL 34 — BAKIM KİLİDİ (backend lockActive): büküm başlatma butonları kilitli. Asıl engel backend'de
  // (StartJob 409) — bu sadece operatörün akışı boşuna başlatmaması (job kaydı / stage geçişi) için.
  const maintLock = useMaintenanceLock()
  const lockedPeriods = useMaintenanceStore((s) => s.state?.lockedPeriods)

  // Geri → vals topu dizilimi ekranı (oradan ölçü ekranına dönülür)
  const backTo = '/bending/ai/roll-arrangement'

  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState<OrchestrationStep | null>(null)
  const [, setErrorStep] = useState<string | null>(null)
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

  // 2026-11-04 (kullanıcı direktifi): varlık sensörü parçayı GÖRMÜYORSA ileri devam YOK. Eski "TOUCH ile
  // onayla → başlat" kısayolu kaldırıldı; sensör görmüyorsa tek yol ELLE KONUMLANDIRMA modalı (DB'deki
  // sıfırlama mesafesi + "yerleştirdim" onayı). Touch/ONAYLA da bu modalı açar.
  const isBusy = phase === 'starting'

  // ELLE KONUMLANDIRMA (sensörsüz) — sensör arızalıyken ayrı yol: modal → taraf + onay → start
  // manualPlacement=true ile (pipeline parça sensörünü beklemez, Zero'da sensör aramasını atlar).
  // Varsayılan sensörlü akış (handleStart parametresiz) birebir aynı kalır.
  const [manualOpen, setManualOpen] = useState(false)
  // 2026-11-11: elle konumlandırma onayı bükümü HEMEN başlatmaz — onaydan sonra sensörlü akıştaki gibi
  // "KIVRIMI BAŞLAT" ekranı çıkar, operatör ayrıca basar. Onaylanan taraf burada tutulur.
  const [manualSide, setManualSide] = useState<PlacementSide | null>(null)
  const canStart = sensorActive || manualSide != null
  // Sensör parçayı görüyorsa her zaman normal (sensörlü) akış; görmüyorsa elle onaylanan tarafla
  const startNow = () => void handleStart(sensorActive ? undefined : (manualSide ?? undefined))

  async function handleStart(manualSide?: PlacementSide) {
    if ((!manualSide && !canStart) || isBusy || maintLock.active) return
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

      {phase === 'idle' && sensorActive && (
        <div className={styles.loadedBar}>{t('PARÇA BAŞARIYLA YÜKLENDİ')}</div>
      )}

      {phase === 'idle' && !sensorActive && !manualSide && !maintLock.active && (
        <div className={styles.loadedBar} style={{ color: '#ffd166' }}>{t('SENSÖR PARÇAYI GÖRMÜYOR')}</div>
      )}

      {phase === 'idle' && !sensorActive && manualSide && (
        <div className={styles.loadedBar} style={{ background: '#f59e0b', color: '#1f2937' }}>
          {t('PARÇA ELLE KONUMLANDIRILDI — SENSÖR ARAMASI YAPILMAYACAK')}
          <button type="button" className={styles.manualCancelBtn} onClick={() => setManualSide(null)}>
            {t('VAZGEÇ')}
          </button>
        </div>
      )}

      {phase === 'error' && errorMessage && (
        <div className={styles.loadedBar} style={{ color: '#ff6b6b' }}>
          {/* 2026-11-12: teknik adım kodu ([MAPPING] vb.) operatöre gösterilmez */}
          {t('BÜKÜM BAŞLATILAMADI')}:{' '}
          {/* Backend mesajı (ör. güvenlik engeli) önce translateProgress kuralıyla, yoksa sözlükten */}
          {t(translateProgress(errorMessage, lang))}
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
        {isBusy ? (
          // Akış sürerken (hesap → job → stage → start) sayfa boş kalmasın: büyük durum paneli + adım metni
          <div className={styles.busyPanel} role="status" aria-live="polite">
            <div className={styles.busySpinner} />
            <div className={styles.busyTitle}>{t('BÜKÜM BAŞLATILIYOR…')}</div>
            <div className={styles.busyStep}>
              {activeStep ? t(STEP_LABELS[activeStep]) : null}
            </div>
            <div className={styles.busyHint}>{t('LÜTFEN BEKLEYİN, PARÇAYA DOKUNMAYIN')}</div>
          </div>
        ) : maintLock.active ? (
          // BAKIM KİLİDİ — başlat butonu yerine kırmızı kilit paneli + Bakım Süresi sayfasına geçiş
          <div className={styles.lockPanel} role="alert">
            <Icon name="lock" size={72} className={styles.lockIcon} />
            <div className={styles.lockTitle}>{t('BAKIM KİLİDİ — BÜKÜM BAŞLATILAMAZ')}</div>
            <ul className={styles.lockList}>
              {(lockedPeriods ?? []).map((lp) => (
                <li key={lp.periodKey}>
                  {t('{period} BAKIM VADESİNİN ÜZERİNDEN {n} GÜN GEÇTİ', {
                    period: t(lp.label).toLocaleUpperCase(),
                    n: lp.overdueDays,
                  })}
                </li>
              ))}
            </ul>
            <div className={styles.lockHint}>
              {t('Geciken bakımı yapıp Bakım Süresi sayfasından tamamlandı olarak işaretleyin. Manuel mod ve tahliye kullanılabilir.')}
            </div>
            <button
              type="button"
              className={styles.lockPageBtn}
              onClick={() => navigate('/settings/maintenance')}
            >
              <IconLabel icon="maintenance" size="lg">{t('BAKIM SAYFASI')}</IconLabel>
            </button>
          </div>
        ) : canStart ? (
          <button
            className={styles.startBtn}
            disabled={isBusy || !params.profileId}
            onClick={startNow}
          >
            <span className={styles.startLabel}>{t('KIVRIMI')}</span>
            <img src={touchIcon} alt="touch" className={styles.startIcon} />
            <span className={styles.startLabel}>{t('BAŞLAT')}</span>
          </button>
        ) : (
          // 2026-11-12: sensör parçayı görmüyorsa KIVRIMI BAŞLAT yerine SENSÖRÜ EL İLE ONAYLA — onaylanınca
          // (ELLE KONUMLANDIRMA penceresi) KIVRIMI BAŞLAT gelir.
          <button
            className={`${styles.startBtn} ${styles.manualConfirmBtn}`}
            disabled={!params.profileId}
            onClick={() => setManualOpen(true)}
          >
            <span className={styles.startLabel}>{t('SENSÖRÜ EL İLE')}</span>
            <img src={touchIcon} alt="touch" className={styles.startIcon} />
            <span className={styles.startLabel}>{t('ONAYLA')}</span>
          </button>
        )}
      </div>

      {manualOpen && (
        <ManualPlacementModal
          distanceMm={zeroResetMm}
          onCancel={() => setManualOpen(false)}
          onConfirm={(side) => {
            setManualSide(side)
            setManualOpen(false)
          }}
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
          if (phase === 'error') setPhase('idle')
          else if (phase !== 'idle') return
          // Sensör görüyorsa normal başlat; görmüyorsa ileri gidilmez → elle konumlandırma onayı
          else if (canStart) startNow()
          else if (!maintLock.active && params.profileId) setManualOpen(true)
        }}
        confirmDisabled={isBusy || phase === 'started'}
      />
    </div>
  )
}
