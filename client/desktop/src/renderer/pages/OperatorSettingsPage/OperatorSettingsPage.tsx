// Ayarlar > Operatör Ayarları — operatörün değiştirebileceği ayarlar (eski "Varsayılan Hız" sayfası).
//   • Bu cihazda saklananlar (services/operatorPrefs): manuel tuş takımı hızı, manuel büküm ekranı
//     hızı, ölçü ekranı H/G ön değerleri, tahliye süreleri ve hareketi
//   • Makinede saklanan (Bending API MachineSettings): geri esneme toleransı
//   • Kısayollar: Dil, Karşılama Mesajı, Hızlı Menü, Check List (kendi sayfalarında kaydedilir)
// Makine ayarlarının tamamı Admin Ayarları'nda.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ConfirmChangesModal,
  SettingsPageShell,
  SettingsSection,
  diffValues,
  patchOf,
  settingsFormStyles as styles,
  type SectionDef,
  type SettingValue,
  type Values,
} from '@/components/SettingsForm/SettingsForm'
import {
  MANUAL_SPEED,
  UNLOAD_DEFAULT_PRESETS,
  UNLOAD_ROT,
  UNLOAD_SECONDS,
  UNLOAD_UPPER,
  readManualRunPrefs,
  readManualSpeed,
  readMeasureDefaults,
  readUnloadMotion,
  readUnloadPresets,
  readUnloadSelected,
  saveManualRunPrefs,
  saveManualSpeed,
  saveMeasureDefaults,
  saveUnloadMotion,
  saveUnloadPresets,
} from '@/services/operatorPrefs'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'

const LOCAL_SECTIONS: SectionDef[] = [
  {
    title: 'MANUEL KULLANIM',
    fields: [
      {
        key: 'manualSpeed',
        label: 'TUŞ TAKIMI BAŞLANGIÇ HIZI',
        unit: '%',
        min: MANUAL_SPEED.min,
        max: MANUAL_SPEED.max,
        integer: true,
        desc: 'Uygulama açıldığında orta tuş takımındaki manuel hız.',
      },
      {
        key: 'manualRunSpeed',
        label: 'MANUEL BÜKÜM EKRANI BAŞLANGIÇ HIZI',
        unit: '%',
        min: MANUAL_SPEED.min,
        max: MANUAL_SPEED.max,
        integer: true,
        desc: 'Manuel büküm programı çalıştırma ekranı açıldığındaki hız.',
      },
    ],
  },
  {
    title: 'ÖLÇÜ GİRİŞİ',
    note: 'Ölçü ekranlarında alan boşsa bu değerler yazılır (G sadece çember ve çok açılıda). Boş = her işte operatör girer.',
    fields: [
      { key: 'measureH', label: 'VARSAYILAN H (KIVRIM HIZI)', unit: 'm/dk', min: 0.1, max: 100, nullable: true },
      { key: 'measureG', label: 'VARSAYILAN G (ADIM)', unit: 'mm', min: 0.1, max: 1000, nullable: true },
    ],
  },
  {
    title: 'TAHLİYE',
    note: 'Büküm bitince açılan tahliye ekranının seçenekleri.',
    fields: [
      ...UNLOAD_DEFAULT_PRESETS.map((_, i) => ({
        key: `unloadPreset${i}`,
        label: `SÜRE ${i + 1}`,
        unit: 'sn',
        min: UNLOAD_SECONDS.min,
        max: UNLOAD_SECONDS.max,
        integer: true,
      })),
      { key: 'unloadUpperMm', label: 'ÜST TOP GERİ ÇEKME', unit: 'mm', min: UNLOAD_UPPER.min, max: UNLOAD_UPPER.max },
      { key: 'unloadRotationMm', label: 'ROTASYON MESAFESİ', unit: 'mm', min: UNLOAD_ROT.min, max: UNLOAD_ROT.max },
      {
        type: 'select',
        key: 'unloadRotationDir',
        label: 'ROTASYON YÖNÜ',
        options: [
          { value: '-1', label: '◀ GERİ' },
          { value: '1', label: 'İLERİ ▶' },
        ],
      },
    ],
  },
]

const MACHINE_SECTION: SectionDef = {
  title: 'GERİ ESNEME',
  note: 'Makinede saklanır — tüm kullanıcılar için geçerlidir.',
  fields: [
    {
      key: 'defaultToleranceMm',
      label: 'ÇAP TOLERANSI',
      unit: 'mm',
      min: 0.01,
      max: 500,
      desc: 'Ölçülen çap hedefe bu kadar yakınsa düzeltme yapılmaz.',
    },
  ],
}

// Operatörün kendi sayfalarında değiştirdiği diğer ayarlar
const SHORTCUTS: [string, string][] = [
  ['DİL SEÇİMİ', '/settings/language'],
  ['KARŞILAMA MESAJI', '/settings/welcome-message'],
  ['HIZLI MENÜ', '/settings/side-menu'],
  ['CHECK LIST', '/settings/checklist'],
]

const LOCAL_FIELDS = LOCAL_SECTIONS.flatMap((s) => s.fields)

function readLocal(): Values {
  const m = readUnloadMotion()
  const d = readMeasureDefaults()
  const run = readManualRunPrefs()
  const v: Values = {
    manualSpeed: readManualSpeed(),
    manualRunSpeed: run.speedPercent,
    measureH: d.H,
    measureG: d.G,
    unloadUpperMm: m.upperRetractMm,
    unloadRotationMm: m.rotationMm,
    unloadRotationDir: String(m.rotationDir),
  }
  readUnloadPresets().forEach((s, i) => (v[`unloadPreset${i}`] = s))
  return v
}

function writeLocal(v: Values): void {
  saveManualSpeed(Number(v.manualSpeed))
  saveManualRunPrefs({ speedPercent: Number(v.manualRunSpeed) })
  saveMeasureDefaults({ H: (v.measureH as number | null) ?? null, G: (v.measureG as number | null) ?? null })
  saveUnloadMotion({
    upperRetractMm: Number(v.unloadUpperMm),
    rotationMm: Number(v.unloadRotationMm),
    rotationDir: v.unloadRotationDir === '-1' ? -1 : 1,
  })
  saveUnloadPresets(
    UNLOAD_DEFAULT_PRESETS.map((_, i) => Number(v[`unloadPreset${i}`])),
    readUnloadSelected(),
  )
}

export default function OperatorSettingsPage() {
  const navigate = useNavigate()
  const t = useT()
  const bendingActive = useBendingActive()

  const [local0, setLocal0] = useState<Values>(readLocal)
  const [local, setLocal] = useState<Values>(local0)
  const [machine0, setMachine0] = useState<Values>({})
  const [machine, setMachine] = useState<Values>({})
  const [machineError, setMachineError] = useState<string | null>(null)

  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadMachine() {
    try {
      const m = (await window.corventa.settings.getMachine()) as Values
      setMachine0(m)
      setMachine(m)
      setMachineError(null)
    } catch (e) {
      setMachineError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void loadMachine()
  }, [])

  const changes = useMemo(
    () => [...diffValues(LOCAL_FIELDS, local0, local, t), ...diffValues(MACHINE_SECTION.fields, machine0, machine, t)],
    [local0, local, machine0, machine, t],
  )
  const machineChanged = Object.keys(patchOf(MACHINE_SECTION.fields, machine0, machine)).length > 0

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const mp = patchOf(MACHINE_SECTION.fields, machine0, machine)
      if (Object.keys(mp).length) await window.corventa.settings.updateMachine(mp)
      writeLocal(local)
      const fresh = readLocal()
      setLocal0(fresh)
      setLocal(fresh)
      if (Object.keys(mp).length) await loadMachine()
      setConfirm(false)
      setMessage(t('{n} ayar kaydedildi', { n: changes.length }))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onChange = (setter: (fn: (v: Values) => Values) => void) => (key: string, v: SettingValue) => {
    setMessage(null)
    setter((prev) => ({ ...prev, [key]: v }))
  }

  return (
    <SettingsPageShell
      title={t('OPERATÖR AYARLARI')}
      onBack={() => navigate('/settings')}
      footer={
        <>
          <span className={styles.footerInfo}>
            {changes.length ? t('{n} değişiklik kaydedilmedi', { n: changes.length }) : t('Değişiklik yok')}
          </span>
          <button
            type="button"
            className={styles.resetBtn}
            disabled={!changes.length}
            onClick={() => {
              setLocal(local0)
              setMachine(machine0)
            }}
          >
            {t('GERİ AL')}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!changes.length || (machineChanged && bendingActive)}
            onClick={() => {
              setSaveError(null)
              setConfirm(true)
            }}
          >
            {t('KAYDET')}
          </button>
        </>
      }
    >
      {message && (
        <p className={styles.message} data-kind="ok">
          {message}
        </p>
      )}

      {LOCAL_SECTIONS.map((s) => (
        <SettingsSection key={s.title} section={s} values={local} original={local0} onChange={onChange(setLocal)} />
      ))}

      {machineError ? (
        <p className={styles.message} data-kind="err">
          {t('Makine ayarları okunamadı')}: {machineError}
        </p>
      ) : (
        <SettingsSection
          section={MACHINE_SECTION}
          values={machine}
          original={machine0}
          onChange={onChange(setMachine)}
          disabled={!Object.keys(machine0).length}
        />
      )}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('DİĞER OPERATÖR AYARLARI')}</div>
        <div className={styles.tabs}>
          {SHORTCUTS.map(([label, path]) => (
            <button key={path} type="button" className={styles.tab} onClick={() => navigate(path)}>
              {t(label)} →
            </button>
          ))}
        </div>
      </div>

      {confirm && (
        <ConfirmChangesModal
          changes={changes}
          busy={saving}
          error={saveError}
          onConfirm={() => void save()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </SettingsPageShell>
  )
}
