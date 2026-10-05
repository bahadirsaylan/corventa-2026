// Ayarlar > Cetvel Sıfırlama — gönye alma (makine referans pozisyonu).
// Backend: POST /api/preparation/gonye (Web projesindeki "Gönye Al" ile aynı çağrı, boş body).
// Akış (backend): pistonlar mekanik limite çekilir → tüm cetveller sıfırlanır → gönye ofsetlerine gidilir
// → cetveller tekrar sıfırlanır → fiziksel pozisyon takibi "gönye yapıldı" olarak işaretlenir.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import styles from './EncoderResetPage.module.css'

const STEPS = [
  'TÜM PİSTONLAR MEKANİK LİMİTE GERİ ÇEKİLİR (S1 + S2 HEDEF BASINCA ULAŞANA KADAR)',
  'TÜM CETVELLER SIFIRLANIR — REFERANS NOKTASI',
  'PİSTONLAR GÖNYE OFSET POZİSYONLARINA GİDER',
  'CETVELLER GÖNYE POZİSYONUNDA TEKRAR SIFIRLANIR',
]

type Status = { kind: 'ok' | 'error'; text: string } | null

export default function EncoderResetPage() {
  const navigate = useNavigate()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  const physical = useMachineStateStore((s) => s.state.physicalInfo)
  const bendingActive = useBendingActive()

  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const motorReady = motorState === 2
  const blockedReason = bendingActive
    ? 'OTOMATİK BÜKÜM DEVAM EDİYOR — GÖNYE ALINAMAZ.'
    : !motorReady
      ? 'HİDROLİK MOTOR ÇALIŞMIYOR — ÖNCE MOTORU START EDİN.'
      : null

  async function runGonye() {
    setConfirming(false)
    setRunning(true)
    setStatus(null)
    try {
      const res = await window.corventa.bending.executeGonye()
      setStatus(
        res.success
          ? { kind: 'ok', text: 'GÖNYE BAŞARIYLA TAMAMLANDI — CETVELLER SIFIRLANDI.' }
          : { kind: 'error', text: `GÖNYE BAŞARISIZ: ${res.errorMessage ?? 'BİLİNMEYEN HATA'}` },
      )
    } catch (e) {
      setStatus({ kind: 'error', text: `GÖNYE ÇAĞRISI BAŞARISIZ: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri" disabled={running}>
          ←
        </button>
        <h1 className={styles.title}>CETVEL SIFIRLAMA — GÖNYE ALMA</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          ⚠ GÖNYE TÜM PİSTONLARI HAREKET ETTİRİR VE MAKİNENİN POZİSYON REFERANSINI YENİDEN BELİRLER.
          &nbsp;BAŞLATMADAN ÖNCE MAKİNEDE PARÇA OLMADIĞINDAN VE ÇEVRENİN GÜVENLİ OLDUĞUNDAN EMİN OLUN.
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>MEVCUT DURUM</span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>GÖNYE</span>
            <span className={physical.isGonyeCompleted ? styles.stateOk : styles.stateNo}>
              {physical.isGonyeCompleted ? 'YAPILDI' : 'YAPILMADI'}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>STAGE</span>
            <span className={styles.stateValue}>
              {physical.currentStageName ?? (physical.currentStage > 0 ? `STAGE ${physical.currentStage}` : '—')}
            </span>
          </div>
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>HİDROLİK MOTOR</span>
            <span className={motorReady ? styles.stateOk : styles.stateNo}>
              {motorReady ? 'HAZIR' : motorState === 1 ? 'BAŞLIYOR' : 'KAPALI'}
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>İŞLEM ADIMLARI</span>
          </div>
          <ol className={styles.stepList}>
            {STEPS.map((s) => (
              <li key={s} className={styles.step}>{s}</li>
            ))}
          </ol>
        </div>

        {status && (
          <div className={status.kind === 'ok' ? styles.statusOk : styles.statusError}>{status.text}</div>
        )}

        <div className={styles.actionRow}>
          <span className={styles.actionHint}>
            {running ? 'GÖNYE ALINIYOR — İŞLEM BİTENE KADAR BEKLEYİN…' : blockedReason ?? 'MAKİNE HAZIR.'}
          </span>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setConfirming(true)}
            disabled={running || blockedReason != null}
          >
            {running ? 'GÖNYE ALINIYOR…' : '↻ GÖNYE AL'}
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
    </div>
  )
}
