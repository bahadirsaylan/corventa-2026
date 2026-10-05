// Orta alan manuel tuş takımı — makinenin fiziksel yerleşimini taklit eder
// (referans: Corventa_ManuelControl.jpg). Tüm komutlar mevcut, test edilmiş IPC'leri kullanır:
//   piston jog/stop, rotasyon jog/stop, yan dayama, hidrolik motor aç/kapat.
//
// Otomatik büküm aktifken: piston + rotasyon + hız + START kilitli.
// Yan dayamalar her zaman serbest (Serpantin'de operatör büküm sırasında ayar yapıyor).
// STOP her zaman açık — operatör motoru her an kesebilmeli.
//
// Yan dayama tuş eşleşmesi (TAHMİNİ — sahada doğrulanacak):
//   dikey çift = REEL, yatay çift = JOINT, eğik çift = BODY.

import { useCallback, useState } from 'react'

import type { PistonName, SideSupportSide, SideSupportType } from '@shared/types'
import { usePiston } from '@/hooks/useMachineState'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useHoldAction } from './useHoldAction'
import styles from './ManualControlPad.module.css'

const SPEED_STEP = 5
const SPEED_MIN = 5
const SPEED_MAX = 100

export default function ManualControlPad() {
  const locked = useBendingActive()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  const [speed, setSpeed] = useState(20)
  const [motorBusy, setMotorBusy] = useState(false)

  const upper = usePiston('upperPiston')
  const lower = usePiston('lowerPiston')
  const left = usePiston('leftPiston')
  const right = usePiston('rightPiston')

  async function setMotor(on: boolean) {
    if (motorBusy) return
    setMotorBusy(true)
    try {
      await window.corventa.machine.setHydraulicMotor(on)
    } catch {
      // Hata durumunda motor durumu SignalR state'inden okunmaya devam eder
    } finally {
      setMotorBusy(false)
    }
  }

  const motorRunning = motorState === 2
  const motorStarting = motorState === 1

  return (
    <div className={styles.pad} data-locked={locked || undefined}>
      {locked && (
        <div className={styles.lockBadge}>
          BÜKÜM AKTİF — PİSTON VE ROTASYON KİLİTLİ · YAN DAYAMALAR SERBEST
        </div>
      )}

      {/* ── Sol yan dayamalar ─────────────────────── */}
      <SideBtn side="left" type="reel" dir={1} arrow={-90} label="REEL" cls={styles.lReelFwd} />
      <SideBtn side="left" type="reel" dir={-1} arrow={90} cls={styles.lReelBwd} />
      <div className={`${styles.link} ${styles.lReelLink}`} />

      <SideBtn side="left" type="joint" dir={-1} arrow={180} label="JOINT" cls={styles.lJointBwd} />
      <SideBtn side="left" type="joint" dir={1} arrow={0} cls={styles.lJointFwd} />
      <div className={`${styles.link} ${styles.lJointLink}`} />

      <SideBtn side="left" type="body" dir={1} arrow={-70} label="BODY" cls={styles.lBodyFwd} />
      <SideBtn side="left" type="body" dir={-1} arrow={110} cls={styles.lBodyBwd} />
      <div className={`${styles.link} ${styles.lBodyLink}`} />

      {/* ── Sağ yan dayamalar (ayna) ──────────────── */}
      <SideBtn side="right" type="reel" dir={1} arrow={-90} label="REEL" cls={styles.rReelFwd} />
      <SideBtn side="right" type="reel" dir={-1} arrow={90} cls={styles.rReelBwd} />
      <div className={`${styles.link} ${styles.rReelLink}`} />

      <SideBtn side="right" type="joint" dir={1} arrow={180} cls={styles.rJointFwd} />
      <SideBtn side="right" type="joint" dir={-1} arrow={0} label="JOINT" cls={styles.rJointBwd} />
      <div className={`${styles.link} ${styles.rJointLink}`} />

      <SideBtn side="right" type="body" dir={1} arrow={-110} label="BODY" cls={styles.rBodyFwd} />
      <SideBtn side="right" type="body" dir={-1} arrow={70} cls={styles.rBodyBwd} />
      <div className={`${styles.link} ${styles.rBodyLink}`} />

      {/* ── Hız − / + ─────────────────────────────── */}
      <div className={styles.speed}>
        <button
          type="button"
          className={styles.speedBtn}
          disabled={locked || speed <= SPEED_MIN}
          onClick={() => setSpeed((v) => Math.max(SPEED_MIN, v - SPEED_STEP))}
          aria-label="Hızı azalt"
        >
          −
        </button>
        <div className={styles.speedValue}>
          <span className={styles.speedPct}>%{speed}</span>
          <span className={styles.speedLabel}>MANUEL HIZ</span>
        </div>
        <button
          type="button"
          className={styles.speedBtn}
          disabled={locked || speed >= SPEED_MAX}
          onClick={() => setSpeed((v) => Math.min(SPEED_MAX, v + SPEED_STEP))}
          aria-label="Hızı artır"
        >
          +
        </button>
      </div>

      {/* ── Rotasyon ──────────────────────────────── */}
      <RotationBtn dir={1} speed={speed} locked={locked} cls={styles.rotCw} label="ROTASYON CW" />
      <RotationBtn dir={-1} speed={speed} locked={locked} cls={styles.rotCcw} label="ROTASYON CCW" />

      {/* ── Pistonlar ─────────────────────────────── */}
      {/* Dört pistonda da (makinede doğrulandı, 2026-10-05): ÜST ok = İLERİ (direction -1, parçaya),
          ALT ok = GERİ (direction +1). Backend polaritesi: -1 ileri, +1 geri. */}
      <PistonPill
        piston="upper" title="ÜST" value={upper.positionMm} speed={speed} locked={locked}
        topDir={-1} topArrow={-90} bottomDir={1} bottomArrow={90}
        cls={styles.pUpper}
      />
      <PistonPill
        piston="lower" title="ALT" value={lower.positionMm} speed={speed} locked={locked}
        topDir={-1} topArrow={-90} bottomDir={1} bottomArrow={90}
        cls={styles.pLower}
      />
      <PistonPill
        piston="left" title="SOL" value={left.positionMm} speed={speed} locked={locked}
        topDir={-1} topArrow={-90} bottomDir={1} bottomArrow={90}
        cls={styles.pLeft}
      />
      <PistonPill
        piston="right" title="SAĞ" value={right.positionMm} speed={speed} locked={locked}
        topDir={-1} topArrow={-90} bottomDir={1} bottomArrow={90}
        cls={styles.pRight}
      />

      {/* ── Hidrolik motor START / STOP ───────────── */}
      <button
        type="button"
        className={`${styles.motorBtn} ${styles.start}`}
        data-running={motorRunning || undefined}
        disabled={locked || motorBusy || motorRunning || motorStarting}
        onClick={() => void setMotor(true)}
        aria-label="Hidrolik motoru başlat"
      >
        <span className={styles.motorText}>START</span>
        <span className={styles.motorSub}>
          {motorRunning ? 'MOTOR ÇALIŞIYOR' : motorStarting ? 'BAŞLIYOR…' : 'HİDROLİK MOTOR'}
        </span>
      </button>
      <button
        type="button"
        className={`${styles.motorBtn} ${styles.stop}`}
        disabled={motorBusy}
        onClick={() => void setMotor(false)}
        aria-label="Hidrolik motoru durdur"
      >
        <span className={styles.motorText}>STOP</span>
        <span className={styles.motorSub}>HİDROLİK MOTOR</span>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function Arrow({ deg }: { deg: number }) {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" style={{ transform: `rotate(${deg}deg)` }} aria-hidden>
      <path d="M3 12h14M12 6l7 6-7 6" fill="none" stroke="currentColor" strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface SideBtnProps {
  side: SideSupportSide
  type: SideSupportType
  dir: 1 | -1
  arrow: number
  label?: string
  cls: string
}

function SideBtn({ side, type, dir, arrow, label, cls }: SideBtnProps) {
  const onStart = useCallback(() => {
    void window.corventa.machine.sideSupportControl({ side, type, direction: dir }).catch(() => {})
  }, [side, type, dir])
  const onStop = useCallback(() => {
    void window.corventa.machine.sideSupportControl({ side, type, direction: 0 }).catch(() => {})
  }, [side, type])
  const { pressed, handlers } = useHoldAction(onStart, onStop, false)

  return (
    <div className={`${styles.sideWrap} ${cls}`}>
      <button
        type="button"
        className={styles.sideBtn}
        data-pressed={pressed || undefined}
        aria-label={`${side === 'left' ? 'Sol' : 'Sağ'} ${type} ${dir === 1 ? 'ileri' : 'geri'}`}
        {...handlers}
      >
        <Arrow deg={arrow} />
      </button>
      {label && <span className={styles.sideLabel}>{label}</span>}
    </div>
  )
}

interface RotationBtnProps {
  dir: 1 | -1
  speed: number
  locked: boolean
  cls: string
  label: string
}

function RotationBtn({ dir, speed, locked, cls, label }: RotationBtnProps) {
  const onStart = useCallback(() => {
    void window.corventa.machine.rotationJog({ direction: dir, speedPercent: speed }).catch(() => {})
  }, [dir, speed])
  const onStop = useCallback(() => {
    void window.corventa.machine.rotationStop().catch(() => {})
  }, [])
  const { pressed, handlers } = useHoldAction(onStart, onStop, locked)

  return (
    <button
      type="button"
      className={`${styles.rotBtn} ${cls}`}
      data-pressed={pressed || undefined}
      disabled={locked}
      aria-label={label}
      {...handlers}
    >
      <svg className={styles.rotIcon} viewBox="0 0 100 100" aria-hidden
        style={dir === -1 ? { transform: 'scaleX(-1)' } : undefined}>
        {/* 270° yay: sağdan başlar, saat yönünde döner, tepede sağa bakan ok ucu */}
        <path d="M82 50 A32 32 0 1 1 46 18" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <polygon points="44,4 66,18 44,32" fill="currentColor" />
      </svg>
      <span className={styles.rotLabel}>{dir === 1 ? 'CW' : 'CCW'}</span>
    </button>
  )
}

interface PistonPillProps {
  piston: PistonName
  title: string
  value: number
  speed: number
  locked: boolean
  topDir: 1 | -1
  topArrow: number
  bottomDir: 1 | -1
  bottomArrow: number
  cls: string
}

function PistonPill(p: PistonPillProps) {
  return (
    <div className={`${styles.pill} ${p.cls}`}>
      <PistonHalf piston={p.piston} dir={p.topDir} arrow={p.topArrow} speed={p.speed} locked={p.locked} pos="top" />
      <div className={styles.pillMid}>
        <span className={styles.pillTitle}>{p.title}</span>
        <span className={styles.pillValue}>{p.value.toFixed(1)}</span>
      </div>
      <PistonHalf piston={p.piston} dir={p.bottomDir} arrow={p.bottomArrow} speed={p.speed} locked={p.locked} pos="bottom" />
    </div>
  )
}

interface PistonHalfProps {
  piston: PistonName
  dir: 1 | -1
  arrow: number
  speed: number
  locked: boolean
  pos: 'top' | 'bottom'
}

function PistonHalf({ piston, dir, arrow, speed, locked, pos }: PistonHalfProps) {
  // Backend polaritesi: direction=-1 ileri (parçaya), +1 geri (BendingBallsPanel ile aynı)
  const onStart = useCallback(() => {
    void window.corventa.machine.pistonJog({ piston, direction: dir, speedPercent: speed }).catch(() => {})
  }, [piston, dir, speed])
  const onStop = useCallback(() => {
    void window.corventa.machine.pistonStop(piston).catch(() => {})
  }, [piston])
  const { pressed, handlers } = useHoldAction(onStart, onStop, locked)

  return (
    <button
      type="button"
      className={styles.pillHalf}
      data-pos={pos}
      data-pressed={pressed || undefined}
      disabled={locked}
      aria-label={`${piston} ${dir === -1 ? 'ileri' : 'geri'}`}
      {...handlers}
    >
      <Arrow deg={arrow} />
    </button>
  )
}
