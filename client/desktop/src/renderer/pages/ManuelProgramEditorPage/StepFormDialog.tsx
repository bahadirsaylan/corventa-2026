// Step ekleme/düzenleme dialog'u — komut türü + mesafe + opsiyonel basınç.

import { useState } from 'react'

import NumpadModal from '@/components/NumpadModal/NumpadModal'
import type { ManuelProgramStep, ManuelStepCommand } from '@shared/types'
import styles from './StepFormDialog.module.css'

const COMMANDS: { id: ManuelStepCommand; label: string; hint: string }[] = [
  { id: 'A', label: 'A', hint: 'Profil 1. kenar' },
  { id: 'B', label: 'B', hint: 'Profil 2. kenar' },
  { id: 'S', label: 'S', hint: 'Step (mesafe)' },
  { id: 'X', label: 'X', hint: 'Yatay piston' },
  { id: 'Y', label: 'Y', hint: 'Dikey piston' },
]

interface Props {
  mode: 'edit' | 'insert' | 'append'
  initialStep: ManuelProgramStep | null
  onSave: (step: ManuelProgramStep) => void
  onClose: () => void
}

export default function StepFormDialog({ mode, initialStep, onSave, onClose }: Props) {
  const [command, setCommand] = useState<ManuelStepCommand>(initialStep?.command ?? 'S')
  const [distance, setDistance] = useState<string>(
    initialStep ? String(initialStep.distanceMm) : '',
  )
  const [pressure, setPressure] = useState<string>(
    initialStep?.pressureBar != null ? String(initialStep.pressureBar) : '',
  )
  const [numpad, setNumpad] = useState<'distance' | 'pressure' | null>(null)

  function handleSave() {
    const distanceMm = parseFloat(distance)
    if (!Number.isFinite(distanceMm)) return
    const pressureBar = pressure ? parseFloat(pressure) : null
    onSave({
      stepNo: initialStep?.stepNo ?? 0,
      command,
      distanceMm,
      pressureBar: Number.isFinite(pressureBar as number) ? (pressureBar as number) : null,
      modifiedAt: new Date().toISOString(),
    })
  }

  const titleByMode = {
    edit: 'SATIRI DÜZENLE',
    insert: 'YENİ SATIR EKLE',
    append: 'YENİ SATIR EKLE',
  }[mode]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{titleByMode}</h3>

        {/* Command selector */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>KOMUT</span>
          <div className={styles.commandGrid}>
            {COMMANDS.map((c) => (
              <button
                key={c.id}
                className={`${styles.cmdBtn} ${command === c.id ? styles.cmdActive : ''}`}
                onClick={() => setCommand(c.id)}
              >
                <span className={styles.cmdLabel}>{c.label}</span>
                <span className={styles.cmdHint}>{c.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>MESAFE (mm)</span>
          <button className={styles.fieldBtn} onClick={() => setNumpad('distance')}>
            {distance || <span className={styles.placeholder}>0</span>}
          </button>
        </div>

        {/* Pressure (optional) */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>BASINÇ (bar) — opsiyonel</span>
          <button className={styles.fieldBtn} onClick={() => setNumpad('pressure')}>
            {pressure || <span className={styles.placeholder}>—</span>}
          </button>
        </div>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.cancel}`} onClick={onClose}>
            VAZGEÇ
          </button>
          <button
            className={`${styles.actionBtn} ${styles.confirm}`}
            disabled={!distance}
            onClick={handleSave}
          >
            KAYDET
          </button>
        </div>

        {numpad === 'distance' && (
          <NumpadModal
            fieldLabel="mm"
            initialValue={distance}
            onConfirm={setDistance}
            onClose={() => setNumpad(null)}
          />
        )}
        {numpad === 'pressure' && (
          <NumpadModal
            fieldLabel="bar"
            initialValue={pressure}
            onConfirm={setPressure}
            onClose={() => setNumpad(null)}
          />
        )}
      </div>
    </div>
  )
}
