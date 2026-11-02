// Ayarlar > Admin Ayarları — makinenin değiştirilebilir TÜM ayarları.
// Erişim şimdilik açık; kimin neyi düzenleyebileceği kullanıcı girişine (rol) göre ayarlanacak.
//   • Makine ayarları (Bending API MachineSettings) — sekmelere bölünmüş bölümler
//   • Gönye ofsetleri + 5 stage yuvası (aktif/pasif, ofset, XA1/YA1, maksimum profil A)
//   • Cetvel sıfırlama (gönye alma) girişi — GÖNYE & STAGE sekmesinde; sayfa /settings/encoder-reset
//   • BAKIM KURALLARI sekmesi (DataApi /api/maintenance/rules) — periyot min bakım süreleri, hatırlatma ve
//     otomatik kapanma süresi. Kayıt ADMIN+ (token main'de eklenir; 401/403 hata satırında görünür).
//     Okunamazsa (eski DataApi) sadece bu sekme hata gösterir, diğer ayarlar etkilenmez.
// Kayıt: sadece DEĞİŞEN alanlar gönderilir (main güncel kaydı okuyup üstüne yazar) ve önce
// "eski → yeni" listesiyle onay alınır. Büküm sürerken kayıt kapalıdır (backend ayarları yeniden yükler).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { MaintenancePeriodKey, MaintenanceRulesConfig, OilHeatingStatus, StageInfo } from '@shared/types'
import {
  ConfirmChangesModal,
  PagedColumns,
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
import { useCloudConfig } from '@/stores/cloudConfigStore'
import { maintenanceErrorMessage, refreshMaintenance } from '@/stores/maintenanceStore'
import { useT } from '@/i18n'
import {
  GONYE_SECTION,
  MACHINE_FIELDS,
  MAINTENANCE_RULE_KEY_PREFIX,
  MAINTENANCE_RULES_FIELDS,
  MAINTENANCE_RULES_SECTIONS,
  MACHINE_SECTIONS,
  STAGE_ACTIVE_FIELD,
  STAGE_FIELDS,
  STAGE_SLOTS,
} from './settingsFields'

const TAB_GONYE = 'GÖNYE & STAGE'
const TAB_MAINT = 'BAKIM KURALLARI'
const TAB_TEST = 'TEST'
/** Bakım kuralı değişikliklerinin Change.key öneki (makine ayarlarından ayırmak için) */
const MAINT_CHANGE_PREFIX = 'maint.'
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

/** GET /api/maintenance/rules → form değerleri (rule.<periodKey> + zamanlama alanları) */
function rulesToValues(cfg: MaintenanceRulesConfig): Values {
  const v: Values = {
    reminderAfterMinutes: cfg.reminderAfterMinutes,
    autoCloseAfterMinutes: cfg.autoCloseAfterMinutes,
  }
  for (const r of cfg.rules) v[`${MAINTENANCE_RULE_KEY_PREFIX}${r.periodKey}`] = r.minDurationMinutes
  return v
}

/** Değişen bakım kuralı alanları → PUT /api/maintenance/rules gövdesi (sadece değişenler) */
function rulesPatchBody(patch: Record<string, SettingValue>): Partial<MaintenanceRulesConfig> {
  const body: Partial<MaintenanceRulesConfig> = {}
  const rules: MaintenanceRulesConfig['rules'] = []
  for (const [k, v] of Object.entries(patch)) {
    if (k.startsWith(MAINTENANCE_RULE_KEY_PREFIX)) {
      rules.push({ periodKey: k.slice(MAINTENANCE_RULE_KEY_PREFIX.length) as MaintenancePeriodKey, minDurationMinutes: Number(v) })
    } else if (k === 'reminderAfterMinutes') body.reminderAfterMinutes = Number(v)
    else if (k === 'autoCloseAfterMinutes') body.autoCloseAfterMinutes = Number(v)
  }
  if (rules.length) body.rules = rules
  return body
}

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
  const tabs = [...MACHINE_SECTIONS.map((g) => g.tab), TAB_GONYE, TAB_MAINT]
  // Cetvel sıfırlama sayfasından geri dönüşte GÖNYE & STAGE sekmesi açık gelsin (navigate state.tab)
  const location = useLocation()
  const initialTab = (location.state as { tab?: string } | null)?.tab === 'gonye' ? TAB_GONYE : tabs[0]
  const [tab, setTab] = useState(initialTab)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [machine0, setMachine0] = useState<Values>({})
  const [machine, setMachine] = useState<Values>({})
  const [gonye0, setGonye0] = useState<Values>({})
  const [gonye, setGonye] = useState<Values>({})
  const [stages, setStages] = useState<StageInfo[]>([])
  const [stage0, setStage0] = useState<StageVals>({})
  const [stageVals, setStageVals] = useState<StageVals>({})
  // Bakım kuralları — ayrı yüklenir; okunamazsa sadece BAKIM KURALLARI sekmesi hata gösterir
  const [rules0, setRules0] = useState<Values>({})
  const [rules, setRules] = useState<Values>({})
  const [rulesError, setRulesError] = useState<string | null>(null)
  // Bulut v2 (BULUT_API_V2.md §1 madde 48): bakım politikası bulutta yönetiliyorsa not gösterilir
  const cloudMaint = useCloudConfig()?.maintenancePolicy ?? null

  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setRulesError(null)
    try {
      const v = rulesToValues(await window.corventa.settings.getMaintenanceRules())
      setRules0(v)
      setRules(v)
    } catch (e) {
      setRules0({})
      setRules({})
      setRulesError(maintenanceErrorMessage(e))
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    void loadRules()
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
  }, [loadRules])

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
    for (const c of diffValues(MAINTENANCE_RULES_FIELDS, rules0, rules, t))
      out.push({ ...c, key: `${MAINT_CHANGE_PREFIX}${c.key}`, label: `${t(TAB_MAINT)} · ${c.label}` })
    return out
  }, [machine0, machine, gonye0, gonye, stages, stage0, stageVals, rules0, rules, t])

  // Bakım kuralları büküm hesabını etkilemez → büküm sürerken de kaydedilebilir
  const machineChangeCount = changes.filter((c) => !c.key.startsWith(MAINT_CHANGE_PREFIX)).length

  async function save() {
    setSaving(true)
    setSaveError(null)
    // Bakım kuralları EN ÖNCE gider (tek yetki isteyen + aralık doğrulamalı çağrı). 401/403/400 dönerse
    // henüz hiçbir şey kaydedilmemiştir → sayfa yeniden yüklenmez, operatörün tüm düzenlemeleri korunur.
    let anySaved = false
    try {
      const rp = patchOf(MAINTENANCE_RULES_FIELDS, rules0, rules)
      if (Object.keys(rp).length) {
        await window.corventa.settings.updateMaintenanceRules(rulesPatchBody(rp))
        // Bakım ekranları yeni min süre / hatırlatma değerlerini hemen görsün
        void refreshMaintenance()
      }
      anySaved = true // buradan sonrası kısmi kayıt olabilir → hata halinde sunucu durumunu yeniden yükle
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
      // 401 (oturum yok) / 403 (yetki yok) / 400 (aralık dışı) — backend mesajı
      setSaveError(maintenanceErrorMessage(e) || errMsg(e))
      if (anySaved) await load().catch(() => undefined)
    } finally {
      setSaving(false)
    }
  }

  function revert() {
    setMachine(machine0)
    setGonye(gonye0)
    setStageVals(stage0)
    setRules(rules0)
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

      <PagedColumns resetKey={tab}>
      {tab === TAB_TEST && <TestToolsCard bendingActive={bendingActive} unsaved={machineChangeCount > 0} />}
      {group?.sections.map((s) => (
        <SettingsSection key={s.title} section={s} values={machine} original={machine0} onChange={set(setMachine)} />
      ))}

      {tab === TAB_MAINT && (
        <>
          {cloudMaint && (
            <p className={styles.message} data-kind="ok">
              {t('BULUTTAN YÖNETİLİYOR')}
              {cloudMaint.name ? ` (${cloudMaint.name})` : ''}
              {' — '}
              {t('Bakım kuralları buluttaki politikadan gelir; burada yapılan değişiklik bir sonraki senkronizasyonda buluttaki değerle değiştirilir.')}
            </p>
          )}
          {rulesError ? (
            <div className={styles.card}>
              <p className={styles.message} data-kind="err">
                {t('Bakım kuralları okunamadı')}: {rulesError}
              </p>
              <div>
                <button type="button" className={styles.resetBtn} onClick={() => void loadRules()}>
                  {t('TEKRAR DENE')}
                </button>
              </div>
            </div>
          ) : (
            MAINTENANCE_RULES_SECTIONS.map((s) => (
              <SettingsSection key={s.title} section={s} values={rules} original={rules0} onChange={set(setRules)} />
            ))
          )}
        </>
      )}

      {tab === TAB_GONYE && (
        <>
          <EncoderResetCard bendingActive={bendingActive} unsaved={changes.length > 0} />
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
                <div key={n} style={{ display: 'contents' }}>
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

      </PagedColumns>

      {(
        <div className={`${styles.footer} ${styles.footerInBody}`}>
          <span className={styles.footerInfo}>
            {changes.length ? t('{n} değişiklik kaydedilmedi', { n: changes.length }) : t('Değişiklik yok')}
          </span>
          <button type="button" className={styles.resetBtn} disabled={!changes.length} onClick={revert}>
            {t('GERİ AL')}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!changes.length || (bendingActive && machineChangeCount > 0)}
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
          warning={
            machineChangeCount > 0
              ? "Bu değerler büküm hesabını ve makine hareketlerini doğrudan etkiler. Emin değilseniz VAZGEÇ'e basın."
              : 'Bakım kuralları tüm kullanıcılar için hemen geçerli olur.'
          }
          onConfirm={() => void save()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}

// ── TEST sekmesi: bulut senkronize + yağ ısıtma ─────────────────────
const OIL_STATE_LABEL: Record<string, string> = {
  Idle: 'HAZIR',
  Gonye: 'GÖNYE ALINIYOR',
  Heating: 'ISITILIYOR',
  Returning: 'TOPLAR DÖNÜYOR',
  Completed: 'TAMAMLANDI',
  Stopped: 'DURDURULDU',
  Failed: 'HATA',
}

/** Test tuşları (sonradan kaldırılacak): ŞİMDİ SENKRONİZE ET (günlük döngüyü beklemeden push + ayar/reçete çekme)
 *  ve YAĞ ISITMA (Bending API /api/oil-heating). Yağ ısıtma ayarları aynı sekmede (KAYDET ile). */
function TestToolsCard({ bendingActive, unsaved }: { bendingActive: boolean; unsaved: boolean }) {
  const t = useT()
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [oil, setOil] = useState<OilHeatingStatus | null>(null)
  const [oilErr, setOilErr] = useState<string | null>(null)
  const [oilBusy, setOilBusy] = useState(false)
  const active = oil?.active === true
  const activeRef = useRef(active)
  activeRef.current = active

  // Durum: çalışırken 1 sn, değilse 3 sn'de bir
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const s = await window.corventa.bending.oilHeatingStatus()
        if (alive) setOil(s)
      } catch {
        /* backend anlık yok — bir sonraki turda */
      }
      if (alive) timer = setTimeout(tick, activeRef.current ? 1000 : 3000)
    }
    void tick()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [])

  async function syncNow() {
    setSyncBusy(true)
    setSyncMsg(null)
    try {
      const r = (await window.corventa.cloud.syncNow()) as { ok?: boolean; error?: string | null } | undefined
      if (r && r.ok === false) setSyncMsg({ ok: false, text: r.error ?? t('Senkronizasyon başlatılamadı') })
      else setSyncMsg({ ok: true, text: t('Senkronizasyon başlatıldı') })
    } catch (e) {
      setSyncMsg({ ok: false, text: errMsg(e) })
    } finally {
      setSyncBusy(false)
    }
  }

  async function startOil() {
    setOilBusy(true)
    setOilErr(null)
    try {
      const r = await window.corventa.bending.oilHeatingStart()
      if (!r.success) setOilErr(r.errorMessage ?? t('Yağ ısıtma başlatılamadı'))
      if (r.status) setOil(r.status)
    } catch (e) {
      setOilErr(errMsg(e))
    } finally {
      setOilBusy(false)
    }
  }

  async function stopOil() {
    setOilBusy(true)
    try {
      const r = await window.corventa.bending.oilHeatingStop()
      if (r.status) setOil(r.status)
    } catch (e) {
      setOilErr(errMsg(e))
    } finally {
      setOilBusy(false)
    }
  }

  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const startBlocked = bendingActive
    ? 'Büküm devam ediyor — yağ ısıtma başlatılamaz.'
    : unsaved
      ? 'Kaydedilmemiş değişiklik var — önce KAYDET veya GERİ AL.'
      : null

  return (
    <>
      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('BULUT SENKRONİZASYONU')}</div>
        <p className={styles.sectionNote}>
          {t('Bekleyen kayıtlar hemen buluta gönderilir; ayarlar, kalıplar ve reçeteler hemen çekilir (günlük döngüyü beklemez). Makine buluta bağlı değilse çalışmaz.')}
        </p>
        {syncMsg && (
          <p className={styles.message} data-kind={syncMsg.ok ? 'ok' : 'err'}>
            {syncMsg.text}
          </p>
        )}
        <div>
          <button type="button" className={styles.saveBtn} disabled={syncBusy} onClick={() => void syncNow()}>
            {syncBusy ? t('GÖNDERİLİYOR…') : t('ŞİMDİ SENKRONİZE ET')}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('YAĞ ISITMA PROGRAMI')}</div>
        <p className={styles.sectionNote}>
          {t('Makinede parça OLMAMALI ve hidrolik motor çalışıyor olmalı. Program önce gönye alır, sonra toplar ileri-geri hareket eder; DURDUR tüm hareketi keser.')}
        </p>
        {oil && (
          <p className={styles.message} data-kind={oil.state === 'Failed' ? 'err' : 'ok'}>
            {t(OIL_STATE_LABEL[oil.state] ?? oil.state)}
            {oil.message ? ` — ${oil.message}` : ''}
            {` · ${t('Yağ')}: ${oil.currentTempC ?? '—'} °C`}
            {oil.startedAt ? ` / ${t('hedef')} ${oil.targetTempC} °C · ${fmtTime(oil.elapsedSec)}` : ''}
          </p>
        )}
        {(oilErr || (!active && startBlocked)) && (
          <p className={styles.message} data-kind="err">
            {oilErr ?? t(startBlocked ?? '')}
          </p>
        )}
        <div>
          {active ? (
            <button type="button" className={styles.resetBtn} disabled={oilBusy} onClick={() => void stopOil()}>
              {t('DURDUR')}
            </button>
          ) : (
            <button type="button" className={styles.saveBtn} disabled={oilBusy || !!startBlocked} onClick={() => void startOil()}>
              {t('YAĞ ISITMAYI BAŞLAT')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Cetvel sıfırlama girişi ─────────────────────────────────────────
/** Cetvel sıfırlama (gönye alma) sadece admin tarafında — sayfanın kendisi /settings/encoder-reset.
 *  Büküm sürerken kapalı; kaydedilmemiş gönye/stage değişikliği varken de kapalı (gönye DB'deki
 *  kayıtlı ofsetlerle yapılır, ekrandaki kaydedilmemiş değerlerle değil). */
function EncoderResetCard({ bendingActive, unsaved }: { bendingActive: boolean; unsaved: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const blocked = bendingActive
    ? 'Büküm devam ediyor — bitene kadar cetvel sıfırlanamaz.'
    : unsaved
      ? 'Kaydedilmemiş değişiklik var — önce KAYDET veya GERİ AL.'
      : null
  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t('CETVEL SIFIRLAMA')}</div>
      <p className={styles.sectionNote}>
        {t('Gönye alınır: tüm pistonlar mekanik limite çekilir, cetveller sıfırlanır ve gönye ofsetlerine gidilir. Stage geçişi de bu ekrandan yapılır.')}
      </p>
      {blocked && (
        <p className={styles.message} data-kind="err">
          {t(blocked)}
        </p>
      )}
      <div>
        <button
          type="button"
          className={styles.resetBtn}
          disabled={!!blocked}
          onClick={() => navigate('/settings/encoder-reset')}
        >
          {t('CETVEL SIFIRLAMA EKRANINI AÇ')}
        </button>
      </div>
    </div>
  )
}
