// Yağ + sensör + emniyet durumu — dashboard alt panelinde sürekli görünür.
// Backend MachineState selector'larından beslenir; bağlantı kapalıyken 0 değerleriyle render eder.

import { useSafety, useSensors } from '@/hooks/useMachineState'
import styles from './OilStatsList.module.css'

interface StatRow {
  label: string
  value: string
  ok: boolean
}

// Backend'de henüz mapping olmayan ölçümler için sabit eşikler
const OIL_TEMP_OK_C = 75
const OIL_LEVEL_OK_PERCENT = 30

export default function OilStatsList() {
  const sensors = useSensors()
  const safety = useSafety()

  const partSensorActive = safety.leftPartSensor || safety.rightPartSensor

  const rows: StatRow[] = [
    {
      label: 'YAĞ SICAKLIĞI',
      value: `${sensors.oilTempC}°C`,
      ok: sensors.oilTempC > 0 && sensors.oilTempC < OIL_TEMP_OK_C,
    },
    {
      label: 'YAĞ SEVİYESİ',
      value: sensors.oilLevelPercent >= OIL_LEVEL_OK_PERCENT ? 'NORMAL' : 'DÜŞÜK',
      ok: sensors.oilLevelPercent >= OIL_LEVEL_OK_PERCENT,
    },
    {
      label: 'YAĞ NEMİ',
      value: `%${sensors.oilHumidityPercent}`,
      ok: sensors.oilHumidityPercent < 50,
    },
    {
      label: 'YAĞ BASINCI',
      value: `${sensors.s1PressureBar} bar`,
      ok: sensors.s1PressureBar > 0,
    },
    {
      label: 'AKIŞ S1 / S2',
      value: `${sensors.s1FlowCms} / ${sensors.s2FlowCms}`,
      ok: true,
    },
    {
      label: 'TEMAS SENSÖRÜ',
      value: partSensorActive ? 'AKTİF' : 'PASİF',
      ok: partSensorActive,
    },
    {
      label: 'ACİL DURDURMA',
      value: safety.emergencyStopOK ? 'OK' : 'BASILI',
      ok: safety.emergencyStopOK,
    },
    {
      label: 'MOTOR / FAN',
      value: safety.motorThermalOK && safety.fanThermalOK ? 'FAAL' : 'TERMAL',
      ok: safety.motorThermalOK && safety.fanThermalOK,
    },
  ]

  return (
    <ul className={styles.grid}>
      {rows.map((row) => (
        <li
          key={row.label}
          className={`${styles.box} ${row.ok ? styles.boxOk : styles.boxFail}`}
        >
          <span className={`${styles.icon} ${row.ok ? styles.iconOk : styles.iconFail}`}>
            {row.ok ? '✓' : '✕'}
          </span>
          <span className={styles.label}>{row.label}</span>
          <span className={`${styles.value} ${row.ok ? '' : styles.valueFail}`}>
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
