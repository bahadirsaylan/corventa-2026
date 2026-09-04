// Üst panel — 4 vals topu pozisyonu + büküm ilerlemesi.
// Backend SignalR /machineHub'tan gelen MachineState'i selector ile dinler.
// Backend kapalıyken default 0 değerleriyle render eder; ConnectionBanner durumu söyler.

import { useEffect, useState } from 'react'

import BendingBall from './BendingBall'
import SideSupportControls from './SideSupportControls'
import RotationJogButtons from './RotationJogButtons'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { useBendingProgress, usePiston } from '@/hooks/useMachineState'
import { useMachineStateStore } from '@/stores/machineStateStore'
import styles from './BendingBallsPanel.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

export default function BendingBallsPanel() {
  // Pistonlar — store selector (sadece ilgili slice değişince re-render)
  const top = usePiston('upperPiston')
  const bottom = usePiston('lowerPiston')
  const left = usePiston('leftPiston')
  const right = usePiston('rightPiston')

  // Büküm ilerlemesi (varsa)
  const progress = useBendingProgress()

  // Sensörler ve tolerans bilgisi
  const s1Pressure = useMachineStateStore((s) => s.state.sensors.s1PressureBar)

  // Aktif job çapı: gelecekte useActiveBendingJob() ile gelecek; şimdilik bendingProgress yoksa "—"
  const archLabel = progress ? `R ${progress.jobId}` : 'R —'

  // ── İptal butonu state'i ────────────────────────
  // Backend'de henüz dedicated cancel endpoint yok (CLAUDE.md TODO). Bu yüzden
  // operatöre net uyarı veriyoruz: emergency-stop makineyi durdurur ama job
  // state otomatik temizlenmeyebilir.
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
  // Pipeline ilk 3/4 rotasyondan sonra durur, operatör yan dayama ayarını yapıp bu butona basar.
  // Backend awaitingSideSupportConfirmation=true iken görünür; onay endpoint pipeline'ı uyandırır.
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
          {progress && (
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
          <span className={styles.confirmText}>
            YAN DAYAMA AYARINI BİTİRDİYSEN
          </span>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmSideSupport}
            disabled={confirming}
          >
            {confirming ? '...' : '▶ DEVAM ET'}
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

      {/* ── Content grid: yan dayamalar (sol) + top grid + yan dayamalar (sağ) ── */}
      <div className={styles.contentGrid}>
        <div className={styles.sideCol}>
          <SideSupportControls side="left" />
        </div>
      <div className={styles.ballGrid}>
        {/* Left column — sadece ball */}
        <div className={styles.colLeft}>
          <BendingBall id="left" value={left.positionMm} active={left.moving || left.inPosition} />
        </div>

        {/* Center column — top ball + arch label + bottom ball */}
        <div className={styles.colCenter}>
          <BendingBall id="top" value={top.positionMm} active={top.moving || top.inPosition} />
          <div className={styles.archLabel}>{archLabel}</div>
          <BendingBall
            id="bottom"
            value={bottom.positionMm}
            active={bottom.moving || bottom.inPosition}
          />
        </div>

        {/* Right column — sadece ball */}
        <div className={styles.colRight}>
          <BendingBall
            id="right"
            value={right.positionMm}
            active={right.moving || right.inPosition}
          />
        </div>
      </div>
        <div className={styles.sideCol}>
          <SideSupportControls side="right" />
        </div>
      </div>

      {/* ── Stats footer ───────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statsCol}>
          <RotationJogButtons />
        </div>

        <div className={`${styles.statsCol} ${styles.statsColCenter}`}>
          {progress ? (
            <>
              <p className={styles.posSmall}>
                {Math.max(0, progress.completedPasos - 1)}
                &nbsp;&nbsp;&nbsp;Y : —
              </p>
              <p className={styles.posCurrent}>
                {progress.completedPasos}&nbsp;
                <span className={styles.posX}>X : {right.positionMm.toFixed(1)}</span>
              </p>
              <p className={styles.posSmall}>
                {progress.completedPasos + 1}
                &nbsp;&nbsp;&nbsp;Y : —
              </p>
            </>
          ) : (
            <p className={styles.posSmall}>BÜKÜM BEKLENİYOR</p>
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
              <p className={styles.statusText}>{progress.message}</p>
            </>
          ) : (
            <p className={styles.statusText}>HAZIR</p>
          )}
        </div>
      </div>
    </div>
  )
}
