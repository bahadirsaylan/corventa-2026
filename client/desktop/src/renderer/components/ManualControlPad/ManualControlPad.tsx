// Orta alan manuel tuş takımı — makinenin fiziksel yerleşimini taklit eder
// (referans: Corventa_ManuelControl.jpg). Tüm komutlar mevcut, test edilmiş IPC'leri kullanır:
//   piston jog/stop, rotasyon jog/stop, yan dayama, hidrolik motor aç/kapat.
//
// Otomatik büküm aktifken: piston + rotasyon + hız + START kilitli.
// Yan dayamalar her zaman serbest (Serpantin'de operatör büküm sırasında ayar yapıyor).
// STOP her zaman açık — operatör motoru her an kesebilmeli.
//
// Usta öğrenme (makro) kaydı (2026-11-01): kayıt açıkken piston + rotasyon tuşları noteMotion ile
// kayıt store'una bildirilir (ayrı kayıt ekranı kaldırıldı). Yan dayama tuşları kayda girmez.
//
// Hedef gönderme (2026-11-19): piston hapındaki değere (ÜST 0.0 …) dokununca PistonTargetModal açılır —
// KONUMA GİT (mm) / BASINÇLA İT (bar). Tuş takımına yeni bölüm eklenmedi; tek iz değerin noktalı alt çizgisi.
//
// Yan dayama tuş eşleşmesi (2026-11-20 öğleden sonra, kullanıcı makinede doğruladı): dikey çift = MAKARA, yatay çift = MAFSAL,
//   eğik çift = GÖVDE — PLC adlarıyla aynı (sabahki ters eşleme geri alındı; tuşların sürdüğü silindir hiç değişmedi).
// Hız (2026-11-20): üstteki kutu ROTASYON HIZI, tuş takımının altındaki kutu PİSTON (hareket) HIZI — ayrı ayrı.
// Yan dayama konumu (2026-11-20): etiketteki cetvel değerine dokununca SideSupportTargetModal (KONUMA GÖNDER).

import { memo, useCallback, useState } from 'react'

import type { PistonName, SideSupportSide, SideSupportType } from '@shared/types'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import { useHoldAction } from './useHoldAction'
import { readManualRotationSpeed, readManualSpeed } from '@/services/operatorPrefs'
import { pistonAxis } from '@/services/macroAxes'
import { useMacroRecorderStore } from '@/stores/macroRecorderStore'
import PistonTargetModal from './PistonTargetModal'
import SideSupportTargetModal from './SideSupportTargetModal'
import { sideRulerKey } from '@shared/sideRulers'
import styles from './ManualControlPad.module.css'

const SPEED_STEP = 5
const SPEED_MIN = 5
const SPEED_MAX = 100

// GEÇİCİ (2026-10-14, kullanıcı isteği): büküm sırasında tuş takımı KİLİTLENMİYOR.
// Tekrar kilitlemek için true yap — kilit rozeti + disabled davranışı geri gelir.
const LOCK_DURING_BENDING = false

function ManualControlPad() {
  const bendingActive = useBendingActive()
  const locked = LOCK_DURING_BENDING && bendingActive
  const t = useT()
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)
  const [speed, setSpeed] = useState(readManualSpeed) // piston (hareket) hızı
  const [rotSpeed, setRotSpeed] = useState(readManualRotationSpeed)
  const [motorBusy, setMotorBusy] = useState(false)
  const [targetPiston, setTargetPiston] = useState<PistonName | null>(null)
  const [sideTarget, setSideTarget] = useState<{ side: SideSupportSide; type: SideSupportType } | null>(null)

  // Sadece pozisyon (primitive) dinlenir — piston nesnesinin tamamı her SignalR tick'inde (10 Hz)
  // yeni referans olduğundan tüm tuş takımını boşuna yeniden çizdiriyordu.
  const upperPos = useMachineStateStore((s) => s.state.upperPiston.positionMm)
  const lowerPos = useMachineStateStore((s) => s.state.lowerPiston.positionMm)
  const leftPos = useMachineStateStore((s) => s.state.leftPiston.positionMm)
  const rightPos = useMachineStateStore((s) => s.state.rightPiston.positionMm)

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
          {t('BÜKÜM AKTİF — PİSTON VE ROTASYON KİLİTLİ · YAN DAYAMALAR SERBEST')}
        </div>
      )}

      {/* ── Sol yan dayamalar ─────────────────────── */}
      <SideBtn side="left" type="reel" dir={1} arrow={-90} label={t('MAKARA')} cls={styles.lReelFwd} onOpenTarget={setSideTarget} />
      <SideBtn side="left" type="reel" dir={-1} arrow={90} cls={styles.lReelBwd} />
      <div className={`${styles.link} ${styles.lReelLink}`} />

      <SideBtn side="left" type="joint" dir={-1} arrow={180} label={t('MAFSAL')} cls={styles.lJointBwd} onOpenTarget={setSideTarget} />
      <SideBtn side="left" type="joint" dir={1} arrow={0} cls={styles.lJointFwd} />
      <div className={`${styles.link} ${styles.lJointLink}`} />

      <SideBtn side="left" type="body" dir={1} arrow={-70} label={t('GÖVDE')} cls={styles.lBodyFwd} onOpenTarget={setSideTarget} />
      <SideBtn side="left" type="body" dir={-1} arrow={110} cls={styles.lBodyBwd} />
      <div className={`${styles.link} ${styles.lBodyLink}`} />

      {/* ── Sağ yan dayamalar (ayna) ──────────────── */}
      <SideBtn side="right" type="reel" dir={1} arrow={-90} label={t('MAKARA')} cls={styles.rReelFwd} onOpenTarget={setSideTarget} />
      <SideBtn side="right" type="reel" dir={-1} arrow={90} cls={styles.rReelBwd} />
      <div className={`${styles.link} ${styles.rReelLink}`} />

      <SideBtn side="right" type="joint" dir={1} arrow={180} cls={styles.rJointFwd} />
      <SideBtn side="right" type="joint" dir={-1} arrow={0} label={t('MAFSAL')} cls={styles.rJointBwd} onOpenTarget={setSideTarget} />
      <div className={`${styles.link} ${styles.rJointLink}`} />

      <SideBtn side="right" type="body" dir={1} arrow={-110} label={t('GÖVDE')} cls={styles.rBodyFwd} onOpenTarget={setSideTarget} />
      <SideBtn side="right" type="body" dir={-1} arrow={70} cls={styles.rBodyBwd} />
      <div className={`${styles.link} ${styles.rBodyLink}`} />

      {/* ── Hız − / + : üstte ROTASYON, altta PİSTON (2026-11-20) ── */}
      <SpeedBox value={rotSpeed} onChange={setRotSpeed} label={t('ROTASYON HIZI')} cls={styles.speedTop} locked={locked} />
      <SpeedBox value={speed} onChange={setSpeed} label={t('PİSTON HIZI')} cls={styles.speedBottom} locked={locked} />

      {/* ── Rotasyon ──────────────────────────────── */}
      <RotationBtn dir={1} speed={rotSpeed} locked={locked} cls={styles.rotCw} label="ROTASYON CW" />
      <RotationBtn dir={-1} speed={rotSpeed} locked={locked} cls={styles.rotCcw} label="ROTASYON CCW" />

      {/* ── Pistonlar ─────────────────────────────── */}
      {/* Backend polaritesi: -1 ileri (parçaya), +1 geri.
          2026-11-02 makine geri bildirimi: ÜST piston doğru (üst ok -1); ALT / SOL / SAĞ ters çalışıyordu
          ("geri tuşu ileri, ileri tuşu geri") → bu üçünde üst ok +1, alt ok -1. */}
      <PistonPill
        piston="upper" title="ÜST" value={upperPos} speed={speed} locked={locked} onOpenTarget={setTargetPiston}
        topDir={-1} topArrow={-90} bottomDir={1} bottomArrow={90}
        cls={styles.pUpper}
      />
      <PistonPill
        piston="lower" title="ALT" value={lowerPos} speed={speed} locked={locked} onOpenTarget={setTargetPiston}
        topDir={1} topArrow={-90} bottomDir={-1} bottomArrow={90}
        cls={styles.pLower}
      />
      <PistonPill
        piston="left" title="SOL" value={leftPos} speed={speed} locked={locked} onOpenTarget={setTargetPiston}
        topDir={1} topArrow={-90} bottomDir={-1} bottomArrow={90}
        cls={styles.pLeft}
      />
      <PistonPill
        piston="right" title="SAĞ" value={rightPos} speed={speed} locked={locked} onOpenTarget={setTargetPiston}
        topDir={1} topArrow={-90} bottomDir={-1} bottomArrow={90}
        cls={styles.pRight}
      />

      {/* ── Hidrolik motor START / STOP ───────────── */}
      <button
        type="button"
        className={`${styles.motorBtn} ${styles.start}`}
        data-running={motorRunning || undefined}
        disabled={locked || motorBusy || motorRunning || motorStarting}
        onClick={() => void setMotor(true)}
        aria-label={t('Hidrolik motoru başlat')}
      >
        <span className={styles.motorText}>{t('ÇALIŞTIR')}</span>
        <span className={styles.motorSub}>
          {motorRunning ? t('MOTOR ÇALIŞIYOR') : motorStarting ? t('BAŞLIYOR…') : t('HİDROLİK MOTOR')}
        </span>
      </button>
      <button
        type="button"
        className={`${styles.motorBtn} ${styles.stop}`}
        disabled={motorBusy}
        onClick={() => void setMotor(false)}
        aria-label={t('Hidrolik motoru durdur')}
      >
        <span className={styles.motorText}>{t('DURDUR')}</span>
        <span className={styles.motorSub}>{t('HİDROLİK MOTOR')}</span>
      </button>

      {targetPiston && !locked && (
        <PistonTargetModal piston={targetPiston} initialSpeed={speed} onClose={() => setTargetPiston(null)} />
      )}
      {sideTarget && (
        <SideSupportTargetModal side={sideTarget.side} type={sideTarget.type} onClose={() => setSideTarget(null)} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

// Yön oku — ortak "next" (ArrowRight) ikonu, deg kadar döndürülür (0 = sağ, -90 = yukarı).
function Arrow({ deg }: { deg: number }) {
  return <Icon name="next" size="xl" className={styles.arrow} style={{ transform: `rotate(${deg}deg)` }} />
}

interface SideBtnProps {
  side: SideSupportSide
  type: SideSupportType
  dir: 1 | -1
  arrow: number
  label?: string
  cls: string
  /** Etiketteki cetvel değerine dokununca KONUMA GÖNDER penceresi (sadece etiketli tuşta) */
  onOpenTarget?: (t: { side: SideSupportSide; type: SideSupportType }) => void
}

function SideBtn({ side, type, dir, arrow, label, cls, onOpenTarget }: SideBtnProps) {
  const t = useT()
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
        aria-label={`${side === 'left' ? t('Sol') : t('Sağ')} ${type} ${dir === 1 ? t('ileri') : t('geri')}`}
        {...handlers}
      >
        <Arrow deg={arrow} />
      </button>
      {label && (
        <span className={styles.sideLabel}>
          {label}
          {/* 2026-11-19 — yan dayama cetveli (ofsetli mm), etiket alanının içinde; yerleşim değişmez */}
          <SideRulerValue side={side} type={type} onOpen={onOpenTarget} />
        </span>
      )}
    </div>
  )
}

/** Yan dayama cetvel değeri (mm, ofset uygulanmış). Cetvel yok / okunamıyor → "—". */
function SideRulerValue({ side, type, onOpen }: {
  side: SideSupportSide
  type: SideSupportType
  onOpen?: (t: { side: SideSupportSide; type: SideSupportType }) => void
}) {
  const key = sideRulerKey(side, type)
  const mm = useMachineStateStore((s) => {
    const r = s.state.sideSupportRulers?.[key]
    return r?.available ? r.mm : null
  })
  // 2026-11-20: konum modundaysa (hareket / hedefte / hata) değer rengiyle gösterilir
  const posState = useMachineStateStore((s) => s.state.sideSupportRulers?.[key]?.positionState ?? -1)
  const text = mm == null ? '—' : mm.toFixed(1)
  if (!onOpen) return <span className={styles.sideValue}>{text}</span>
  return (
    <span
      role="button"
      tabIndex={0}
      className={`${styles.sideValue} ${styles.sideValueBtn}`}
      data-pos={posState > 0 ? posState : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onOpen({ side, type })
      }}
    >
      {text}
    </span>
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
  const t = useT()
  const onStart = useCallback(() => {
    // Usta öğrenme kaydı açıksa hareket bildirilir (kayıt kapalıyken etkisiz)
    useMacroRecorderStore.getState().noteMotion('Rotation', speed)
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
      aria-label={t(label)}
      {...handlers}
    >
      <Icon name={dir === 1 ? 'rotateCw' : 'rotateCcw'} size="hero" className={styles.rotIcon} />
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
  onOpenTarget: (piston: PistonName) => void
}

function PistonPill(p: PistonPillProps) {
  const t = useT()
  return (
    <div className={`${styles.pill} ${p.cls}`}>
      <PistonHalf piston={p.piston} dir={p.topDir} arrow={p.topArrow} speed={p.speed} locked={p.locked} pos="top" />
      {/* Değere dokun → hedef gönder (konum / basınç) */}
      <button
        type="button"
        className={styles.pillMid}
        disabled={p.locked}
        onClick={() => p.onOpenTarget(p.piston)}
        aria-label={t('{name} HEDEF GÖNDER', { name: t(p.title) })}
      >
        <span className={styles.pillTitle}>{t(p.title)}</span>
        <span className={styles.pillValue}>{p.value.toFixed(2)}</span>
      </button>
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
  const t = useT()
  // Backend polaritesi: direction=-1 ileri (parçaya), +1 geri (BendingBallsPanel ile aynı)
  const onStart = useCallback(() => {
    // Usta öğrenme kaydı açıksa hareket bildirilir (kayıt kapalıyken etkisiz)
    useMacroRecorderStore.getState().noteMotion(pistonAxis(piston), speed)
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
      aria-label={`${piston} ${dir === -1 ? t('ileri') : t('geri')}`}
      {...handlers}
    >
      <Arrow deg={arrow} />
    </button>
  )
}

// Prop'suz bileşen — üst panel (ControlPanel) başlık değerleri yüzünden yeniden çizilince tuş takımı çizilmesin.
export default memo(ManualControlPad)

/** Hız − / + kutusu (2026-11-20: rotasyon ve piston ayrı) */
function SpeedBox({ value, onChange, label, cls, locked }: {
  value: number
  onChange: (fn: (v: number) => number) => void
  label: string
  cls: string
  locked: boolean
}) {
  const t = useT()
  return (
    <div className={`${styles.speed} ${cls}`}>
      <button
        type="button"
        className={styles.speedBtn}
        disabled={locked || value <= SPEED_MIN}
        onClick={() => onChange((v) => Math.max(SPEED_MIN, v - SPEED_STEP))}
        aria-label={t('Hızı azalt')}
      >
        <Icon name="minus" size="xl" />
      </button>
      <div className={styles.speedValue}>
        <span className={styles.speedPct}>%{value}</span>
        <span className={styles.speedLabel}>{label}</span>
      </div>
      <button
        type="button"
        className={styles.speedBtn}
        disabled={locked || value >= SPEED_MAX}
        onClick={() => onChange((v) => Math.min(SPEED_MAX, v + SPEED_STEP))}
        aria-label={t('Hızı artır')}
      >
        <Icon name="plus" size="xl" />
      </button>
    </div>
  )
}
