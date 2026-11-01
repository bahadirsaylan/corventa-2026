// EXCEL 28 — Makro oynatma. SÜREKLİ (adımlar arka arkaya) veya ADIM ADIM (her adımdan önce onay).
// DURDUR her an tüm eksenleri durdurur; acil stop / motor düşmesi / veri kesilmesi makroyu hata ile durdurur.
// Kayıt bağlamı (gönye/stage) mevcut durumla uyuşmazsa BAŞLAT önce güçlü onay ister.
// Hareketler services/macroRunner.ts'te mevcut manuel uçlarla yapılır — büküm akışlarına dokunmaz.

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { Icon, IconLabel } from '@/components/Icon'
import { useT } from '@/i18n'
import {
  AXIS_LABELS,
  axisUnit,
  formatStepValue,
  macroErrorMessage,
  readAxisValue,
  STEP_TYPE_LABELS,
} from '@/services/macroAxes'
import {
  confirmMacroStep,
  macroContextWarnings,
  macroStartBlockReason,
  resetMacroRun,
  runMacro,
  stopMacro,
  useMacroRunStore,
  type MacroRunMode,
} from '@/services/macroRunner'
import { useBendingActivityStore } from '@/stores/bendingActivityStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { isPneumaticAxis, type Macro } from '@shared/types'
import ManuelHeader from '../ManuelBendingPage/ManuelHeader'
import styles from './Macro.module.css'

export default function MacroRunPage() {
  const navigate = useNavigate()
  const t = useT()
  const { id: rawId } = useParams<{ id: string }>()
  const id = Number(rawId)

  const [macro, setMacro] = useState<Macro | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<MacroRunMode>('continuous')
  /** Bağlam uyuşmazlığında başlatma onayı açık */
  const [contextConfirm, setContextConfirm] = useState(false)

  const run = useMacroRunStore()
  const machine = useMachineStateStore((s) => s.state)
  // Durum çubuğu için canlı ön koşul (motor / acil stop / aktif büküm) — her state push'ta yeniden hesaplanır
  useBendingActivityStore((s) => s.active)
  const blockReason = macroStartBlockReason()

  const active = run.macroId === id && (run.status === 'running' || run.status === 'awaiting-confirm')

  useEffect(() => {
    let alive = true
    window.corventa.macro
      .get(id)
      .then((m) => alive && setMacro(m))
      .catch((err) => alive && setLoadError(macroErrorMessage(err) || 'MAKRO YÜKLENEMEDİ'))
    return () => {
      alive = false
    }
  }, [id])

  // Ekrandan çıkılırsa çalışan makro durdurulur (makine kontrolsüz hareket etmesin)
  useEffect(() => {
    resetMacroRun()
    return () => {
      const st = useMacroRunStore.getState()
      if (st.status === 'running' || st.status === 'awaiting-confirm') void stopMacro()
      resetMacroRun()
    }
  }, [])

  function start(confirmed = false) {
    if (!macro || active) return
    if (!confirmed && macroContextWarnings(macro).length > 0) {
      setContextConfirm(true)
      return
    }
    void runMacro(macro, mode, 0)
  }

  if (!macro) {
    return (
      <div className={styles.page}>
        <ManuelHeader onDown={() => navigate('/bending/macros')} />
        <div className={styles.empty}>{t(loadError ?? 'YÜKLENİYOR...')}</div>
      </div>
    )
  }

  const ours = run.macroId === id
  const currentIndex = ours ? run.currentIndex : -1
  const completed = ours ? run.completed : 0
  const current = currentIndex >= 0 ? macro.steps[currentIndex] : null
  const contextWarnings = macroContextWarnings(macro)
  const recordedContext =
    macro.recordedStage == null && macro.recordedGonyeCompleted == null
      ? t('BİLİNMİYOR')
      : `${macro.recordedGonyeCompleted ? t('GÖNYE VAR') : t('GÖNYE YOK')} · ${t('STAGE')} ${macro.recordedStage ?? '—'}`
  const currentContext = `${machine.physicalInfo.isGonyeCompleted ? t('GÖNYE VAR') : t('GÖNYE YOK')} · ${t('STAGE')} ${machine.physicalInfo.currentStage}`

  let banner: { cls: string; icon: 'info' | 'success' | 'warning' | 'error'; text: string } | null = null
  if (ours && run.status === 'awaiting-confirm' && current) {
    banner = {
      cls: styles.bannerWarn,
      icon: 'warning',
      text: t('ADIM {no}: {axis} → {value} {unit} — ONAYLAYIN', {
        no: currentIndex + 1,
        axis: t(AXIS_LABELS[current.axis]),
        value: formatStepValue(current),
        unit: axisUnit(current),
      }),
    }
  } else if (ours && run.status === 'running' && current) {
    banner = {
      cls: styles.bannerInfo,
      icon: 'info',
      text: t('ADIM {no} ÇALIŞIYOR: {axis} → {value} {unit} (ŞU AN {now})', {
        no: currentIndex + 1,
        axis: t(AXIS_LABELS[current.axis]),
        value: formatStepValue(current),
        unit: axisUnit(current),
        now: readAxisValue(machine, current.axis).toFixed(current.axis === 'Rotation' || isPneumaticAxis(current.axis) ? 0 : 2),
      }),
    }
  } else if (ours && run.status === 'done') {
    banner = { cls: styles.bannerOk, icon: 'success', text: t(run.message ?? 'MAKRO TAMAMLANDI') }
  } else if (ours && run.status === 'stopped') {
    banner = { cls: styles.bannerWarn, icon: 'warning', text: t(run.message ?? 'MAKRO DURDURULDU') }
  } else if (ours && run.status === 'error') {
    banner = { cls: styles.bannerError, icon: 'error', text: t(run.message ?? 'MAKRO HATASI') }
  } else if (blockReason) {
    banner = { cls: styles.bannerError, icon: 'error', text: t(blockReason) }
  }

  return (
    <div className={styles.page}>
      <ManuelHeader onDown={() => navigate('/bending/macros')} subtitle={`#${macro.id}`} />

      <div className={styles.content}>
        <h2 className={styles.pageTitle}>
          <IconLabel icon="macro">{macro.name}</IconLabel>
        </h2>

        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{t('OYNATMA MODU')}</span>
          <button
            className={`${styles.toggle} ${mode === 'continuous' ? styles.toggleActive : ''}`}
            disabled={active}
            onClick={() => setMode('continuous')}
          >
            {t('SÜREKLİ')}
          </button>
          <button
            className={`${styles.toggle} ${mode === 'step' ? styles.toggleActive : ''}`}
            disabled={active}
            onClick={() => setMode('step')}
          >
            {t('ADIM ADIM')}
          </button>
          <span className={styles.progressText}>
            {completed} / {macro.steps.length}
          </span>
        </div>

        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{t('KAYIT')}: {recordedContext}</span>
          <span className={styles.modeLabel}>
            {t('ŞU AN')}: {currentContext}
          </span>
        </div>
        {contextWarnings.length > 0 && !active && (
          <div className={`${styles.banner} ${styles.bannerWarn}`}>
            <IconLabel icon="warning">{contextWarnings.map((w) => t(w)).join(' · ')}</IconLabel>
          </div>
        )}

        {banner && (
          <div className={`${styles.banner} ${banner.cls}`}>
            <IconLabel icon={banner.icon}>{banner.text}</IconLabel>
          </div>
        )}

        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.stateIcon} />
                <th>{t('SIRA')}</th>
                <th>{t('EKSEN')}</th>
                <th>{t('TİP')}</th>
                <th className={styles.num}>{t('DEĞER')}</th>
                <th className={styles.num}>{t('HIZ %')}</th>
              </tr>
            </thead>
            <tbody>
              {macro.steps.map((s, i) => {
                const isCurrent = i === currentIndex && active
                const isDone = i < completed
                return (
                  <tr key={s.id ?? i} className={isCurrent ? styles.current : isDone ? styles.done : ''}>
                    <td className={styles.stateIcon}>
                      {isCurrent ? <Icon name="play" size="sm" /> : isDone ? <Icon name="check" size="sm" /> : null}
                    </td>
                    <td className={styles.mono}>{String(i + 1).padStart(3, '0')}</td>
                    <td>{t(AXIS_LABELS[s.axis])}</td>
                    <td>{t(STEP_TYPE_LABELS[s.stepType])}</td>
                    <td className={styles.num}>
                      {formatStepValue(s)} {axisUnit(s)}
                    </td>
                    <td className={styles.num}>{isPneumaticAxis(s.axis) ? '—' : s.speedPercent}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={`${styles.actions} ${styles.actions3}`}>
          {active ? (
            <button
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              disabled={run.status !== 'awaiting-confirm'}
              onClick={confirmMacroStep}
            >
              <IconLabel icon="next">{t('ADIMI ÇALIŞTIR')}</IconLabel>
            </button>
          ) : (
            <button
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              disabled={!!blockReason || macro.steps.length === 0}
              onClick={() => start()}
            >
              <IconLabel icon="play">{t('BAŞLAT')}</IconLabel>
            </button>
          )}
          <button
            className={styles.actionBtn}
            disabled={active}
            onClick={() => navigate(`/bending/macros/${macro.id}/edit`)}
          >
            <IconLabel icon="edit">{t('DÜZENLE')}</IconLabel>
          </button>
          {/* DURDUR her zaman basılabilir — çalışmıyorken de tüm eksenlere stop gönderir */}
          <button className={`${styles.actionBtn} ${styles.actionBtnStop}`} onClick={() => void stopMacro()}>
            <IconLabel icon="stop">{t('DURDUR')}</IconLabel>
          </button>
        </div>
      </div>

      {contextConfirm && (
        <ConfirmModal
          message="KAYIT BAĞLAMI (GÖNYE / STAGE) ŞU ANKİ DURUMLA UYUŞMUYOR. PİSTONLAR KAYITTAKİ DEĞERLERE GİDECEK — PARÇA VE KALIP KONUMUNU KONTROL EDİN. YİNE DE BAŞLATILSIN MI?"
          confirmLabel="YİNE DE BAŞLAT"
          cancelLabel="VAZGEÇ"
          variant="danger"
          onCancel={() => setContextConfirm(false)}
          onConfirm={() => {
            setContextConfirm(false)
            start(true)
          }}
        />
      )}
    </div>
  )
}
