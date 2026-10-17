// Ayar ekranları (Operatör / Admin) için ortak form parçaları:
//   SettingsPageShell   — koyu başlık + geri + kaydırılabilir gövde + alt buton satırı
//   SettingsSection     — başlıklı kart; her satır etiket + açıklama + değer (dokununca sayı tuş takımı)
//   ConfirmChangesModal — KAYDET öncesi "eski → yeni" listesi; onaylanmadan hiçbir şey yazılmaz
// Değerler ham sayı olarak tutulur; satıra dokunulmadıkça backend'deki değer birebir korunur.

import { useState, type ReactNode } from 'react'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useT } from '@/i18n'
import styles from './SettingsForm.module.css'

export type SettingValue = number | string | boolean | null

export interface NumberField {
  type?: 'number'
  key: string
  label: string
  unit?: string
  desc?: string
  min?: number
  max?: number
  integer?: boolean
  /** null (boş) değer kabul edilir — "BOŞ" düğmesi gösterilir */
  nullable?: boolean
  /** eksi değer girilebilir (± tuşu) */
  negative?: boolean
}

export interface SelectField {
  type: 'select'
  key: string
  label: string
  desc?: string
  options: { value: string; label: string }[]
}

export type FieldDef = NumberField | SelectField

export interface SectionDef {
  title: string
  note?: string
  fields: FieldDef[]
}

export type Values = Record<string, SettingValue | undefined>

export interface Change {
  key: string
  label: string
  from: string
  to: string
}

const same = (a: SettingValue | undefined, b: SettingValue | undefined) => a === b || (a == null && b == null)

export function formatValue(v: SettingValue | undefined, unit?: string): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') {
    const s = Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)))
    return unit ? `${s} ${unit}` : s
  }
  return String(v)
}

function display(f: FieldDef, v: SettingValue | undefined, t: (s: string) => string): string {
  if (f.type === 'select') {
    const o = f.options.find((x) => x.value === v)
    return o ? t(o.label) : formatValue(v)
  }
  return formatValue(v, f.unit)
}

/** Değişen alanlar (eski → yeni) — sadece tanımlı alanlar arasında. */
export function diffValues(
  fields: FieldDef[],
  original: Values,
  current: Values,
  t: (s: string) => string,
): Change[] {
  return fields
    .filter((f) => !same(original[f.key], current[f.key]))
    .map((f) => ({
      key: f.key,
      label: t(f.label),
      from: display(f, original[f.key], t),
      to: display(f, current[f.key], t),
    }))
}

/** Değişen alanları patch nesnesi olarak döndürür. */
export function patchOf(fields: FieldDef[], original: Values, current: Values): Record<string, SettingValue> {
  const p: Record<string, SettingValue> = {}
  for (const f of fields) {
    if (!same(original[f.key], current[f.key])) p[f.key] = current[f.key] ?? null
  }
  return p
}

export function SettingsPageShell({
  title,
  badge,
  onBack,
  children,
  footer,
}: {
  title: string
  badge?: ReactNode
  onBack: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const t = useT()
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label={t('Geri')}>
          ←
        </button>
        <h1 className={styles.title}>{title}</h1>
        {badge}
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

export function SettingsSection({
  section,
  values,
  original,
  onChange,
  disabled,
}: {
  section: SectionDef
  values: Values
  original: Values
  onChange: (key: string, v: SettingValue) => void
  disabled?: boolean
}) {
  const t = useT()
  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t(section.title)}</div>
      {section.note && <p className={styles.sectionNote}>{t(section.note)}</p>}
      <div className={styles.rows}>
        {section.fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={values[f.key]}
            changed={!same(values[f.key], original[f.key])}
            onChange={(v) => onChange(f.key, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

function FieldRow({
  field,
  value,
  changed,
  onChange,
  disabled,
}: {
  field: FieldDef
  value: SettingValue | undefined
  changed: boolean
  onChange: (v: SettingValue) => void
  disabled?: boolean
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function commit(raw: string) {
    if (field.type === 'select') return
    const f = field
    if (raw.trim() === '') {
      if (f.nullable) {
        setError(null)
        onChange(null)
      }
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) return setError(t('Geçersiz sayı'))
    if (f.integer && !Number.isInteger(n)) return setError(t('Tam sayı olmalı'))
    if (f.min != null && n < f.min) return setError(t('En az {v}', { v: f.min }))
    if (f.max != null && n > f.max) return setError(t('En fazla {v}', { v: f.max }))
    setError(null)
    onChange(n)
  }

  return (
    <div className={styles.row} data-changed={changed || undefined}>
      <div className={styles.info}>
        <span className={styles.label}>{t(field.label)}</span>
        {field.desc && <span className={styles.desc}>{t(field.desc)}</span>}
        {field.type !== 'select' && (field.min != null || field.max != null) && (
          <span className={styles.range}>
            {t('Aralık')}: {field.min ?? '…'} – {field.max ?? '…'}
            {field.unit ? ` ${field.unit}` : ''}
          </span>
        )}
        {error && <span className={styles.error}>{error}</span>}
      </div>

      {field.type === 'select' ? (
        <div className={styles.segmented}>
          {field.options.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              className={styles.segBtn}
              data-on={value === o.value || undefined}
              onClick={() => onChange(o.value)}
            >
              {t(o.label)}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.valueBlock}>
          <button type="button" className={styles.valueBtn} disabled={disabled} onClick={() => setEditing(true)}>
            <span className={styles.valueNum}>{formatValue(value)}</span>
            {field.unit && value != null && <span className={styles.unit}>{field.unit}</span>}
          </button>
          {field.nullable && (
            <button
              type="button"
              className={styles.nullBtn}
              disabled={disabled || value == null}
              onClick={() => onChange(null)}
              title={t('Boş bırak (varsayılan kullanılır)')}
            >
              {t('BOŞ')}
            </button>
          )}
        </div>
      )}

      {editing && field.type !== 'select' && (
        <NumpadModal
          fieldLabel={t(field.label)}
          initialValue={value == null ? '' : String(value)}
          allowNegative={field.negative}
          onConfirm={commit}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

export function ConfirmChangesModal({
  changes,
  busy,
  error,
  warning,
  onConfirm,
  onCancel,
}: {
  changes: Change[]
  busy?: boolean
  error?: string | null
  warning?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  return (
    <div className={styles.overlay} onClick={busy ? undefined : onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('DEĞİŞİKLİKLERİ ONAYLA')}</div>
        {warning && <p className={styles.modalWarn}>{t(warning)}</p>}
        <div className={styles.changeList}>
          {changes.map((c) => (
            <div key={c.key} className={styles.changeRow}>
              <span className={styles.changeLabel}>{c.label}</span>
              <span className={styles.changeFrom}>{c.from}</span>
              <span className={styles.changeArrow}>→</span>
              <span className={styles.changeTo}>{c.to}</span>
            </div>
          ))}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.resetBtn} disabled={busy} onClick={onCancel}>
            {t('VAZGEÇ')}
          </button>
          <button type="button" className={styles.saveBtn} disabled={busy} onClick={onConfirm}>
            {busy ? t('KAYDEDİLİYOR…') : t('KAYDET')}
          </button>
        </div>
      </div>
    </div>
  )
}

export { styles as settingsFormStyles }
