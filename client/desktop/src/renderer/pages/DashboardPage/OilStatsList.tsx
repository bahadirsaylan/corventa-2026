// Yağ + sensör + emniyet durumu — dashboard alt panelinde sürekli görünür.
// Backend MachineState selector'larından beslenir; bağlantı kapalıyken 0 değerleriyle render eder.

import { memo } from 'react'

import { useSafety, useSensors } from '@/hooks/useMachineState'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './OilStatsList.module.css'

/** ok = yeşil ✓ · fail = kırmızı ✗ (arıza) · idle = gri − (pasif / beklenen durum, arıza değil — 2026-11-02) */
type RowState = 'ok' | 'fail' | 'idle'

interface StatRow {
  label: string
  value: string
  state: RowState
}

const okFail = (ok: boolean): RowState => (ok ? 'ok' : 'fail')

const BOX_CLASS: Record<RowState, string> = { ok: styles.boxOk, fail: styles.boxFail, idle: styles.boxIdle }
const ICON_CLASS: Record<RowState, string> = { ok: styles.iconOk, fail: styles.iconFail, idle: styles.iconIdle }
const ICON_NAME = { ok: 'check', fail: 'close', idle: 'minus' } as const

// Backend'de henüz mapping olmayan ölçümler için sabit eşikler
const OIL_TEMP_OK_C = 75
const OIL_LEVEL_OK_PERCENT = 30

function OilStatsList() {
  const sensors = useSensors()
  const safety = useSafety()
  const t = useT()

  const partSensorActive = safety.leftPartSensor || safety.rightPartSensor
  // Basınç: S2 (sağ + sol vals topları). Motor hazır değilken (0 kapalı, 1 başlıyor) 0 bar beklenir → gri.
  const motorReady = useMachineStateStore((s) => s.state.hydraulicMotorState) === 2
  const pressureBar = sensors.s2PressureBar

  const rows: StatRow[] = [
    {
      label: t('YAĞ SICAKLIĞI'),
      value: `${sensors.oilTempC}°C`,
      state: okFail(sensors.oilTempC > 0 && sensors.oilTempC < OIL_TEMP_OK_C),
    },
    {
      label: t('YAĞ SEVİYESİ'),
      value: sensors.oilLevelPercent >= OIL_LEVEL_OK_PERCENT ? t('NORMAL') : t('DÜŞÜK'),
      state: okFail(sensors.oilLevelPercent >= OIL_LEVEL_OK_PERCENT),
    },
    {
      label: t('YAĞ NEMİ'),
      value: `%${sensors.oilHumidityPercent}`,
      state: okFail(sensors.oilHumidityPercent < 50),
    },
    {
      // 2026-11-12: S1 (üst/alt top) ve S2 (sağ/sol top) ayrı ayrı — "S1 / S2" (bar)
      label: t('YAĞ BASINCI S1 / S2'),
      value: `${sensors.s1PressureBar} / ${pressureBar} bar`,
      state: pressureBar > 0 || sensors.s1PressureBar > 0 ? 'ok' : motorReady ? 'fail' : 'idle',
    },
    {
      label: t('AKIŞ S1 / S2'),
      value: `${sensors.s1FlowCms} / ${sensors.s2FlowCms}`,
      state: 'ok',
    },
    {
      label: t('TEMAS SENSÖRÜ'),
      value: partSensorActive ? t('AKTİF') : t('PASİF'),
      state: partSensorActive ? 'ok' : 'idle',
    },
    {
      label: t('ACİL DURDURMA'),
      value: safety.emergencyStopOK ? 'OK' : t('BASILI'),
      state: okFail(safety.emergencyStopOK),
    },
    {
      label: 'MOTOR / FAN',
      value: safety.motorThermalOK && safety.fanThermalOK ? t('FAAL') : t('TERMAL'),
      state: okFail(safety.motorThermalOK && safety.fanThermalOK),
    },
  ]

  return (
    <ul className={styles.grid}>
      {rows.map((row) => (
        <li
          key={row.label}
          className={`${styles.box} ${BOX_CLASS[row.state]}`}
        >
          <span className={`${styles.icon} ${ICON_CLASS[row.state]}`}>
            <Icon name={ICON_NAME[row.state]} size="lg" strokeWidth={3} />
          </span>
          <span className={styles.label}>{row.label}</span>
          <span className={`${styles.value} ${row.state === 'fail' ? styles.valueFail : row.state === 'idle' ? styles.valueIdle : ''}`}>
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Prop'suz — üst panel (BottomStatsPanel) yeniden çizilince kartlar boşuna çizilmesin.
export default memo(OilStatsList)
