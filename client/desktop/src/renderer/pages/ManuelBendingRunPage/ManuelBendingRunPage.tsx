// SEKIL-26: Manuel Bending çalışma ekranı — operatör kıvrım sırasında 4 piston'u
// + / - ile manuel ileri/geri alır, rotasyonu CW/CCW jog'lar, yan dayamaları
// ileri/geri ittirir, hızı ayarlar. Tüm komutlar IPC üzerinden Engine API'ye gider.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { usePiston } from '@/hooks/useMachineState'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useManuelProgramsStore } from '@/stores/manuelProgramsStore'
import { MachineMode, type PistonName, type PneumaticSide } from '@shared/types'
import ManuelHeader from '../ManuelBendingPage/ManuelHeader'
import JogBall from './JogBall'
import RotationControl from './RotationControl'
import SideSupport from './SideSupport'
import styles from './ManuelBendingRunPage.module.css'

// Manuel komutlar için güvenli başlangıç hızı — operatör fazla mı az mı diye
// karar vermeden ekran açılır açılmaz tam gaz piston göndermek istemiyoruz.
const DEFAULT_SPEED_PERCENT = 20

export default function ManuelBendingRunPage() {
  const { programNo: rawNo } = useParams<{ programNo: string }>()
  const programNo = rawNo ? decodeURIComponent(rawNo) : null
  const program = useManuelProgramsStore((s) =>
    programNo ? s.programs.find((p) => p.programNo === programNo) ?? null : null,
  )

  const top = usePiston('upperPiston')
  const left = usePiston('leftPiston')
  const right = usePiston('rightPiston')
  const bottom = usePiston('lowerPiston')
  const pressure = useMachineStateStore((s) => s.state.sensors.s1PressureBar)
  const leftPneu = useMachineStateStore((s) => s.state.leftPneumatic)
  const rightPneu = useMachineStateStore((s) => s.state.rightPneumatic)
  const rotation = useMachineStateStore((s) => s.state.rotation)
  const machineMode = useMachineStateStore((s) => s.state.mode)
  const motorState = useMachineStateStore((s) => s.state.hydraulicMotorState)

  const [speedPercent, setSpeedPercent] = useState(DEFAULT_SPEED_PERCENT)
  const [autoSideSupport, setAutoSideSupport] = useState(true)

  // Sayfaya girer girmez backend'i Manuel mod'a al — operatör panelden mode
  // ayarlamayı unutursa SemiAuto/Auto'da kalır ve manuel jog komutları
  // bekleme/koruma yüzünden reddedilebilir.
  useEffect(() => {
    void window.corventa.machine.setMode(MachineMode.Manual)
  }, [])

  const motorReady = motorState === 2
  const inManualMode = machineMode === MachineMode.Manual
  const canControl = motorReady && inManualMode

  // Disable nedenini operatöre net göstermek için tek satır mesaj.
  let blockReason: string | null = null
  if (!motorReady) {
    blockReason = 'HİDROLİK MOTOR HAZIR DEĞİL — BAŞLATMADAN HAREKET YAPILAMAZ'
  } else if (!inManualMode) {
    blockReason = 'MAKİNE MANUEL MOD\'DA DEĞİL — KOMUTLAR REDDEDİLİR'
  }

  function handlePistonJog(piston: PistonName, direction: 1 | -1) {
    if (!canControl) return
    void window.corventa.machine.pistonJog({ piston, direction, speedPercent })
  }
  function handlePistonStop(piston: PistonName) {
    void window.corventa.machine.pistonStop(piston)
  }
  function handleRotationJog(direction: 1 | -1) {
    if (!canControl) return
    void window.corventa.machine.rotationJog({ direction, speedPercent })
  }
  function handleRotationStop() {
    void window.corventa.machine.rotationStop()
  }
  function handlePneumaticJog(side: PneumaticSide, direction: 1 | -1) {
    if (!canControl) return
    void window.corventa.machine.pneumaticControl({ side, direction })
  }
  function handlePneumaticStop(side: PneumaticSide) {
    void window.corventa.machine.pneumaticStop(side)
  }

  return (
    <div className={styles.page}>
      <ManuelHeader subtitle={programNo ?? undefined} />

      <div className={styles.content}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>PRESSURE</span>
          <span className={styles.statValue}>{pressure}</span>
          <span className={styles.statUnit}>BAR</span>
          <span className={styles.spacer} />
          <span className={styles.statLabel}>TOLERANCE</span>
          <span className={styles.statValue}>0.1</span>
          <span className={styles.statUnit}>mm</span>
        </div>

        {blockReason && <div className={styles.blockBanner}>{blockReason}</div>}

        <div className={`${styles.body} ${!canControl ? styles.bodyDisabled : ''}`}>
          {/* Sol yan dayama */}
          <SideSupport
            position={leftPneu.encoderPosition}
            angleDeg={20}
            side="left"
            active={leftPneu.activeDirection !== 0}
            onForward={() => handlePneumaticJog('left', 1)}
            onBackward={() => handlePneumaticJog('left', -1)}
            onRelease={() => handlePneumaticStop('left')}
          />

          {/* Pistonlar */}
          <div className={styles.pistonGrid}>
            <div className={styles.topRow}>
              <JogBall
                value={top.positionMm}
                onPlus={() => handlePistonJog('upper', -1)}
                onMinus={() => handlePistonJog('upper', 1)}
                onRelease={() => handlePistonStop('upper')}
                active={top.moving}
              />
            </div>

            <div className={styles.bottomRow}>
              <JogBall
                value={left.positionMm}
                onPlus={() => handlePistonJog('left', -1)}
                onMinus={() => handlePistonJog('left', 1)}
                onRelease={() => handlePistonStop('left')}
                active={left.moving}
              />
              <JogBall
                value={bottom.positionMm}
                onPlus={() => handlePistonJog('lower', -1)}
                onMinus={() => handlePistonJog('lower', 1)}
                onRelease={() => handlePistonStop('lower')}
                active={bottom.moving}
              />
              <JogBall
                value={right.positionMm}
                onPlus={() => handlePistonJog('right', -1)}
                onMinus={() => handlePistonJog('right', 1)}
                onRelease={() => handlePistonStop('right')}
                active={right.moving}
              />
            </div>

            {/* R label */}
            <div className={styles.rLabel}>R {program?.geometricDiameterMm || '—'}</div>
          </div>

          {/* Sağ yan dayama */}
          <SideSupport
            position={rightPneu.encoderPosition}
            angleDeg={17}
            side="right"
            active={rightPneu.activeDirection !== 0}
            onForward={() => handlePneumaticJog('right', 1)}
            onBackward={() => handlePneumaticJog('right', -1)}
            onRelease={() => handlePneumaticStop('right')}
          />
        </div>

        <div className={styles.footer}>
          <div className={styles.footerCol}>
            <p className={styles.speedText}>
              KIVRIM HIZI <span className={styles.speedValue}>{speedPercent}</span> %
            </p>
            <div className={styles.speedControls}>
              <button
                className={styles.speedBtn}
                onClick={() => setSpeedPercent((s) => Math.max(0, s - 10))}
              >
                −
              </button>
              <button
                className={styles.speedBtn}
                onClick={() => setSpeedPercent((s) => Math.min(100, s + 10))}
              >
                +
              </button>
            </div>
            <button
              className={`${styles.toggleBtn} ${autoSideSupport ? styles.toggleActive : ''}`}
              onClick={() => setAutoSideSupport((v) => !v)}
            >
              YAN DAYAMALARI OTOMATİK KULLAN
            </button>
          </div>

          <div className={styles.footerColCenter}>
            <RotationControl
              positionMm={rotation.positionMm}
              activeDirection={rotation.activeDirection}
              onJog={handleRotationJog}
              onRelease={handleRotationStop}
            />
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerLabel}>{program?.name ?? '—'}</span>
            <span className={styles.footerSubtle}>PARÇANIN GERÇEK ÇAPINI ÖLÇÜNÜZ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
