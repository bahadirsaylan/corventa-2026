// Yan dayama kontrol paneli — vals topları grid'inin sol/sağ yanında.
// Basılı-tut pattern (pointerdown→forward/backward, pointerup/leave/cancel→stop).
// Pointer events kullanılıyor ki hem mouse hem endüstriyel touch screen aynı yolla çalışsın.

import { useCallback, useRef } from 'react'

import type { SideSupportSide, SideSupportType } from '@shared/types'
import styles from './SideSupportControls.module.css'

interface SideSupportControlsProps {
  side: SideSupportSide
}

interface RowConfig {
  type: SideSupportType
  label: string
}

const ROWS: RowConfig[] = [
  { type: 'joint', label: 'JOINT' },
  { type: 'body', label: 'BODY' },
  { type: 'reel', label: 'REEL' },
]

export default function SideSupportControls({ side }: SideSupportControlsProps) {
  return (
    <div className={styles.panel} data-side={side}>
      {ROWS.map((row) => (
        <SideSupportRow key={row.type} side={side} type={row.type} label={row.label} />
      ))}
    </div>
  )
}

interface SideSupportRowProps {
  side: SideSupportSide
  type: SideSupportType
  label: string
}

function SideSupportRow({ side, type, label }: SideSupportRowProps) {
  // "İleri" hep iş parçasına doğru — sol panelde ok sağa, sağ panelde ok sola.
  const forwardArrow = side === 'left' ? '▶' : '◀'
  const backwardArrow = side === 'left' ? '◀' : '▶'

  // İleri buton sol panelde sağda, sağ panelde solda (ok yönüne uygun).
  const forwardBtn = <HoldButton side={side} type={type} direction={1} label="İLERİ" arrow={forwardArrow} arrowSide="right" />
  const backwardBtn = <HoldButton side={side} type={type} direction={-1} label="GERİ" arrow={backwardArrow} arrowSide="left" />

  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{label}</div>
      <div className={styles.buttonRow}>
        {side === 'left' ? (
          <>
            {backwardBtn}
            {forwardBtn}
          </>
        ) : (
          <>
            {forwardBtn}
            {backwardBtn}
          </>
        )}
      </div>
    </div>
  )
}

interface HoldButtonProps {
  side: SideSupportSide
  type: SideSupportType
  direction: 1 | -1
  label: string
  arrow: string
  arrowSide: 'left' | 'right'
}

function HoldButton({ side, type, direction, label, arrow, arrowSide }: HoldButtonProps) {
  // pointer'ın aktif olup olmadığını takip et — start çağrıldıysa mutlaka stop çağrılsın.
  // Aksi halde network gecikmesi + hızlı pointer down/up race'inde stop asla gitmeyebilir.
  const activeRef = useRef(false)

  const start = useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true
    void window.corventa.machine.sideSupportControl({ side, type, direction }).catch(() => {
      // Backend hata verirse UI'da state yok — bir sonraki tıklamada tekrar denenir.
    })
  }, [side, type, direction])

  const stop = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    void window.corventa.machine.sideSupportControl({ side, type, direction: 0 }).catch(() => {})
  }, [side, type])

  return (
    <button
      type="button"
      className={styles.holdBtn}
      data-direction={direction === 1 ? 'forward' : 'backward'}
      onPointerDown={(e) => {
        e.preventDefault()
        // pointer capture → pointer düğmesi buton dışına kaysa bile up event'i alırız
        e.currentTarget.setPointerCapture(e.pointerId)
        start()
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        stop()
      }}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {arrowSide === 'left' && <span className={styles.arrow}>{arrow}</span>}
      <span className={styles.btnLabel}>{label}</span>
      {arrowSide === 'right' && <span className={styles.arrow}>{arrow}</span>}
    </button>
  )
}
