// EXCEL 28 — Makro düzenleme: isim / açıklama, adım listesi; değer (NumpadModal) ve hız düzenleme,
// adım ekle / sil / yukarı-aşağı taşı. Değişiklikler KAYDET'e kadar ekranda tutulur (PUT tüm adımları yazar).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import {
  AXIS_LABELS,
  axisUnit,
  formatStepValue,
  macroErrorMessage,
  roundAxisValue,
  STEP_TYPE_LABELS,
} from '@/services/macroAxes'
import { isPneumaticAxis, type Macro, type MacroStep } from '@shared/types'
import ManuelHeader from '../ManuelBendingPage/ManuelHeader'
import MacroStepDialog from './MacroStepDialog'
import styles from './Macro.module.css'

type Dialog =
  | { kind: 'name' }
  | { kind: 'description' }
  | { kind: 'value' }
  | { kind: 'speed' }
  | { kind: 'add' }
  | { kind: 'edit' }
  | { kind: 'delete' }
  | { kind: 'leave' }

export default function MacroEditorPage() {
  const navigate = useNavigate()
  const t = useT()
  const { id: rawId } = useParams<{ id: string }>()
  const id = Number(rawId)

  const [macro, setMacro] = useState<Macro | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<MacroStep[]>([])
  const [dirty, setDirty] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    window.corventa.macro
      .get(id)
      .then((m) => {
        if (!alive) return
        setMacro(m)
        setName(m.name)
        setDescription(m.description ?? '')
        setSteps(m.steps.map(({ axis, stepType, value, speedPercent }) => ({ axis, stepType, value, speedPercent })))
      })
      .catch((err) => alive && setError(macroErrorMessage(err) || 'MAKRO YÜKLENEMEDİ'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const sel = selected != null ? steps[selected] ?? null : null

  function change(next: MacroStep[], nextSelected: number | null = selected) {
    setSteps(next)
    setSelected(nextSelected)
    setDirty(true)
    setSaved(false)
  }

  function updateSelected(patch: Partial<MacroStep>) {
    if (selected == null || !sel) return
    change(steps.map((s, i) => (i === selected ? { ...s, ...patch } : s)))
  }

  function move(delta: -1 | 1) {
    if (selected == null) return
    const j = selected + delta
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[selected], next[j]] = [next[j], next[selected]]
    change(next, j)
  }

  function addStep(step: MacroStep) {
    // Seçili adımın ARKASINA, seçim yoksa sona eklenir
    const at = selected != null ? selected + 1 : steps.length
    const next = [...steps]
    next.splice(at, 0, step)
    change(next, at)
    setDialog(null)
  }

  function removeSelected() {
    if (selected == null) return
    const next = steps.filter((_, i) => i !== selected)
    change(next, next.length === 0 ? null : Math.min(selected, next.length - 1))
    setDialog(null)
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('MAKRO ADI ZORUNLU')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const m = await window.corventa.macro.update(id, {
        name: trimmed,
        description: description.trim() || null,
        steps,
      })
      setMacro(m)
      setDirty(false)
      setSaved(true)
    } catch (err) {
      setError(macroErrorMessage(err) || 'MAKRO KAYDEDİLEMEDİ')
    } finally {
      setSaving(false)
    }
  }

  function leave() {
    if (dirty) setDialog({ kind: 'leave' })
    else navigate('/bending/macros')
  }

  if (!loading && !macro) {
    return (
      <div className={styles.page}>
        <ManuelHeader onDown={() => navigate('/bending/macros')} />
        <div className={styles.empty}>{t(error ?? 'Makro bulunamadı.')}</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <ManuelHeader onDown={leave} subtitle={macro ? `#${macro.id}` : undefined} />

      <div className={styles.content}>
        <button className={styles.metaRow} onClick={() => setDialog({ kind: 'name' })} disabled={loading}>
          <span className={styles.metaLabel}>{t('MAKRO ADI')}</span>
          <span className={styles.metaValue}>{name || <span className={styles.metaPlaceholder}>—</span>}</span>
        </button>
        <button className={styles.metaRow} onClick={() => setDialog({ kind: 'description' })} disabled={loading}>
          <span className={styles.metaLabel}>{t('AÇIKLAMA')}</span>
          <span className={styles.metaValue}>
            {description || <span className={styles.metaPlaceholder}>{t('Açıklama eklemek için dokunun')}</span>}
          </span>
        </button>

        {error && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <IconLabel icon="error">{t(error)}</IconLabel>
          </div>
        )}
        {saved && !dirty && (
          <div className={`${styles.banner} ${styles.bannerOk}`}>
            <IconLabel icon="success">{t('MAKRO KAYDEDİLDİ')}</IconLabel>
          </div>
        )}

        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('SIRA')}</th>
                <th>{t('EKSEN')}</th>
                <th>{t('TİP')}</th>
                <th className={styles.num}>{t('DEĞER')}</th>
                <th className={styles.num}>{t('HIZ %')}</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr
                  key={i}
                  className={selected === i ? styles.selected : ''}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => {
                    setSelected(i)
                    setDialog({ kind: 'value' })
                  }}
                >
                  <td className={styles.mono}>{String(i + 1).padStart(3, '0')}</td>
                  <td>{t(AXIS_LABELS[s.axis])}</td>
                  <td>{t(STEP_TYPE_LABELS[s.stepType])}</td>
                  <td className={styles.num}>
                    {formatStepValue(s)} {axisUnit(s)}
                  </td>
                  <td className={styles.num}>{isPneumaticAxis(s.axis) ? '—' : s.speedPercent}</td>
                </tr>
              ))}
              {!loading && steps.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    {t('Adım yok. "ADIM EKLE" ile ekleyin.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`${styles.actions} ${styles.actions6}`}>
          <button className={styles.actionBtn} disabled={!sel} onClick={() => setDialog({ kind: 'value' })}>
            {t('DEĞER')}
          </button>
          <button
            className={styles.actionBtn}
            disabled={!sel || isPneumaticAxis(sel.axis)}
            onClick={() => setDialog({ kind: 'speed' })}
          >
            {t('HIZ')}
          </button>
          <button className={styles.actionBtn} disabled={!sel} onClick={() => setDialog({ kind: 'edit' })}>
            <IconLabel icon="edit">{t('ADIMI DEĞİŞTİR')}</IconLabel>
          </button>
          <button className={styles.actionBtn} disabled={selected == null || selected === 0} onClick={() => move(-1)}>
            <IconLabel icon="up">{t('YUKARI')}</IconLabel>
          </button>
          <button
            className={styles.actionBtn}
            disabled={selected == null || selected >= steps.length - 1}
            onClick={() => move(1)}
          >
            <IconLabel icon="down">{t('AŞAĞI')}</IconLabel>
          </button>
          <button className={styles.actionBtn} disabled={!sel} onClick={() => setDialog({ kind: 'delete' })}>
            {t('ADIMI SİL')}
          </button>
        </div>
        <div className={`${styles.actions} ${styles.actions3}`}>
          <button className={styles.actionBtn} onClick={() => setDialog({ kind: 'add' })} disabled={loading}>
            <IconLabel icon="plus">{t('ADIM EKLE')}</IconLabel>
          </button>
          <button
            className={styles.actionBtn}
            disabled={dirty || steps.length === 0}
            onClick={() => navigate(`/bending/macros/${id}/run`)}
          >
            <IconLabel icon="play">{t('ÇALIŞTIR')}</IconLabel>
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? t('KAYDEDİLİYOR...') : t('KAYDET')}
          </button>
        </div>
      </div>

      {dialog?.kind === 'name' && (
        <KeyboardModal
          initialValue={name}
          label="MAKRO ADI"
          maxLength={100}
          onConfirm={(v) => {
            setName(v)
            setDirty(true)
            setSaved(false)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'description' && (
        <KeyboardModal
          initialValue={description}
          label="AÇIKLAMA"
          maxLength={1000}
          onConfirm={(v) => {
            setDescription(v)
            setDirty(true)
            setSaved(false)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'value' && sel && (
        <NumpadModal
          fieldLabel={sel.stepType === 'Pneumatic' ? t('DEĞER') : 'mm'}
          initialValue={String(sel.value)}
          allowNegative={!isPneumaticAxis(sel.axis)}
          onConfirm={(v) => {
            const num = parseFloat(v)
            if (Number.isFinite(num)) updateSelected({ value: roundAxisValue(sel.axis, num) })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'speed' && sel && (
        <NumpadModal
          fieldLabel="%"
          initialValue={String(sel.speedPercent)}
          onConfirm={(v) => {
            const num = Math.round(parseFloat(v))
            if (Number.isFinite(num)) updateSelected({ speedPercent: Math.min(100, Math.max(1, num)) })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'add' && (
        <MacroStepDialog
          title="ADIM EKLE"
          initial={null}
          defaultSpeed={sel && !isPneumaticAxis(sel.axis) ? sel.speedPercent : 20}
          onSave={addStep}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'edit' && sel && (
        <MacroStepDialog
          title="ADIMI DEĞİŞTİR"
          initial={sel}
          defaultSpeed={20}
          onSave={(step) => {
            updateSelected(step)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && selected != null && (
        <ConfirmModal
          message={t('{no}. adımı silmek istediğinizden emin misiniz', { no: selected + 1 })}
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDialog(null)}
          onConfirm={removeSelected}
        />
      )}
      {dialog?.kind === 'leave' && (
        <ConfirmModal
          message="KAYDEDİLMEMİŞ DEĞİŞİKLİKLER VAR. KAYDETMEDEN ÇIKILSIN MI"
          confirmLabel="ÇIK"
          variant="danger"
          onCancel={() => setDialog(null)}
          onConfirm={() => navigate('/bending/macros')}
        />
      )}
    </div>
  )
}
