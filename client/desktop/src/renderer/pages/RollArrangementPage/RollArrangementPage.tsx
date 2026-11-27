// Vals topu (kalıp) dizilimi — SEKIL-13-H. Ölçü ekranından sonra, parça yüklemeden önce.
// AI ve yarı otoda aynı. Operatör onaylamadan parça yükleme ekranına geçilemez
// (PartLoadingPage, rollArrangementConfirmed=false ise buraya yönlendirir).
// Görseller: vals-topu-1/2/3.png (profil yerleşimi, mil üzerindeki diskler, montaj).

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import styles from './RollArrangementPage.module.css'
import { useEarlyStage } from '@/hooks/useEarlyStage'
import StageMoveCountdown from '@/components/StageMoveCountdown/StageMoveCountdown'
import ApiNoticeModal from '@/components/ApiNoticeModal/ApiNoticeModal'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import rollProfile from '@/assets/images/vals-topu-1.png'
import rollShaft from '@/assets/images/vals-topu-2.png'
import rollAssembly from '@/assets/images/vals-topu-3.png'

export default function RollArrangementPage() {
  const navigate = useNavigate()
  const t = useT()
  const modeLabel = useBendingModeLabel()
  const method = useBendingJobStore((s) => s.params.bendingMethod)
  const setParams = useBendingJobStore((s) => s.setParams)

  // Bu ekrana her gelişte onay sıfırlanır — dizilim her bükümden önce yeniden onaylanır
  useEffect(() => {
    setParams({ rollArrangementConfirmed: false })
  }, [setParams])

  const backTo = `/bending/ai/measurements/${method ?? 'ring'}`
  // 2026-11-20: değerler onaylanınca stage burada alınır (parça konmadan önce). Ekran BEKLETMEZ (kullanıcı):
  // onaya basılınca geri sayım sürüyorsa hareket hemen arka planda başlar; büküm başlarken akış bitmesini bekler.
  const stage = useEarlyStage()

  function confirm() {
    if (stage.phase === 'blocked') return
    stage.startNowIfPending()
    setParams({ rollArrangementConfirmed: true })
    navigate('/bending/ai/part-loading')
  }

  return (
    <div className={styles.page}>
      <PageHeader icon={artificialIntelligenceIcon} iconAlt="Artificial Intelligence" label={modeLabel} />

      <h2 className={styles.title}>{t('VALS TOPU DİZİLİMİ')}</h2>
      {stage.busy && stage.phase !== 'countdown' && (
        <p className={styles.stageNote} role="status">
          {stage.targetStage != null && stage.phase === 'moving'
            ? t('STAGE {n} KONUMUNA GEÇİLİYOR…', { n: stage.targetStage })
            : t('STAGE KONTROL EDİLİYOR…')}
        </p>
      )}
      {stage.phase === 'blocked' && stage.blockMessage ? (
        <p className={styles.blockNote} role="alert">{stage.blockMessage}</p>
      ) : (
        <p className={styles.hint}>{t('VALS TOPLARINI GÖRSELDEKİ GİBİ DİZİP ONAYLAYIN')}</p>
      )}

      <div className={styles.row}>
        <div className={styles.cell}>
          <img src={rollProfile} alt={t('Profil ve vals topu yerleşimi')} className={styles.img} />
        </div>
        <div className={styles.cell}>
          <img src={rollShaft} alt={t('Mil üzerindeki vals diskleri')} className={styles.img} />
        </div>
        <div className={styles.cell}>
          <img src={rollAssembly} alt={t('Vals topu montajı')} className={styles.img} />
        </div>
      </div>

      <StatusBar backTo={backTo} onConfirm={confirm} confirmDisabled={stage.phase === 'blocked'} />

      {stage.phase === 'countdown' && stage.targetStage != null && (
        <StageMoveCountdown
          stage={stage.targetStage}
          onDone={() => void stage.run()}
          onCancel={stage.cancel}
          onSkip={confirm}
          inline
        />
      )}
      {stage.error && (
        <ApiNoticeModal title="STAGE GEÇİŞİ YAPILAMADI" message={stage.error} onClose={stage.clearError} />
      )}
    </div>
  )
}
