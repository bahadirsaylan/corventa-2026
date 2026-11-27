// 2026-11-20 — YAN DAYAMA KONUMA GÖNDER. Tuş takımında yan dayama etiketindeki cetvel değerine dokununca açılır.
//   GÖNDER → POST /api/side-support/{side}/{type}/position { mm }  (mm = ekranda gösterilen cetvel değeri, ofset dahil)
//   PLC (FB_SideSupportPosition) hedefe gider, valfi kendisi kapatır ve konumu TUTAR (kayarsa düzeltir).
//   DURDUR → aynı yan dayamaya "dur" (konum modu kapanır, valf kapalı). Hareket hızı yok (aç/kapa valf).
// PLC programı eskiyse (positionState -1) gönderilemez — jog çalışır. Görünüm PistonTargetModal ile aynı dil.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { SideSupportSide, SideSupportType } from '@shared/types'
import { sideRulerKey, sideSupportPosStateText } from '@shared/sideRulers'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import { cleanIpcError } from '@/services/savedBends'
import { useMachineStateStore } from '@/stores/machineStateStore'
import styles from './PistonTargetModal.module.css'

const TYPE_LABEL: Record<SideSupportType, string> = { joint: 'MAFSAL', body: 'GÖVDE', reel: 'MAKARA' }

interface Props {
  side: SideSupportSide
  type: SideSupportType
  onClose: () => void
}

const fmt = (v: number) => v.toFixed(1)

export default function SideSupportTargetModal({ side, type, onClose }: Props) {
  const t = useT()
  const key = sideRulerKey(side, type)
  const ruler = useMachineStateStore((s) => s.state.sideSupportRulers?.[key])
  const motorRunning = useMachineStateStore((s) => s.state.hydraulicMotorState === 2)
  const [text, setText] = useState(() => {
    const r = useMachineStateStore.getState().state.sideSupportRulers?.[key]
    return r?.available ? fmt(r.mm) : ''
  })
  const [numpad, setNumpad] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !numpad) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [numpad, onClose])

  const available = ruler?.available === true
  const posState = ruler?.positionState ?? -1
  const supported = posState >= 0
  const offset = ruler?.offsetMm ?? 0
  const stroke = ruler?.strokeMm ?? 0
  const min = -offset
  const max = stroke - offset
  const moving = posState === 1

  const num = parseFloat(text)
  let invalid: string | null = null
  if (!Number.isFinite(num)) invalid = t('HEDEF KONUMU GİRİN')
  else if (stroke > 0 && (num < min - 0.01 || num > max + 0.01))
    invalid = t('HEDEF İZİN VERİLEN ARALIĞIN DIŞINDA ({min} … {max} mm)', { min: fmt(min), max: fmt(max) })

  const title = `${side === 'left' ? t('SOL') : t('SAĞ')} ${t(TYPE_LABEL[type])} — ${t('KONUMA GÖNDER')}`

  async function send() {
    if (busy || invalid || !motorRunning || !supported || !available) return
    setBusy(true)
    setNotice(null)
    try {
      await window.corventa.machine.sideSupportPosition({ side, type, mm: Math.round(num * 10) / 10 })
    } catch (err) {
      setNotice(cleanIpcError(err))
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    try {
      await window.corventa.machine.sideSupportControl({ side, type, direction: 0 })
    } catch (err) {
      setNotice(cleanIpcError(err))
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={() => !moving && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>

        <div className={styles.infoRow}>
          <div className={styles.infoCell}>
            <span className={styles.infoLabel}>{t('ŞU ANKİ KONUM')}</span>
            <span className={styles.infoValue}>{available ? `${fmt(ruler!.mm)} mm` : '—'}</span>
          </div>
          <div className={styles.infoCell}>
            <span className={styles.infoLabel}>{t('İZİN VERİLEN ARALIK')}</span>
            <span className={styles.infoValue}>{stroke > 0 ? `${fmt(min)} … ${fmt(max)} mm` : '—'}</span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <div className={styles.infoCell}>
            <span className={styles.infoLabel}>{t('DURUM')}</span>
            <span className={styles.infoValue}>{t(sideSupportPosStateText(posState))}</span>
          </div>
          <div className={styles.infoCell}>
            <span className={styles.infoLabel}>{t('HEDEF')}</span>
            <span className={styles.infoValue}>{ruler?.targetMm != null ? `${fmt(ruler.targetMm)} mm` : '—'}</span>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('HEDEF KONUM (mm)')}</span>
          <button type="button" className={styles.valueBtn} onClick={() => setNumpad(true)}>
            <span>{text || '—'}</span>
            <Icon name="keyboard" size="lg" className={styles.valueIcon} />
          </button>
        </div>

        <div className={styles.msgs}>
          {!available && <p className={styles.note}>{t('CETVEL OKUNMUYOR — KONUMA GÖNDERİLEMEZ')}</p>}
          {available && !supported && (
            <p className={styles.note}>{t("YAN DAYAMA KONUM KONTROLÜ PLC'DE YOK — PLC PROGRAMI GÜNCELLENMELİ (ELLE ÇALIŞIR)")}</p>
          )}
          {!motorRunning && <p className={styles.note}>{t('HİDROLİK MOTOR ÇALIŞMIYOR — ÖNCE ÇALIŞTIR')}</p>}
          {motorRunning && available && supported && invalid && <p className={styles.note}>{invalid}</p>}
          {posState === 2 && <p className={styles.status}>{t('HEDEFTE')}</p>}
          {(posState === 3 || posState === 4 || posState === 5) && (
            <p className={styles.notice}>
              <Icon name="info" size="lg" /> <span>{t('YAN DAYAMA DURDU: {s}', { s: t(sideSupportPosStateText(posState)) })}</span>
            </p>
          )}
          {notice && (
            <p className={styles.notice}>
              <Icon name="info" size="lg" /> <span>{notice}</span>
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={onClose}>
            {t('KAPAT')}
          </button>
          {moving ? (
            <button type="button" className={`${styles.btn} ${styles.stop}`} onClick={() => void stop()}>
              <Icon name="stop" size="xl" /> {t('DURDUR')}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.send}`}
              disabled={busy || !!invalid || !motorRunning || !supported || !available}
              onClick={() => void send()}
            >
              <Icon name="play" size="xl" /> {t('GÖNDER')}
            </button>
          )}
        </div>

        {numpad && (
          <NumpadModal
            fieldLabel={t('HEDEF KONUM (mm)')}
            initialValue=""
            allowNegative
            onConfirm={(v) => setText(v)}
            onClose={() => setNumpad(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
