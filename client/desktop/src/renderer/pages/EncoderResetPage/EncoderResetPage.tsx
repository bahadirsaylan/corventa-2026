// Ayarlar > Cetvel Sıfırlama — gönye alma (makine referans pozisyonu).
// Backend: POST /api/preparation/gonye (Web projesindeki "Gönye Al" ile aynı çağrı, boş body).
// Akış (backend): pistonlar mekanik limite çekilir → tüm cetveller sıfırlanır → gönye ofsetlerine gidilir
// → cetveller tekrar sıfırlanır → fiziksel pozisyon takibi "gönye yapıldı" olarak işaretlenir.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StageInfo } from '@shared/types'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'
import styles from './EncoderResetPage.module.css'

// Backend POST /api/preparation/stage sadece 1-3 kabul ediyor (PreparationController).
const VALID_STAGES = [1, 2, 3]
const FALLBACK_STAGES: StageInfo[] = VALID_STAGES.map((n) => ({
  id: n, stageNumber: n, name: `Stage ${n}`, leftOffsetMm: 0, rightOffsetMm: 0, lowerOffsetMm: 0,
}))

const STEPS = [
  'TÜM PİSTONLAR MEKANİK LİMİTE GERİ ÇEKİLİR (S1 + S2 HEDEF BASINCA ULAŞANA KADAR)',
  'TÜM CETVELLER SIFIRLANIR — REFERANS NOKTASI',
  'PİSTONLAR GÖNYE OFSET POZİSYONLARINA GİDER',
  'CETVELLER GÖNYE POZİSYONUNDA TEKRAR SIFIRLANIR',
]

type Status = { kind: 'ok' | 'error'; text: string } | null

export default function EncoderResetPage() {
  const navigate = useNavigate()
  const t = useT()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  const physical = useMachineStateStore((s) => s.state.physicalInfo)
  const bendingActive = useBendingActive()

  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  // Stage seçimi — DB'deki stage tanımları (okunamazsa 1-3 sabit liste)
  const [stages, setStages] = useState<StageInfo[]>(FALLBACK_STAGES)
  const [stageConfirm, setStageConfirm] = useState<StageInfo | null>(null)
  const [stageRunning, setStageRunning] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    window.corventa.settings
      .getStages()
      .then((list) => {
        const valid = (list ?? [])
          .filter((s) => VALID_STAGES.includes(s.stageNumber))
          .sort((a, b) => a.stageNumber - b.stageNumber)
        if (alive && valid.length > 0) setStages(valid)
      })
      .catch(() => {
        /* DataApi'ye ulaşılamadı — sabit liste kalır */
      })
    return () => {
      alive = false
    }
  }, [])

  const motorReady = motorState === 2
  const busy = running || stageRunning != null
  const blockedReason = bendingActive
    ? 'OTOMATİK BÜKÜM DEVAM EDİYOR — GÖNYE ALINAMAZ.'
    : !motorReady
      ? 'HİDROLİK MOTOR ÇALIŞMIYOR — ÖNCE MOTORU START EDİN.'
      : null
  const stageBlockedReason = blockedReason
    ? blockedReason.replace('GÖNYE ALINAMAZ', 'STAGE DEĞİŞTİRİLEMEZ')
    : !physical.isGonyeCompleted
      ? 'ÖNCE GÖNYE ALINMALI — STAGE GÖNYEYE GÖRE KONUMLANIR.'
      : null

  async function runStage(st: StageInfo) {
    setStageConfirm(null)
    setStageRunning(st.stageNumber)
    setStatus(null)
    try {
      await window.corventa.bending.applyStage({ targetStage: st.stageNumber, speedPercent: 50 })
      setStatus({ kind: 'ok', text: t('{name} KONUMUNA GEÇİLDİ.', { name: st.name.toUpperCase() }) })
    } catch (e) {
      setStatus({ kind: 'error', text: t('STAGE DEĞİŞTİRİLEMEDİ: {err}', { err: e instanceof Error ? e.message : String(e) }) })
    } finally {
      setStageRunning(null)
    }
  }

  async function runGonye() {
    setConfirming(false)
    setRunning(true)
    setStatus(null)
    try {
      const res = await window.corventa.bending.executeGonye()
      setStatus(
        res.success
          ? { kind: 'ok', text: t('GÖNYE BAŞARIYLA TAMAMLANDI — CETVELLER SIFIRLANDI.') }
          : { kind: 'error', text: t('GÖNYE BAŞARISIZ: {err}', { err: res.errorMessage ?? t('BİLİNMEYEN HATA') }) },
      )
    } catch (e) {
      setStatus({ kind: 'error', text: t('GÖNYE ÇAĞRISI BAŞARISIZ: {err}', { err: e instanceof Error ? e.message : String(e) }) })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')} disabled={busy}>
          ←
        </button>
        <h1 className={styles.title}>{t('CETVEL SIFIRLAMA — GÖNYE ALMA')}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          ⚠ {t('GÖNYE TÜM PİSTONLARI HAREKET ETTİRİR VE MAKİNENİN POZİSYON REFERANSINI YENİDEN BELİRLER.')}
          &nbsp;{t('BAŞLATMADAN ÖNCE MAKİNEDE PARÇA OLMADIĞINDAN VE ÇEVRENİN GÜVENLİ OLDUĞUNDAN EMİN OLUN.')}
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('MEVCUT DURUM')}</span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('GÖNYE')}</span>
            <span className={physical.isGonyeCompleted ? styles.stateOk : styles.stateNo}>
              {physical.isGonyeCompleted ? t('YAPILDI') : t('YAPILMADI')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>STAGE</span>
            <span className={styles.stateValue}>
              {physical.currentStageName ?? (physical.currentStage > 0 ? `STAGE ${physical.currentStage}` : '—')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>{t('HİDROLİK MOTOR')}</span>
            <span className={motorReady ? styles.stateOk : styles.stateNo}>
              {motorReady ? t('HAZIR') : motorState === 1 ? t('BAŞLIYOR') : t('KAPALI')}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('STAGE SEÇİMİ')}</span>
            <span className={styles.stageHint}>
              {stageRunning != null
                ? t('STAGE {n} KONUMUNA GİDİLİYOR…', { n: stageRunning })
                : t(stageBlockedReason ?? 'DOKUNARAK SEÇİN')}
            </span>
          </div>
          <div className={styles.stageGrid}>
            {stages.map((st) => {
              const current = physical.isGonyeCompleted && physical.currentStage === st.stageNumber
              return (
                <button
                  key={st.stageNumber}
                  type="button"
                  className={styles.stageBtn}
                  data-current={current || undefined}
                  data-running={stageRunning === st.stageNumber || undefined}
                  disabled={busy || stageBlockedReason != null}
                  onClick={() => setStageConfirm(st)}
                >
                  <span className={styles.stageName}>{st.name.toUpperCase()}</span>
                  <span className={styles.stageOffsets}>
                    {t('SOL')} {st.leftOffsetMm.toFixed(2)} · {t('ALT')} {st.lowerOffsetMm.toFixed(2)} · {t('SAĞ')} {st.rightOffsetMm.toFixed(2)}
                  </span>
                  {current && <span className={styles.stageCurrent}>✓ {t('AKTİF')}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>{t('GÖNYE — İŞLEM ADIMLARI')}</span>
          </div>
          <ol className={styles.stepList}>
            {STEPS.map((s) => (
              <li key={s} className={styles.step}>{t(s)}</li>
            ))}
          </ol>
        </div>

        {status && (
          <div className={status.kind === 'ok' ? styles.statusOk : styles.statusError}>{status.text}</div>
        )}

        <div className={styles.actionRow}>
          <span className={styles.actionHint}>
            {running ? t('GÖNYE ALINIYOR — İŞLEM BİTENE KADAR BEKLEYİN…') : t(blockedReason ?? 'MAKİNE HAZIR.')}
          </span>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setConfirming(true)}
            disabled={busy || blockedReason != null}
          >
            {running ? t('GÖNYE ALINIYOR…') : `↻ ${t('GÖNYE AL')}`}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          message="TÜM PİSTONLAR HAREKET EDECEK VE CETVELLER SIFIRLANACAK. GÖNYE ALINSIN MI"
          variant="danger"
          confirmLabel="GÖNYE AL"
          cancelLabel="VAZGEÇ"
          onCancel={() => setConfirming(false)}
          onConfirm={runGonye}
        />
      )}

      {stageConfirm && (
        <ConfirmModal
          message={t('SOL, ALT VE SAĞ PİSTONLAR {name} KONUMUNA GİDECEK. DEVAM EDİLSİN Mİ', { name: stageConfirm.name.toUpperCase() })}
          variant="danger"
          confirmLabel={t("{name}'E GEÇ", { name: stageConfirm.name.toUpperCase() })}
          cancelLabel="VAZGEÇ"
          onCancel={() => setStageConfirm(null)}
          onConfirm={() => runStage(stageConfirm)}
        />
      )}
    </div>
  )
}
