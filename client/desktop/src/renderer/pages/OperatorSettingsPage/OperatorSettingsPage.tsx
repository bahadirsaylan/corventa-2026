import { FEATURES } from '@shared/edition'
// Ayarlar > Operatör Ayarları — operatörün değiştirebileceği ayarlar (eski "Varsayılan Hız" sayfası).
//   • Bu cihazda saklananlar (services/operatorPrefs): manuel tuş takımı hızı, manuel büküm ekranı
//     hızı, ölçü ekranı H/G ön değerleri
//   • Makinede saklanan (Bending API MachineSettings): geri esneme toleransı; tahliye süreleri ve hareketi
//     (2026-11-01: localStorage'dan MachineSettings Unload* alanlarına taşındı — sınır/hız Admin Ayarları'nda)
//   • Kısayollar: Dil, Karşılama Mesajı, Hızlı Menü, Check List (kendi sayfalarında kaydedilir)
// Makine ayarlarının tamamı Admin Ayarları'nda.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ConfirmChangesModal,
  SettingsPageShell,
  PagedColumns,
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
  PRODUCTION_TOLERANCE_LEVELS,
  PRODUCTION_TOL_EVENT,
  UNLOAD_DEFAULT_PRESETS,
  UNLOAD_ROT_SEC,
  UNLOAD_SECONDS,
  UNLOAD_UPPER,
  readManualRunPrefs,
  readManualSpeed,
  readMeasureDefaults,
  readApplyProductionTolerance,
  readProductionToleranceValues,
  saveApplyProductionTolerance,
  saveManualRunPrefs,
  saveManualSpeed,
  saveMeasureDefaults,
  saveProductionToleranceValues,
  saveUnloadConfig,
  unloadConfigFromSettings,
} from '@/services/operatorPrefs'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT, tp } from '@/i18n'
import { IconLabel } from '@/components/Icon'

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
    note: 'Ölçü ekranlarında G (adım) boşsa bu değer yazılır (G sadece çember ve çok açılıda). Boş bırakılırsa 30 mm. H (kıvrım hızı) aşağıdaki BÜKÜM bölümündeki KIVRIM HIZI ayarından gelir.',
    fields: [
      { key: 'measureG', label: 'VARSAYILAN G (ADIM)', unit: 'mm', min: 0.1, max: 1000, nullable: true, desc: 'Boş bırakılırsa 30 mm.' },
    ],
  },
  {
    // 2026-11-16 — ana ekran başlığındaki TOLERANS seçeneklerinin değerleri (başlıktan DEĞİŞTİR ile de düzenlenir)
    title: 'ÜRETİM TOLERANSI',
    note: 'Ana ekrandaki TOLERANS seçeneklerinin değerleri (± mm). Seçim ana ekrandan yapılır. TOLERANSI BÜKÜME UYGULA kapalıyken seçim sadece gösterimdir; büküm aşağıdaki ÇAP TOLERANSI ayarını kullanır.',
    fields: [
      ...PRODUCTION_TOLERANCE_LEVELS.map((o) => ({
        key: o.level === 'hassas' ? 'prodTolHassas' : 'prodTolStandart',
        label: o.level === 'hassas' ? 'HASSAS ÜRETİM (±)' : 'STANDART ÜRETİM (±)',
        unit: 'mm',
        min: o.min,
        max: o.max,
      })),
      {
        type: 'select' as const,
        key: 'prodTolApply',
        label: 'TOLERANSI BÜKÜME UYGULA',
        desc: 'Açıkken ana ekranda seçilen tolerans yeni büküm işinin toleransı olur (ÇAP TOLERANSI yerine).',
        options: [
          { value: false, label: 'KAPALI' },
          { value: true, label: 'AÇIK' },
        ],
      },
    ],
  },
]

const UNLOAD_SECTION: SectionDef = {
  title: 'TAHLİYE',
  note: 'Büküm bitince açılan tahliye ekranının seçenekleri. Makinede saklanır — tüm kullanıcılar için geçerlidir.',
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
    { key: 'unloadRotationSec', label: 'ROTASYON SÜRESİ', unit: 'sn', min: UNLOAD_ROT_SEC.min, max: UNLOAD_ROT_SEC.max },
    {
      type: 'select',
      key: 'unloadRotationDir',
      label: 'ROTASYON YÖNÜ',
      options: [
        // Tahliye ekranındaki yön tuşlarıyla aynı: -1 = CW, 1 = CCW
        { value: '-1', label: 'CW' },
        { value: '1', label: 'CCW' },
      ],
    },
  ],
}

const MACHINE_SECTION: SectionDef = {
  title: 'BÜKÜM / GERİ ESNEME',
  note: 'Makinede saklanır — tüm kullanıcılar için geçerlidir.',
  fields: [
    {
      // 2026-11-12: ölçü ekranındaki H bu ayardan gelir (bükümde kullanılan rotasyon hızı — job.RotationSpeedPercent)
      key: 'defaultRotationSpeedPercent',
      label: 'KIVRIM HIZI (H)',
      unit: '%',
      min: 1,
      max: 100,
      integer: true,
      desc: 'Büküm sırasında rotasyon hızı. Ölçü ekranındaki H bu değerle gelir.',
    },
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
  const d = readMeasureDefaults()
  const run = readManualRunPrefs()
  const v: Values = {
    manualSpeed: readManualSpeed(),
    manualRunSpeed: run.speedPercent,
    measureG: d.G,
  }
  const tol = readProductionToleranceValues()
  v.prodTolHassas = tol.hassas
  v.prodTolStandart = tol.standart
  v.prodTolApply = readApplyProductionTolerance()
  return v
}

function writeLocal(v: Values): void {
  saveManualSpeed(Number(v.manualSpeed))
  saveManualRunPrefs({ speedPercent: Number(v.manualRunSpeed) })
  saveMeasureDefaults({ H: readMeasureDefaults().H, G: (v.measureG as number | null) ?? null })
  saveProductionToleranceValues({ hassas: Number(v.prodTolHassas), standart: Number(v.prodTolStandart) })
  saveApplyProductionTolerance(v.prodTolApply === true)
}

/** Makine ayarlarından tahliye ekran alanları (boş DB alanı → bu cihazdaki eski değer / varsayılan) */
function unloadValues(m: Values): Values {
  const c = unloadConfigFromSettings(m as Parameters<typeof unloadConfigFromSettings>[0])
  const v: Values = {
    unloadUpperMm: c.motion.upperRetractMm,
    unloadRotationSec: c.motion.rotationSec,
    unloadRotationDir: String(c.motion.rotationDir),
  }
  c.presets.forEach((s, i) => (v[`unloadPreset${i}`] = s))
  return v
}

export default function OperatorSettingsPage() {
  const navigate = useNavigate()
  const t = useT()
  const bendingActive = useBendingActive()

  const [local0, setLocal0] = useState<Values>(readLocal)
  const [local, setLocal] = useState<Values>(local0)
  const local0Ref = useRef(local0)
  local0Ref.current = local0
  const [machine0, setMachine0] = useState<Values>({})
  const [machine, setMachine] = useState<Values>({})
  const [machineError, setMachineError] = useState<string | null>(null)
  // Tahliye (makinede) — ekran alanları MachineSettings Unload* alanlarından türetilir
  const [unload0, setUnload0] = useState<Values>({})
  const [unload, setUnload] = useState<Values>({})

  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadMachine() {
    try {
      const m = (await window.corventa.settings.getMachine()) as Values
      setMachine0(m)
      setMachine(m)
      const u = unloadValues(m)
      setUnload0(u)
      setUnload(u)
      setMachineError(null)
    } catch (e) {
      setMachineError(tp(e instanceof Error ? e.message : String(e)))
    }
  }

  useEffect(() => {
    void loadMachine()
  }, [])

  // 2026-11-16: ana ekran başlığından (DEĞİŞTİR) tolerans değeri değişirse burası da güncellenir;
  // operatörün bu sayfada henüz kaydetmediği düzenleme ezilmez.
  useEffect(() => {
    const keys = ['prodTolHassas', 'prodTolStandart', 'prodTolApply'] as const
    const sync = () => {
      const fresh = readLocal()
      const prev0 = local0Ref.current
      setLocal0((o) => {
        const n = { ...o }
        for (const k of keys) n[k] = fresh[k]
        return n
      })
      setLocal((cur) => {
        const n = { ...cur }
        for (const k of keys) if (cur[k] === prev0[k]) n[k] = fresh[k]
        return n
      })
    }
    window.addEventListener(PRODUCTION_TOL_EVENT, sync)
    return () => window.removeEventListener(PRODUCTION_TOL_EVENT, sync)
  }, [])

  const changes = useMemo(
    () => [
      ...diffValues(LOCAL_FIELDS, local0, local, t),
      ...diffValues(UNLOAD_SECTION.fields, unload0, unload, t),
      ...diffValues(MACHINE_SECTION.fields, machine0, machine, t),
    ],
    [local0, local, unload0, unload, machine0, machine, t],
  )
  const unloadChanged = Object.keys(patchOf(UNLOAD_SECTION.fields, unload0, unload)).length > 0
  const machineChanged = Object.keys(patchOf(MACHINE_SECTION.fields, machine0, machine)).length > 0 || unloadChanged

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const mp = patchOf(MACHINE_SECTION.fields, machine0, machine)
      if (Object.keys(mp).length) await window.corventa.settings.updateMachine(mp)
      if (unloadChanged) {
        await saveUnloadConfig({
          presets: UNLOAD_DEFAULT_PRESETS.map((_, i) => Number(unload[`unloadPreset${i}`])),
          motion: {
            upperRetractMm: Number(unload.unloadUpperMm),
            rotationSec: Number(unload.unloadRotationSec),
            rotationDir: unload.unloadRotationDir === '-1' ? -1 : 1,
          },
        })
      }
      writeLocal(local)
      const fresh = readLocal()
      setLocal0(fresh)
      setLocal(fresh)
      if (Object.keys(mp).length || unloadChanged) await loadMachine()
      setConfirm(false)
      setMessage(t('{n} ayar kaydedildi', { n: changes.length }))
    } catch (e) {
      setSaveError(tp(e instanceof Error ? e.message : String(e)))
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
              setUnload(unload0)
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

      <PagedColumns>
      {/* 2026-11-17: Standart sürümde ölçüm yok → ÜRETİM TOLERANSI bölümü gösterilmez */}
      {LOCAL_SECTIONS.filter((s) => FEATURES.springbackMeasure || s.title !== 'ÜRETİM TOLERANSI').map((s) => (
        <SettingsSection key={s.title} section={s} values={local} original={local0} onChange={onChange(setLocal)} />
      ))}

      {machineError ? (
        <p className={styles.message} data-kind="err">
          {t('Makine ayarları okunamadı')}: {machineError}
        </p>
      ) : (
        <>
        <SettingsSection
          section={UNLOAD_SECTION}
          values={unload}
          original={unload0}
          onChange={onChange(setUnload)}
          disabled={!Object.keys(machine0).length}
        />
        <SettingsSection
          section={MACHINE_SECTION}
          values={machine}
          original={machine0}
          onChange={onChange(setMachine)}
          disabled={!Object.keys(machine0).length}
        />
        </>
      )}

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('DİĞER OPERATÖR AYARLARI')}</div>
        <div className={styles.tabs}>
          {SHORTCUTS.map(([label, path]) => (
            <button key={path} type="button" className={styles.tab} onClick={() => navigate(path)}>
              <IconLabel icon="next" trailing>{t(label)}</IconLabel>
            </button>
          ))}
        </div>
      </div>
      </PagedColumns>

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
