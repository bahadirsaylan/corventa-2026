// Ayarlar > Admin Ayarları — makinenin değiştirilebilir TÜM ayarları.
// Erişim şimdilik açık; kimin neyi düzenleyebileceği kullanıcı girişine (rol) göre ayarlanacak.
//   • Makine ayarları (Bending API MachineSettings) — sekmelere bölünmüş bölümler
//   • Gönye ofsetleri + Stage tanımları (ofset, XA1/YA1, maksimum profil A)
// Kayıt: sadece DEĞİŞEN alanlar gönderilir (main güncel kaydı okuyup üstüne yazar) ve önce
// "eski → yeni" listesiyle onay alınır. Büküm sürerken kayıt kapalıdır (backend ayarları yeniden yükler).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StageInfo } from '@shared/types'
import {
  ConfirmChangesModal,
  SettingsPageShell,
  SettingsSection,
  diffValues,
  patchOf,
  settingsFormStyles as styles,
  type Change,
  type SettingValue,
  type Values,
} from '@/components/SettingsForm/SettingsForm'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useT } from '@/i18n'
import { GONYE_SECTION, MACHINE_FIELDS, MACHINE_SECTIONS, STAGE_FIELDS } from './settingsFields'

const TAB_GONYE = 'GÖNYE & STAGE'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function AdminSettingsPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <SettingsPageShell
      title={t('ADMİN AYARLARI')}
      badge={<span className={styles.badge}>ADMIN</span>}
      onBack={() => navigate('/settings')}
    >
      <AdminEditor />
    </SettingsPageShell>
  )
}

// ── Düzenleyici ─────────────────────────────────────────────────────
type StageVals = Record<number, Values>

function AdminEditor() {
  const t = useT()
  const bendingActive = useBendingActive()
  const tabs = [...MACHINE_SECTIONS.map((g) => g.tab), TAB_GONYE]
  const [tab, setTab] = useState(tabs[0])

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [machine0, setMachine0] = useState<Values>({})
  const [machine, setMachine] = useState<Values>({})
  const [gonye0, setGonye0] = useState<Values>({})
  const [gonye, setGonye] = useState<Values>({})
  const [stages, setStages] = useState<StageInfo[]>([])
  const [stage0, setStage0] = useState<StageVals>({})
  const [stageVals, setStageVals] = useState<StageVals>({})

  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [m, g, s] = await Promise.all([
        window.corventa.settings.getMachine(),
        window.corventa.settings.getGonye(),
        window.corventa.settings.getStages(),
      ])
      setMachine0(m as Values)
      setMachine(m as Values)
      setGonye0(g as Values)
      setGonye(g as Values)
      const sorted = [...s].sort((a, b) => a.stageNumber - b.stageNumber)
      const sv: StageVals = Object.fromEntries(sorted.map((x) => [x.id, x as unknown as Values]))
      setStages(sorted)
      setStage0(sv)
      setStageVals(sv)
    } catch (e) {
      setLoadError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changes: Change[] = useMemo(() => {
    const out: Change[] = [...diffValues(MACHINE_FIELDS, machine0, machine, t)]
    for (const c of diffValues(GONYE_SECTION.fields, gonye0, gonye, t))
      out.push({ ...c, key: `gonye.${c.key}`, label: `${t('GÖNYE')} · ${c.label}` })
    for (const s of stages) {
      for (const c of diffValues(STAGE_FIELDS, stage0[s.id] ?? {}, stageVals[s.id] ?? {}, t))
        out.push({ ...c, key: `stage${s.id}.${c.key}`, label: `${s.name || `Stage ${s.stageNumber}`} · ${c.label}` })
    }
    return out
  }, [machine0, machine, gonye0, gonye, stages, stage0, stageVals, t])

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const mp = patchOf(MACHINE_FIELDS, machine0, machine)
      if (Object.keys(mp).length) await window.corventa.settings.updateMachine(mp)
      const gp = patchOf(GONYE_SECTION.fields, gonye0, gonye)
      if (Object.keys(gp).length) await window.corventa.settings.updateGonye(gp)
      for (const s of stages) {
        const sp = patchOf(STAGE_FIELDS, stage0[s.id] ?? {}, stageVals[s.id] ?? {})
        if (Object.keys(sp).length) await window.corventa.settings.updateStage(s.id, sp as Partial<StageInfo>)
      }
      setConfirm(false)
      setMessage(t('{n} ayar kaydedildi', { n: changes.length }))
      await load()
    } catch (e) {
      setSaveError(errMsg(e))
      await load().catch(() => undefined)
    } finally {
      setSaving(false)
    }
  }

  function revert() {
    setMachine(machine0)
    setGonye(gonye0)
    setStageVals(stage0)
    setMessage(null)
  }

  const set = (setter: (fn: (v: Values) => Values) => void) => (key: string, v: SettingValue) => {
    setMessage(null)
    setter((prev) => ({ ...prev, [key]: v }))
  }

  if (loading && !Object.keys(machine0).length) return <p className={styles.message}>{t('Ayarlar yükleniyor…')}</p>
  if (loadError)
    return (
      <div className={styles.card}>
        <p className={styles.message} data-kind="err">
          {t('Ayarlar okunamadı')}: {loadError}
        </p>
        <button type="button" className={styles.resetBtn} onClick={() => void load()}>
          {t('TEKRAR DENE')}
        </button>
      </div>
    )

  const group = MACHINE_SECTIONS.find((g) => g.tab === tab)

  return (
    <>
      <div className={styles.tabs}>
        {tabs.map((x) => (
          <button key={x} type="button" className={styles.tab} data-on={x === tab || undefined} onClick={() => setTab(x)}>
            {t(x)}
          </button>
        ))}
      </div>

      {bendingActive && (
        <p className={styles.message} data-kind="err">
          {t('Büküm devam ediyor — bitene kadar ayar kaydedilemez.')}
        </p>
      )}
      {message && (
        <p className={styles.message} data-kind="ok">
          {message}
        </p>
      )}

      {group?.sections.map((s) => (
        <SettingsSection key={s.title} section={s} values={machine} original={machine0} onChange={set(setMachine)} />
      ))}

      {tab === TAB_GONYE && (
        <>
          <SettingsSection section={GONYE_SECTION} values={gonye} original={gonye0} onChange={set(setGonye)} />
          {stages.map((s) => (
            <SettingsSection
              key={s.id}
              section={{
                title: `${s.name || `STAGE ${s.stageNumber}`}`.toUpperCase(),
                note: s.stageNumber === 1 ? 'Stage ofsetleri gönye konumundan MUTLAK değerlerdir.' : undefined,
                fields: STAGE_FIELDS,
              }}
              values={stageVals[s.id] ?? {}}
              original={stage0[s.id] ?? {}}
              onChange={(key, v) => {
                setMessage(null)
                setStageVals((prev) => ({ ...prev, [s.id]: { ...prev[s.id], [key]: v } }))
              }}
            />
          ))}
        </>
      )}

      {(
        <div className={styles.footer} style={{ position: 'sticky', bottom: -20, margin: '0 -24px -20px' }}>
          <span className={styles.footerInfo}>
            {changes.length ? t('{n} değişiklik kaydedilmedi', { n: changes.length }) : t('Değişiklik yok')}
          </span>
          <button type="button" className={styles.resetBtn} disabled={!changes.length} onClick={revert}>
            {t('GERİ AL')}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!changes.length || bendingActive}
            onClick={() => {
              setSaveError(null)
              setConfirm(true)
            }}
          >
            {t('KAYDET')}
          </button>
        </div>
      )}

      {confirm && (
        <ConfirmChangesModal
          changes={changes}
          busy={saving}
          error={saveError}
          warning="Bu değerler büküm hesabını ve makine hareketlerini doğrudan etkiler. Emin değilseniz VAZGEÇ'e basın."
          onConfirm={() => void save()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}
