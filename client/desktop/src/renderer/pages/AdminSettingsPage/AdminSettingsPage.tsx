// Ayarlar > Admin Ayarları — makinenin değiştirilebilir TÜM ayarları.
// Erişim şimdilik açık; kimin neyi düzenleyebileceği kullanıcı girişine (rol) göre ayarlanacak.
//   • Makine ayarları (Bending API MachineSettings) — sekmelere bölünmüş bölümler
//   • Gönye ofsetleri + 5 stage yuvası (aktif/pasif, ofset, XA1/YA1, maksimum profil A)
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
import {
  GONYE_SECTION,
  MACHINE_FIELDS,
  MACHINE_SECTIONS,
  STAGE_ACTIVE_FIELD,
  STAGE_FIELDS,
  STAGE_SLOTS,
} from './settingsFields'

const TAB_GONYE = 'GÖNYE & STAGE'
const ALL_STAGE_FIELDS = [STAGE_ACTIVE_FIELD, ...STAGE_FIELDS]
const FIXED_STAGES = 3
const OFFSET_KEYS = ['leftOffsetMm', 'rightOffsetMm', 'lowerOffsetMm']
const STAGE_OFFSET_FIELDS = STAGE_FIELDS.filter((f) => OFFSET_KEYS.includes(f.key))
const STAGE_CALC_FIELDS = STAGE_FIELDS.filter((f) => !OFFSET_KEYS.includes(f.key))
const SLOT_NUMBERS = Array.from({ length: STAGE_SLOTS }, (_, i) => i + 1)

/** Stage kaydı → form değerleri (kayıt yoksa pasif boş yuva). */
function stageToValues(rec: StageInfo | undefined): Values {
  if (!rec) return { active: 'off', leftOffsetMm: 0, rightOffsetMm: 0, lowerOffsetMm: 0, xA1Mm: null, yA1Mm: null, maxProfileAMm: null }
  return { ...(rec as unknown as Values), active: rec.isActive === false ? 'off' : 'on' }
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function AdminSettingsPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <SettingsPageShell
      title={t('ADMİN AYARLARI')}
      badge={<span className={styles.badge}>{t('ADMİN')}</span>}
      onBack={() => navigate('/settings')}
    >
      <AdminEditor />
    </SettingsPageShell>
  )
}

// ── Düzenleyici ─────────────────────────────────────────────────────
/** Stage yuva numarası (1..5) → değerler */
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
        window.corventa.settings.getAllStages(),
      ])
      setMachine0(m as Values)
      setMachine(m as Values)
      setGonye0(g as Values)
      setGonye(g as Values)
      const sv: StageVals = Object.fromEntries(
        SLOT_NUMBERS.map((n) => [n, stageToValues(s.find((x) => x.stageNumber === n))]),
      )
      setStages(s)
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
    for (const n of SLOT_NUMBERS) {
      for (const c of diffValues(ALL_STAGE_FIELDS, stage0[n] ?? {}, stageVals[n] ?? {}, t))
        out.push({ ...c, key: `stage${n}.${c.key}`, label: `STAGE ${n} · ${c.label}` })
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
      for (const n of SLOT_NUMBERS) {
        const { active, ...sp } = patchOf(ALL_STAGE_FIELDS, stage0[n] ?? {}, stageVals[n] ?? {})
        if (active === undefined && !Object.keys(sp).length) continue
        const isActive = (stageVals[n]?.active ?? 'off') === 'on'
        const rec = stages.find((x) => x.stageNumber === n)
        if (rec) {
          await window.corventa.settings.updateStage(rec.id, { ...(sp as Partial<StageInfo>), isActive })
        } else if (isActive) {
          // Hiç tanımlanmamış yuva aktif edildi → yeni stage kaydı
          const v = stageVals[n]
          await window.corventa.settings.createStage({
            stageNumber: n,
            name: `Stage ${n}`,
            displayOrder: n,
            leftOffsetMm: Number(v.leftOffsetMm ?? 0),
            rightOffsetMm: Number(v.rightOffsetMm ?? 0),
            lowerOffsetMm: Number(v.lowerOffsetMm ?? 0),
            xA1Mm: (v.xA1Mm as number | null) ?? null,
            yA1Mm: (v.yA1Mm as number | null) ?? null,
            maxProfileAMm: (v.maxProfileAMm as number | null) ?? null,
          })
        }
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
          <p className={styles.sectionNote}>
            {t('Makinede en fazla {n} stage tanımlanır. Pasif stage gönye ekranında ve otomatik stage önerisinde kullanılmaz. Stage 1 (gönye konumu) her zaman aktiftir.', { n: STAGE_SLOTS })}
          </p>
          {SLOT_NUMBERS.map((n) => {
            const vals = stageVals[n] ?? {}
            const on = vals.active === 'on'
            const onChange = (key: string, v: SettingValue) => {
              setMessage(null)
              setStageVals((prev) => ({ ...prev, [n]: { ...prev[n], [key]: v } }))
            }
            // Stage 1-3: geçiş hareketi sabit değerlerle yapılır → ofsetler burada sadece gösterilir
            // (DB'de değişirse büküm hesabı ile hareket ayrışır). 4-5: ofsetler buradan tanımlanır.
            if (n <= FIXED_STAGES) {
              return (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {n > 1 && (
                    <SettingsSection
                      section={{ title: `STAGE ${n}${on ? '' : ` — ${t('PASİF')}`}`, fields: [STAGE_ACTIVE_FIELD] }}
                      values={vals}
                      original={stage0[n] ?? {}}
                      onChange={onChange}
                    />
                  )}
                  <SettingsSection
                    section={{
                      title: n === 1 ? 'STAGE 1' : `STAGE ${n} — ${t('OFSETLER')}`,
                      note: 'Stage 1-3 geçiş konumları makine yazılımında sabittir; ofsetler burada sadece gösterilir.',
                      fields: STAGE_OFFSET_FIELDS,
                    }}
                    values={vals}
                    original={stage0[n] ?? {}}
                    onChange={onChange}
                    disabled
                  />
                  {on && (
                    <SettingsSection
                      section={{ title: `STAGE ${n} — ${t('BÜKÜM')}`, fields: STAGE_CALC_FIELDS }}
                      values={vals}
                      original={stage0[n] ?? {}}
                      onChange={onChange}
                    />
                  )}
                </div>
              )
            }
            return (
              <SettingsSection
                key={n}
                section={{
                  title: `STAGE ${n}${on ? '' : ` — ${t('PASİF')}`}`,
                  note: on ? 'Ofsetler gönye konumundan MUTLAK değerlerdir; stage geçişinde pistonlar bu konumlara gider.' : undefined,
                  fields: on ? ALL_STAGE_FIELDS : [STAGE_ACTIVE_FIELD],
                }}
                values={vals}
                original={stage0[n] ?? {}}
                onChange={onChange}
              />
            )
          })}
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
