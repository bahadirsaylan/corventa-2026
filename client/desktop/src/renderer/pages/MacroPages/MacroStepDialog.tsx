// EXCEL 28 — makro adımı ekle / düzenle: eksen + tip + değer + hız.
// Rotasyonda KONUM (mutlak) veya MESAFE (işaretli, + = encoder artar); pnömatikte hız yok.

import { useState } from 'react'

import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import { AXIS_LABELS, readAxisValue, roundAxisValue, STEP_TYPE_LABELS } from '@/services/macroAxes'
import { useMachineStateStore } from '@/stores/machineStateStore'
import {
  allowedStepTypes,
  isPneumaticAxis,
  MACRO_AXES,
  type MacroAxis,
  type MacroStep,
  type MacroStepType,
} from '@shared/types'
import styles from './Macro.module.css'

interface Props {
  title: string
  initial: MacroStep | null
  defaultSpeed: number
  onSave: (step: MacroStep) => void
  onClose: () => void
}

export default function MacroStepDialog({ title, initial, defaultSpeed, onSave, onClose }: Props) {
  const t = useT()
  const [axis, setAxis] = useState<MacroAxis>(initial?.axis ?? 'Left')
  const [stepType, setStepType] = useState<MacroStepType>(initial?.stepType ?? 'Position')
  const [value, setValue] = useState<string>(initial ? String(initial.value) : '')
  const [speed, setSpeed] = useState<string>(String(initial?.speedPercent || defaultSpeed))
  const [numpad, setNumpad] = useState<'value' | 'speed' | null>(null)

  const pneumatic = isPneumaticAxis(axis)
  const types = allowedStepTypes(axis)

  function selectAxis(a: MacroAxis) {
    setAxis(a)
    const allowed = allowedStepTypes(a)
    if (!allowed.includes(stepType)) setStepType(allowed[0])
  }

  /** Eksenin şu anki gerçek değerini al (KONUM / pnömatik) */
  function takeCurrent() {
    const v = readAxisValue(useMachineStateStore.getState().state, axis)
    setValue(String(roundAxisValue(axis, v)))
  }

  const num = parseFloat(value)
  const spd = Math.round(parseFloat(speed))
  const valueOk = Number.isFinite(num) && (stepType !== 'Distance' || Math.abs(num) >= 1)
  const speedOk = pneumatic || (Number.isFinite(spd) && spd >= 1 && spd <= 100)

  function handleSave() {
    if (!valueOk || !speedOk) return
    onSave({
      axis,
      stepType,
      value: roundAxisValue(axis, num),
      speedPercent: pneumatic ? 0 : spd,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{t(title)}</h3>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t('EKSEN')}</span>
          <div className={styles.choiceGrid}>
            {MACRO_AXES.map((a) => (
              <button
                key={a}
                className={`${styles.choiceBtn} ${axis === a ? styles.choiceActive : ''}`}
                onClick={() => selectAxis(a)}
              >
                {t(AXIS_LABELS[a])}
              </button>
            ))}
          </div>
        </div>

        {types.length > 1 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>{t('ADIM TİPİ')}</span>
            <div className={styles.choiceGrid}>
              {types.map((ty) => (
                <button
                  key={ty}
                  className={`${styles.choiceBtn} ${stepType === ty ? styles.choiceActive : ''}`}
                  onClick={() => setStepType(ty)}
                >
                  {t(STEP_TYPE_LABELS[ty])}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <span className={styles.sectionLabel}>
            {stepType === 'Distance'
              ? t('MESAFE (mm) — + ENCODER ARTAR / − AZALIR')
              : pneumatic
                ? t('HEDEF PNÖMATİK DEĞERİ')
                : t('HEDEF KONUM (mm)')}
          </span>
          <button className={`${styles.fieldBtn} ${styles.fieldNum}`} onClick={() => setNumpad('value')}>
            {value || <span className={styles.placeholder}>0</span>}
          </button>
          {stepType !== 'Distance' && (
            <button className={styles.recordBtn} onClick={takeCurrent}>
              {t('ŞU ANKİ DEĞERİ AL')}
            </button>
          )}
        </div>

        {!pneumatic && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>{t('HIZ (%)')}</span>
            <button className={`${styles.fieldBtn} ${styles.fieldNum}`} onClick={() => setNumpad('speed')}>
              {speed || <span className={styles.placeholder}>—</span>}
            </button>
          </div>
        )}

        {!speedOk && <div className={styles.modalError}>{t('HIZ 1-100 % ARASI OLMALI')}</div>}

        <div className={styles.modalActions}>
          <button className={`${styles.modalBtn} ${styles.modalCancel}`} onClick={onClose}>
            {t('VAZGEÇ')}
          </button>
          <button
            className={`${styles.modalBtn} ${styles.modalConfirm}`}
            disabled={!valueOk || !speedOk}
            onClick={handleSave}
          >
            {t('TAMAM')}
          </button>
        </div>

        {numpad === 'value' && (
          <NumpadModal
            fieldLabel={stepType === 'Pneumatic' ? t('DEĞER') : 'mm'}
            initialValue={value}
            allowNegative={!pneumatic}
            onConfirm={setValue}
            onClose={() => setNumpad(null)}
          />
        )}
        {numpad === 'speed' && (
          <NumpadModal
            fieldLabel="%"
            initialValue={speed}
            onConfirm={setSpeed}
            onClose={() => setNumpad(null)}
          />
        )}
      </div>
    </div>
  )
}
