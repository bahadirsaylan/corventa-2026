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
import { PRODUCTION_TOLERANCES, readProductionTolerance, saveProductionTolerance } from '@/services/operatorPrefs'
import { t as tr, translateProgress, useLang, useT, type LangCode } from '@/i18n'
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
  const t = useT()

  // ── İptal butonu state'i ────────────────────────
  // Backend'de dedicated cancel endpoint yok — emergency-stop makineyi durdurur ama
  // job state otomatik temizlenmeyebilir; operatöre net uyarı verilir.
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelInfo, setCancelInfo] = useState<string | null>(null)

  // ── Üretim toleransı seçimi (başlıktaki TOLERANS'a dokununca) ──
  const [tolerance, setTolerance] = useState(readProductionTolerance)
  const [tolMenuOpen, setTolMenuOpen] = useState(false)
  function chooseTolerance(mm: number) {
    setTolerance(mm)
    saveProductionTolerance(mm)
    setTolMenuOpen(false)
  }

  useEffect(() => {
    if (!cancelInfo) return
    const timer = setTimeout(() => setCancelInfo(null), 8000)
    return () => clearTimeout(timer)
  }, [cancelInfo])

  async function confirmCancel() {
    setShowCancelModal(false)
    try {
      await window.corventa.machine.emergencyStop()
      setCancelInfo(
        t('BÜKÜM İPTAL TALEBİ GÖNDERİLDİ. JOB STATE TEMİZLENMEZSE SETTINGS\'TEN KONTROL EDİN.'),
      )
    } catch (e) {
      setCancelInfo(t('İPTAL ÇAĞRISI BAŞARISIZ: {err}', { err: e instanceof Error ? e.message : String(e) }))
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
      setCancelInfo(t('ONAY BAŞARISIZ: {err}', { err: e instanceof Error ? e.message : String(e) }))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={styles.panel}>
      {/* ── Header row ─────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLabel}>{t('BASINÇ')}</span>
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
          <span className={styles.aiLabel}>{t('YAPAY ZEKA MODU')}</span>
        </div>

        <div className={styles.headerRight}>
          {bendingActive && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowCancelModal(true)}
              aria-label={t('Bukumu iptal et')}
            >
              {t('■ İPTAL')}
            </button>
          )}
          <button
            type="button"
            className={styles.tolBtn}
            onClick={() => setTolMenuOpen((o) => !o)}
            aria-expanded={tolMenuOpen}
          >
            <span className={styles.headerLabel}>{t('TOLERANS')}</span>
            <span className={styles.headerValue}>{tolerance}</span>
            <span className={styles.headerUnit}>mm</span>
            <span className={styles.tolCaret} aria-hidden>▾</span>
          </button>
        </div>
      </div>

      {tolMenuOpen && (
        <>
          <div className={styles.tolBackdrop} onClick={() => setTolMenuOpen(false)} />
          <div className={styles.tolMenu} role="menu">
            {PRODUCTION_TOLERANCES.map((o) => (
              <button
                key={o.mm}
                type="button"
                role="menuitemradio"
                aria-checked={tolerance === o.mm}
                className={styles.tolOption}
                data-selected={tolerance === o.mm || undefined}
                onClick={() => chooseTolerance(o.mm)}
              >
                <span className={styles.tolOptionValue}>{o.mm} mm</span>
                <span className={styles.tolOptionLabel}>{t(o.label)}</span>
                {tolerance === o.mm && <span className={styles.tolCheck} aria-hidden>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {cancelInfo && <div className={styles.cancelInfoBar}>{cancelInfo}</div>}

      {progress?.awaitingSideSupportConfirmation && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmText}>{t('YAN DAYAMA HAZIR MI?')}</span>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmSideSupport}
            disabled={confirming}
          >
            {confirming ? '...' : t('▶ DEVAM')}
          </button>
        </div>
      )}

      {showCancelModal && (
        <ConfirmModal
          message={
            <>
              {t('BÜKÜM İPTAL EDİLECEK — TÜM HAREKET ANINDA DURDURULACAK')}
              <br />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {t('(Hidrolik motor + valfler kapatılacak, job state Failed olarak işaretlenmeyebilir)')}
              </span>
            </>
          }
          variant="danger"
          confirmLabel={t('İPTAL ET')}
          cancelLabel={t('VAZGEÇ')}
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
  const t = useT()
  const lang = useLang()
  const runningJobId = useBendingActivityStore((s) => s.runningJobId)
  const rawProgress = useBendingProgress()
  // Store'da önceki işin son ilerlemesi kalmış olabilir — sadece çalışan job'unkini göster.
  const progress = rawProgress && rawProgress.jobId === runningJobId ? rawProgress : null

  const runningJob = useBendingActivityStore((s) => s.runningJob)
  const radiusLabel = formatRadiusLabel(runningJob, progress)
  const pasoView = describePaso(progress, lang)

  return (
    <div className={`${styles.panel} ${styles.monitor}`}>
      {/* ── 4 vals topu (salt-okunur) ──────────────── */}
      <div className={styles.monitorGrid}>
        <ProfileArcStage top={top} bottom={bottom} left={left} right={right} radiusLabel={radiusLabel} />
      </div>

      {/* ── İlerleme footer ────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={styles.statsCol}>
          <p className={styles.finishLabel}>{t('ROTASYON')}</p>
          <p className={styles.posCurrent}>{rotationMm.toFixed(1)}</p>
          <p className={styles.posSmall}>mm</p>
        </div>

        <div className={`${styles.statsCol} ${styles.statsColCenter}`}>
          {pasoView ? (
            <>
              <p className={styles.finishLabel}>{pasoView.running ? t('BÜKÜLEN PASO') : t('PASO')}</p>
              <p className={styles.posCurrent}>{pasoView.current}</p>
              <p className={styles.posSmall}>{t('TAMAMLANAN: {n}', { n: pasoView.completed })}</p>
            </>
          ) : (
            <p className={styles.posSmall}>{progress
                ? progress.message != null ? translateProgress(progress.message, lang) : t('HAZIRLANIYOR…')
                : t('BÜKÜM BAŞLATILIYOR')}</p>
          )}
        </div>

        <div className={styles.statsCol}>
          {progress ? (
            <>
              <p className={styles.finishLabel}>
                {t('PASO')}{' '}
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
              <p className={styles.statusText}>{pasoView?.status ?? translateProgress(progress.message, lang)}</p>
            </>
          ) : (
            <p className={styles.statusText}>{t('HAZIRLANIYOR…')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Band üstündeki yarıçap etiketi.
// Büküm sırasında backend piston konumundan canlı R gönderir (currentRadiusMm) — varsa o gösterilir.
// Yoksa (düzlük, temas öncesi, ölçüm/düzeltme) statik: Arc'ta o anki segmentin R'si, diğerlerinde hedef Ø / 2.
function formatRadiusLabel(job: BendingJob | null, progress: BendingProgress | null): string {
  if (!job) return 'R —'
  const live = progress?.currentRadiusMm
  if (typeof live === 'number' && Number.isFinite(live) && live > 0) return `R ${Math.round(live)}`
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
  /** Durum satırı (ekran dilinde — ayrıştırma ham mesajla yapılır) */
  status: string | null
}

function describePaso(progress: BendingProgress | null, lang: LangCode): PasoView | null {
  if (!progress || progress.totalPasos <= 0) return null
  const completed = Math.max(0, progress.completedPasos)
  const total = progress.totalPasos
  const message = progress.message ?? ''
  const pasoBending = /^paso\s+\d+\s+bükülüyor/i.test(message)
  const pasoDone = /^(dinamik\s+)?paso\s+\d+\s+tamamland/i.test(message)
  const running = pasoBending || (completed < total && (pasoDone || completed === 0))
  const current = running ? completed + 1 : Math.max(1, completed)
  let status: string | null = progress.message != null ? translateProgress(progress.message, lang) : null
  if (pasoBending) status = tr('PASO {n} BÜKÜLÜYOR', { n: current })
  else if (running && pasoDone) status = tr('PASO {n} BÜKÜLÜYOR · PASO {done} TAMAMLANDI', { n: current, done: completed })
  return { current, completed, running, status }
}
