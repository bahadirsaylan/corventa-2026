// Ayarlar > Varsayılan Hız — piston/rotasyon/pnömatik default hız değerleri.
// Manual jog + otomatik büküm için default hızlar. Backend: MachineSettings.DefaultXxxSpeedPercent.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './DefaultSpeedsPage.module.css'

interface SpeedField {
  key: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  desc: string
}

const FIELDS: SpeedField[] = [
  { key: 'pistonManuel', label: 'PİSTON MANUEL JOG',    unit: '%',         min: 5, max: 100, step: 5,  desc: 'Manuel modda piston jog hızı (%2V karşılığı)' },
  { key: 'pistonAuto',   label: 'PİSTON OTOMATİK',       unit: '%',         min: 20, max: 100, step: 5, desc: 'Otomatik büküm sırasında piston pozisyona geçme hızı' },
  { key: 'rotationManuel',label: 'ROTASYON MANUEL JOG', unit: '%',         min: 5, max: 100, step: 5,  desc: 'Manuel modda rotasyon jog hızı' },
  { key: 'rotationAuto', label: 'ROTASYON KIVRIM',       unit: 'm/dk',      min: 1, max: 12, step: 1,   desc: 'Otomatik büküm kıvrım hızı (metre/dakika)' },
  { key: 'pneumatic',    label: 'PNÖMATİK',              unit: '%',         min: 20, max: 100, step: 5, desc: 'Pnömatik uzat/geri çek hızı' },
  { key: 'clampSpeed',   label: 'PARÇA SIKIŞTIRMA',      unit: '%',         min: 10, max: 60, step: 5,  desc: 'Üst piston clamp hızı (yumuşak temas için düşük)' },
]

const INITIAL: Record<string, number> = {
  pistonManuel: 30, pistonAuto: 80, rotationManuel: 40, rotationAuto: 6, pneumatic: 60, clampSpeed: 30,
}

export default function DefaultSpeedsPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, number>>(INITIAL)

  function update(k: string, v: number) {
    setValues((prev) => ({ ...prev, [k]: v }))
  }

  function reset() {
    setValues(INITIAL)
  }

  function save() {
    alert('Kaydedildi (mock) — DataApi MachineSettings.DefaultXxxSpeedPercent güncellenecek.')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>VARSAYILAN HIZ</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>MOTOR / VALS / PNÖMATİK HIZLARI</div>
          <div className={styles.fieldsGrid}>
            {FIELDS.map((f) => (
              <SpeedRow
                key={f.key}
                field={f}
                value={values[f.key]}
                onChange={(v) => update(f.key, v)}
              />
            ))}
          </div>
        </div>

        <div className={styles.footerRow}>
          <button className={styles.resetBtn} onClick={reset}>VARSAYILANA DÖN</button>
          <button className={styles.saveBtn} onClick={save}>KAYDET</button>
          <p className={styles.note}>
            Bu değerler operatörün ekranda değiştirebileceği başlangıç hızlarıdır. Otomatik büküm
            sırasında iş kartındaki hız (varsa) bunu geçersiz kılar.
          </p>
        </div>
      </div>
    </div>
  )
}

function SpeedRow({
  field, value, onChange,
}: { field: SpeedField; value: number; onChange: (v: number) => void }) {
  return (
    <div className={styles.speedRow}>
      <div className={styles.speedInfo}>
        <span className={styles.speedLabel}>{field.label}</span>
        <span className={styles.speedDesc}>{field.desc}</span>
      </div>
      <div className={styles.sliderBlock}>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.valueDisplay}>
          <input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles.numInput}
          />
          <span className={styles.unit}>{field.unit}</span>
        </div>
      </div>
    </div>
  )
}
