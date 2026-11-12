import { useState } from 'react'
import { fillHiddenProfileFields, useVisibleProfileFields } from '@/constants/profileFields'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import { applyMeasureDefaults } from '@/services/operatorPrefs'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import { useMoldHint } from '@/components/MoldLockHint/useMoldHint'
import SpiralMeasurementForm, { SpiralMeasurementValues } from './SpiralMeasurementForm'
import styles from './SpiralBendingMeasurementsPage.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

const EMPTY: SpiralMeasurementValues = { A: '', B: '', S: '', R: '', L: '', H: '', Y: '' }

function isComplete(v: SpiralMeasurementValues) {
  return (
    v.A.trim() !== '' &&
    v.B.trim() !== '' &&
    v.S.trim() !== '' &&
    v.R.trim() !== '' &&
    v.L.trim() !== '' &&
    v.H.trim() !== '' &&
    v.Y !== ''
  )
}

function fromStore(
  stored: ReturnType<typeof useBendingJobStore.getState>['params']['spiralBending'],
): SpiralMeasurementValues {
  if (!stored) return { ...EMPTY }
  return {
    A: stored.A != null ? String(stored.A) : '',
    B: stored.B != null ? String(stored.B) : '',
    S: stored.S != null ? String(stored.S) : '',
    R: stored.R != null ? String(stored.R) : '',
    L: stored.L != null ? String(stored.L) : '',
    H: stored.H != null ? String(stored.H) : '',
    Y: stored.Y ?? '',
  }
}

export default function SpiralBendingMeasurementsPage() {
  const t = useT()
  const modeLabel = useBendingModeLabel()
  // Kalıp kodu seçiliyse alt şeritte kalıp + kilit + önerilen adım (BULUT_API_V2.md §2.4)
  const moldHint = useMoldHint()
  const navigate     = useNavigate()
  const spiralBending = useBendingJobStore((s) => s.params.spiralBending)
  const setParams     = useBendingJobStore((s) => s.setParams)
  // Profil başına A/B/S alanları — görünmeyenler her zaman "0" (constants/profileFields)
  const visibleFields = useVisibleProfileFields()
  const [values, setRawValues] = useState<SpiralMeasurementValues>(() =>
    applyMeasureDefaults(fillHiddenProfileFields(fromStore(spiralBending), visibleFields)),
  )
  const setValues = (v: SpiralMeasurementValues) => setRawValues(fillHiddenProfileFields(v, visibleFields))

  function handleReset() {
    setValues(applyMeasureDefaults({ ...EMPTY }))
    setParams({ spiralBending: null })
  }

  function handleConfirm() {
    setParams({
      spiralBending: {
        A: parseFloat(values.A),
        B: parseFloat(values.B),
        S: parseFloat(values.S),
        R: parseFloat(values.R),
        L: parseFloat(values.L),
        H: parseFloat(values.H),
        Y: values.Y as 'left' | 'right',
      },
    })
    navigate('/bending/ai/roll-arrangement') // önce vals topu dizilimi onayı
  }

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────── */}
      <PageHeader
        icon={artificialIntelligenceIcon}
        iconAlt="Artificial Intelligence"
        label={modeLabel}
      />

      {/* ── Title ───────────────────────────────── */}
      <h2 className={styles.title}>{t('KIVRIM ÖLÇÜLERİNİ GİRİNİZ')}</h2>

      {/* ── Content ─────────────────────────────── */}
      <div className={styles.content}>
        <SpiralMeasurementForm
          values={values}
          onChange={setValues}
          onReset={handleReset}
          onConfirm={handleConfirm}
          confirmDisabled={!isComplete(values)}
        />
      </div>

      {/* ── Bottom status bar ───────────────────── */}
      <StatusBar
        backTo="/bending/ai/method"
        confirmDisabled={!isComplete(values)}
        onConfirm={handleConfirm}
        hint={moldHint}
      />

    </div>
  )
}
