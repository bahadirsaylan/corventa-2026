// EXCEL 28 — Manuel ekrandaki MAKRO KAYDI çubuğu.
// BAŞLAT → usta tuşlarla hareket eder (her hareket ManuelBendingRunPage'den noteMotion ile bildirilir).
// BİTİR → açık eksenin son değeri de yazılır, isim + açıklama ile DataApi'ye kaydedilir → düzenleme ekranı.
// İPTAL → kayıt atılır. Kayıt store'u global — ekrandan çıkıp dönülse de kayıt sürer.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { Icon, IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import { useT } from '@/i18n'
import { AXIS_LABELS, axisUnit, formatStepValue, macroErrorMessage } from '@/services/macroAxes'
import { useMacroRecorderStore } from '@/stores/macroRecorderStore'
import type { MacroStep } from '@shared/types'
import styles from './Macro.module.css'

export default function MacroRecordBar({ disabled }: { disabled?: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const recording = useMacroRecorderStore((s) => s.recording)
  const steps = useMacroRecorderStore((s) => s.steps)
  const current = useMacroRecorderStore((s) => s.current)
  const start = useMacroRecorderStore((s) => s.start)
  const finish = useMacroRecorderStore((s) => s.finish)
  const discard = useMacroRecorderStore((s) => s.discard)

  const [finishing, setFinishing] = useState(false)
  const [saveSteps, setSaveSteps] = useState<MacroStep[] | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [emptyNotice, setEmptyNotice] = useState(false)

  async function handleFinish() {
    setFinishing(true)
    try {
      const recorded = await finish()
      if (recorded.length === 0) {
        discard()
        setEmptyNotice(true)
      } else {
        setSaveSteps(recorded)
      }
    } finally {
      setFinishing(false)
    }
  }

  const last = steps[steps.length - 1]
  const count = steps.length + (current ? 1 : 0)

  return (
    <>
      <div className={`${styles.recordBar} ${recording ? styles.recordBarActive : ''}`}>
        {recording ? (
          <>
            <Icon name="record" size="lg" className={styles.recordDot} />
            <span className={styles.recordText}>{t('MAKRO KAYDI — {n} ADIM', { n: count })}</span>
            {last && (
              <span className={styles.recordLast}>
                {t('SON')}: {t(AXIS_LABELS[last.axis])} {formatStepValue(last)} {axisUnit(last)}
              </span>
            )}
            <button className={`${styles.recordBtn} ${styles.recordBtnStart}`} onClick={() => setCancelOpen(true)}>
              {t('İPTAL')}
            </button>
            <button
              className={`${styles.recordBtn} ${styles.recordBtnStop}`}
              disabled={finishing}
              onClick={() => void handleFinish()}
            >
              <IconLabel icon="stop">{finishing ? t('BEKLEYİN...') : t('KAYDI BİTİR')}</IconLabel>
            </button>
          </>
        ) : (
          <>
            <span className={styles.recordText}>
              {emptyNotice ? t('KAYITTA HAREKET YOK — MAKRO OLUŞTURULMADI') : t('USTA ÖĞRENME (MAKRO)')}
            </span>
            <button
              className={`${styles.recordBtn} ${styles.recordBtnStart}`}
              disabled={disabled}
              onClick={() => {
                setEmptyNotice(false)
                start()
              }}
            >
              <IconLabel icon="record">{t('MAKRO KAYDI BAŞLAT')}</IconLabel>
            </button>
            <button className={styles.recordBtn} onClick={() => navigate('/bending/macros')}>
              <IconLabel icon="macro">{t('MAKROLAR')}</IconLabel>
            </button>
          </>
        )}
      </div>

      {cancelOpen && (
        <ConfirmModal
          message="MAKRO KAYDI İPTAL EDİLSİN Mİ? KAYDEDİLEN ADIMLAR SİLİNECEK"
          confirmLabel="KAYDI SİL"
          cancelLabel="VAZGEÇ"
          variant="danger"
          onCancel={() => setCancelOpen(false)}
          onConfirm={() => {
            discard()
            setCancelOpen(false)
          }}
        />
      )}

      {saveSteps && (
        <MacroSaveDialog
          steps={saveSteps}
          onCancel={() => {
            discard()
            setSaveSteps(null)
          }}
          onSaved={(id) => {
            discard()
            setSaveSteps(null)
            navigate(`/bending/macros/${id}/edit`)
          }}
        />
      )}
    </>
  )
}

/** Kayıt bitince: isim (zorunlu) + açıklama → POST /api/macros */
function MacroSaveDialog({
  steps,
  onCancel,
  onSaved,
}: {
  steps: MacroStep[]
  onCancel: () => void
  onSaved: (id: number) => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keyboard, setKeyboard] = useState<'name' | 'description' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const m = await window.corventa.macro.create({
        name: name.trim(),
        description: description.trim() || null,
        steps,
      })
      onSaved(m.id)
    } catch (err) {
      setError(macroErrorMessage(err) || 'MAKRO KAYDEDİLEMEDİ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>{t('MAKROYU KAYDET')}</h3>
        <div className={styles.sectionLabel}>{t('{n} ADIM KAYDEDİLDİ', { n: steps.length })}</div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t('MAKRO ADI')}</span>
          <button className={styles.fieldBtn} onClick={() => setKeyboard('name')}>
            {name || <span className={styles.placeholder}>{t('İsim vermek için dokunun')}</span>}
          </button>
        </div>
        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t('AÇIKLAMA')}</span>
          <button className={styles.fieldBtn} onClick={() => setKeyboard('description')}>
            {description || <span className={styles.placeholder}>{t('Opsiyonel')}</span>}
          </button>
        </div>

        {error && <div className={styles.modalError}>{t(error)}</div>}

        <div className={styles.modalActions}>
          <button className={`${styles.modalBtn} ${styles.modalCancel}`} onClick={() => setDiscardOpen(true)}>
            {t('KAYDETME')}
          </button>
          <button
            className={`${styles.modalBtn} ${styles.modalConfirm}`}
            disabled={!name.trim() || saving}
            onClick={() => void save()}
          >
            {saving ? t('KAYDEDİLİYOR...') : t('KAYDET')}
          </button>
        </div>
      </div>

      {keyboard === 'name' && (
        <KeyboardModal
          initialValue={name}
          label="MAKRO ADI"
          maxLength={100}
          onConfirm={(v) => {
            setName(v)
            setKeyboard(null)
          }}
          onClose={() => setKeyboard(null)}
        />
      )}
      {keyboard === 'description' && (
        <KeyboardModal
          initialValue={description}
          label="AÇIKLAMA"
          maxLength={1000}
          onConfirm={(v) => {
            setDescription(v)
            setKeyboard(null)
          }}
          onClose={() => setKeyboard(null)}
        />
      )}
      {discardOpen && (
        <ConfirmModal
          message="KAYIT KAYDEDİLMEDEN SİLİNSİN Mİ"
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDiscardOpen(false)}
          onConfirm={onCancel}
        />
      )}
    </div>
  )
}
