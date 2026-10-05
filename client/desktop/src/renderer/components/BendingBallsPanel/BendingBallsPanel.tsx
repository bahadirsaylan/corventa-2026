// Makine paneli — iki varyant (2026-10-02):
//   variant="control" (orta alan, her zaman): başlık (BASINÇ / AI / TOLERANS + İPTAL),
//      Serpantin yan dayama onayı ve manuel tuş takımı (ManualControlPad).
//   variant="monitor" (üst alan, sadece otomatik büküm aktifken): 4 vals topu pozisyonu
//      + rotasyon + paso ilerlemesi. Salt-okunur — büküm sırasında manuel jog kilitli.
// Backend SignalR /machineHub'tan gelen MachineState'i selector ile dinler.

import { useEffect, useState } from 'react'

import { BendingMethod, type BendingJob, type BendingProgress } from '@shared/types'

import ProfileArcStage from './ProfileArcStage'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import ManualControlPad from '@/components/ManualControlPad/ManualControlPad'
import { useBendingProgress, usePiston } from '@/hooks/useMachineState'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive, useBendingActivityStore } from '@/stores/bendingActivityStore'
import styles from './BendingBallsPanel.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

interface Props {
  variant: 'control' | 'monitor'
}

export default function BendingBallsPanel({ variant }: Props) {
  return variant === 'control' ? <ControlPanel /> : <MonitorPanel />
}

// ─────────────────────────────────────────────────────────────
// Orta alan — başlık + tuş takımı
// ─────────────────────────────────────────────────────────────

function ControlPanel() {
  const progress = useBendingProgress()
  const bendingActive = useBendingActive()
  const s1Pressure = useMachineStateStore((s) => s.state.sensors.s1PressureBar)

  // ── İptal butonu state'i ────────────────────────
  // Backend'de dedicated cancel endpoint yok — emergency-stop makineyi durdurur ama
  // job state otomatik temizlenmeyebilir; operatöre net uyarı verilir.
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelInfo, setCancelInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!cancelInfo) return
    const t = setTimeout(() => setCancelInfo(null), 8000)
    return () => clearTimeout(t)
  }, [cancelInfo])

  async function confirmCancel() {
    setShowCancelModal(false)
    try {
      await window.corventa.machine.emergencyStop()
      setCancelInfo(
        'BÜKÜM İPTAL TALEBİ GÖNDERİLDİ. JOB STATE TEMİZLENMEZSE SETTINGS\'TEN KONTROL EDİN.',
      )
    } catch (e) {
      setCancelInfo('İPTAL ÇAĞRISI BAŞARISIZ: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  // ── Serpantin yan dayama onayı ──────────────────
  // Pipeline ilk 3/4 rotasyondan sonra durur, operatör yan dayama ayarını yapıp onaylar.
  const [confirming, setConfirming] = useState(false)
  async function handleConfirmSideSupport() {
    if (!progress || confirming) return
    setConfirming(true)
    try {
      await window.corventa.bending.confirmSideSupport(progress.jobId)
    } catch (e) {
      setCancelInfo('ONAY BAŞARISIZ: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={styles.panel}>
      {/* ── Header row ─────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLabel}>PRESSURE</span>
          <span className={styles.headerValue}>{s1Pressure}</span>
          <span className={styles.headerUnit}>BAR</span>
        </div>

        <div className={styles.headerCenter}>
          <img
            src={artificialIntelligenceIcon}
            alt="Artificial Intelligence"
            className={styles.aiIcon}
            width={80}
            height={80}
          />
          <span className={styles.aiLabel}>ARTIFICIAL INTELLIGENCE MODE</span>
        </div>

        <div className={styles.headerRight}>
          {bendingActive && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowCancelModal(true)}
              aria-label="Bukumu iptal et"
            >
              ■ İPTAL
            </button>
          )}
          <span className={styles.headerLabel}>TOLERANCE</span>
          <span className={styles.headerValue}>0.1</span>
          <span className={styles.headerUnit}>mm</span>
        </div>
      </div>

      {cancelInfo && <div className={styles.cancelInfoBar}>{cancelInfo}</div>}

      {progress?.awaitingSideSupportConfirmation && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmText}>YAN DAYAMA HAZIR MI?</span>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmSideSupport}
            disabled={confirming}
          >
            {confirming ? '...' : '▶ DEVAM'}
          </button>
        </div>
      )}

      {showCancelModal && (
        <ConfirmModal
          message={
            <>
              BÜKÜM İPTAL EDİLECEK — TÜM HAREKET ANINDA DURDURULACAK
              <br />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                (Hidrolik motor + valfler kapatılacak, job state Failed olarak işaretlenmeyebilir)
              </span>
            </>
          }
          variant="danger"
          confirmLabel="İPTAL ET"
          cancelLabel="VAZGEÇ"
          onCancel={() => setShowCancelModal(false)}
          onConfirm={confirmCancel}
        />
      )}

      {/* ── Manuel tuş takımı ──────────────────────── */}
      <div className={styles.padArea}>
        <ManualControlPad />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Üst alan (büküm sırasında) — top pozisyonları + ilerleme
// ─────────────────────────────────────────────────────────────

function MonitorPanel() {
  const top = usePiston('upperPiston')
  const bottom = usePiston('lowerPiston')
  const left = usePiston('leftPiston')
  const right = usePiston('rightPiston')
  const rotationMm = useMachineStateStore((s) => s.state.rotation.positionMm)
  const runningJobId = useBendingActivityStore((s) => s.runningJobId)
  const rawProgress = useBendingProgress()
  // Store'da önceki işin son ilerlemesi kalmış olabilir — sadece çalışan job'unkini göster.
  const progress = rawProgress && rawProgress.jobId === runningJobId ? rawProgress : null

  const runningJob = useBendingActivityStore((s) => s.runningJob)
  const radiusLabel = formatRadiusLabel(runningJob, progress)
  const pasoView = describePaso(progress)

  return (
    <div className={`${styles.panel} ${styles.monitor}`}>
      {/* ── 4 vals topu (salt-okunur) ──────────────── */}
      <div className={styles.monitorGrid}>
        <ProfileArcStage top={top} bottom={bottom} left={left} right={right} radiusLabel={radiusLabel} />
      </div>

      {/* ── İlerleme footer ────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statsCol}>
          <p className={styles.finishLabel}>ROTASYON</p>
          <p className={styles.posCurrent}>{rotationMm.toFixed(1)}</p>
          <p className={styles.posSmall}>mm</p>
        </div>

        <div className={`${styles.statsCol} ${styles.statsColCenter}`}>
          {pasoView ? (
            <>
              <p className={styles.finishLabel}>{pasoView.running ? 'BÜKÜLEN PASO' : 'PASO'}</p>
              <p className={styles.posCurrent}>{pasoView.current}</p>
              <p className={styles.posSmall}>TAMAMLANAN: {pasoView.completed}</p>
            </>
          ) : (
            <p className={styles.posSmall}>{progress ? progress.message ?? 'HAZIRLANIYOR…' : 'BÜKÜM BAŞLATILIYOR'}</p>
          )}
        </div>

        <div className={styles.statsCol}>
          {progress ? (
            <>
              <p className={styles.finishLabel}>
                PASO{' '}
                <span className={styles.finishValue}>
                  {progress.completedPasos} / {progress.totalPasos}
                </span>{' '}
                <span className={styles.finishPercent}>
                  (%{progress.percentComplete.toFixed(0)})
                </span>
              </p>
              <div className={styles.progressBarOuter}>
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `${Math.max(0, Math.min(100, progress.percentComplete))}%`,
                  }}
                />
              </div>
              <p className={styles.statusText}>{pasoView?.status ?? progress.message}</p>
            </>
          ) : (
            <p className={styles.statusText}>HAZIRLANIYOR…</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Band üstündeki yarıçap etiketi: Arc'ta o an bükülen segmentin R'si, diğer metotlarda hedef Ø / 2.
function formatRadiusLabel(job: BendingJob | null, progress: BendingProgress | null): string {
  if (!job) return 'R —'
  let r: number | null = null
  if (job.method === BendingMethod.Arc && job.segments && job.segments.length > 0) {
    const n = job.segments.length
    const done = progress?.completedSegmentOrder ?? 0
    const cur = Math.min(Math.max(done, 0), n - 1)
    // Ters sıralı işte runtime segmentleri sondan başa büker
    const reversed = (job as { isReversedArcOrder?: boolean }).isReversedArcOrder === true
    const seg = job.segments[reversed ? n - 1 - cur : cur]
    r = seg?.radiusMm ?? null
  } else if (job.targetDiameterMm > 0) {
    r = job.targetDiameterMm / 2
  }
  if (r == null || !Number.isFinite(r) || r <= 0) return 'R —'
  return `R ${Number.isInteger(r) ? r : r.toFixed(1)}`
}

// Backend her paso BAŞLARKEN "Paso N bükülüyor", BİTİNCE "Paso N tamamlandı" yazar
// (completedPasos = biten sayısı). Ekranda o an bükülen paso gösterilir.
// Eski backend sadece "tamamlandı" yazıyordu — bu durumda da bükülen = tamamlanan + 1 kabul edilir.
interface PasoView {
  /** Şu an bükülen (ya da bitişte son) paso numarası */
  current: number
  completed: number
  running: boolean
  /** Durum satırı */
  status: string | null
}

function describePaso(progress: BendingProgress | null): PasoView | null {
  if (!progress || progress.totalPasos <= 0) return null
  const completed = Math.max(0, progress.completedPasos)
  const total = progress.totalPasos
  const message = progress.message ?? ''
  const pasoBending = /^paso\s+\d+\s+bükülüyor/i.test(message)
  const pasoDone = /^(dinamik\s+)?paso\s+\d+\s+tamamland/i.test(message)
  const running = pasoBending || (completed < total && (pasoDone || completed === 0))
  const current = running ? completed + 1 : Math.max(1, completed)
  let status: string | null = progress.message ?? null
  if (pasoBending) status = `PASO ${current} BÜKÜLÜYOR`
  else if (running && pasoDone) status = `PASO ${current} BÜKÜLÜYOR · PASO ${completed} TAMAMLANDI`
  return { current, completed, running, status }
}
