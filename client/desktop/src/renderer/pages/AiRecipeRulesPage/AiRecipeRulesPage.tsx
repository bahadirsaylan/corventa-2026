// Ayarlar > AI ÖĞRENME KURALLARI (2026-11-19, ADMİN — makine üreticisi). AI reçete eşleşmesi (geçmiş başarılı dairesel
// bükümden düzeltme pozisyonunu alma) hangi kriterlere ne toleransla bakar, neyi yok sayar.
// Kaynak: DataApi GET/PUT /api/ai-recipe-rules (PUT [RequireRole(Admin)]); deneme: GET /api/bending-jobs/similar?explain=true.
// VARSAYILAN = eski sabit kodlu davranış (hepsi tam eşit, yağ ±2 °C, merkez mesafesi ±0,01 mm, en hızlı kayıt).
// Üç sekme, üst alana (750 px) kaydırma çubuğu olmadan sığar: DİKKATE ALINANLAR · REÇETE KALİTESİ · DENEME / NEDEN EŞLEŞMEDİ.
// Standart sürümde (FEATURES.aiRecipe=false) menüde yok, rota /settings'e döner.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { tp, useLang, useT } from '@/i18n'
import { IconLabel } from '@/components/Icon'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { SettingsPageShell, settingsFormStyles as fs } from '@/components/SettingsForm/SettingsForm'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { FEATURES } from '@shared/edition'
import { BendingMethod, BendingJobStatus } from '@shared/types'
import type {
  AiCriterionCheck,
  AiCriterionKey,
  AiExplainCandidate,
  AiRecipeExplainRequest,
  AiRecipeExplainResponse,
  AiRecipeMatchSettings,
} from '@shared/types/ai-recipe-rules'
import own from './AiRecipeRulesPage.module.css'

type T = ReturnType<typeof useT>
type NumKey = { [K in keyof AiRecipeMatchSettings]-?: AiRecipeMatchSettings[K] extends number ? K : never }[keyof AiRecipeMatchSettings]
type BoolKey = { [K in keyof AiRecipeMatchSettings]-?: AiRecipeMatchSettings[K] extends boolean ? K : never }[keyof AiRecipeMatchSettings]

const TAB_CRITERIA = 'DİKKATE ALINANLAR'
const TAB_QUALITY = 'REÇETE KALİTESİ'
const TAB_TRY = 'DENEME / NEDEN EŞLEŞMEDİ'
const TABS = [TAB_CRITERIA, TAB_QUALITY, TAB_TRY]

interface CriterionDef {
  key: AiCriterionKey
  label: string
  desc: string
  enabled: BoolKey
  tol?: NumKey
  unit?: string
  max?: number
}

const CRITERIA: CriterionDef[] = [
  { key: 'TargetDiameter', label: 'HEDEF ÇAP', desc: 'Kayıttaki hedef çap ile istenen çap farkı', enabled: 'targetDiameterEnabled', tol: 'targetDiameterTol', unit: 'mm', max: 500 },
  { key: 'PartLength', label: 'PARÇA BOYU', desc: 'Parça uzunluğu farkı', enabled: 'partLengthEnabled', tol: 'partLengthTolMm', unit: 'mm', max: 2000 },
  { key: 'StepDistance', label: 'ADIM MESAFESİ', desc: 'Rotasyon adım mesafesi farkı', enabled: 'stepDistanceEnabled', tol: 'stepDistanceTolMm', unit: 'mm', max: 100 },
  { key: 'ProfileA', label: 'PROFİL A', desc: 'Bükülen kenar (hesaba giren ölçü)', enabled: 'profileAEnabled', tol: 'profileATolMm', unit: 'mm', max: 50 },
  { key: 'ProfileB', label: 'PROFİL B', desc: 'Diğer kenar (profilde yoksa 0)', enabled: 'profileBEnabled', tol: 'profileBTolMm', unit: 'mm', max: 50 },
  { key: 'ProfileS', label: 'PROFİL S', desc: 'Et kalınlığı', enabled: 'profileSEnabled', tol: 'profileSTolMm', unit: 'mm', max: 20 },
  { key: 'BallDiameter', label: 'TOP ÇAPI', desc: 'Büküm topu çapı', enabled: 'ballDiameterEnabled', tol: 'ballDiameterTolMm', unit: 'mm', max: 50 },
  { key: 'CenterDistance', label: 'MERKEZ MESAFESİ', desc: 'Stage geometrisi — sadece büküm sırasında bilinir', enabled: 'centerDistanceEnabled', tol: 'centerDistanceTolMm', unit: 'mm', max: 50 },
  { key: 'OilTemp', label: 'YAĞ SICAKLIĞI', desc: 'Başlangıç VEYA ortalama yağ sıcaklığı tutmalı', enabled: 'oilTempEnabled', tol: 'oilTempTolC', unit: '°C', max: 50 },
  { key: 'ProfileType', label: 'PROFİL TİPİ', desc: 'Kare / boru / lama … aynı olmalı', enabled: 'profileTypeEnabled' },
]

const CRITERION_LABEL: Record<AiCriterionKey, string> = {
  ...(Object.fromEntries(CRITERIA.map((c) => [c.key, c.label])) as Record<AiCriterionKey, string>),
  FailedMeasurement: 'ÖLÇÜM HATASI',
  MaxAge: 'KAYIT YAŞI',
  Duration: 'SÜRE',
}

/** Backend ProfileType adı → ekran adı (t() ile çevrilir) */
const PROFILE_TYPE_LABELS: Record<string, string> = {
  Square: 'KARE KUTU',
  Rectangular: 'DİKDÖRTGEN KUTU',
  Round: 'BORU',
  Angle: 'KÖŞEBENT',
  Channel: 'U PROFİL',
  TProfile: 'T PROFİL',
  IProfile: 'I PROFİL',
  Flat: 'LAMA',
  Custom: 'ÖZEL KESİT',
}
const PROFILE_TYPE_NAMES = ['Square', 'Rectangular', 'Round', 'Angle', 'Channel', 'TProfile', 'IProfile', 'Flat', 'Custom']
const PROFILE_TYPE_BY_NUMBER: Record<number, string> = { 0: 'Square', 1: 'Rectangular', 2: 'Round', 3: 'Angle', 4: 'Channel', 5: 'TProfile', 6: 'IProfile', 7: 'Flat', 99: 'Custom' }

const VERDICT_LABELS: Record<string, string> = {
  SELECTED: 'KULLANILACAK',
  MATCH: 'UYGUN',
  NO_RECIPE: 'REÇETE YOK',
  ELIMINATED: 'ELENDİ',
}

const NO_RECIPE_LABELS: Record<string, string> = {
  NO_ITERATIONS: 'GERİ ESNEME ÖLÇÜMÜ YOK',
  SINGLE_MEASUREMENT: 'TEK ÖLÇÜMDE BİTMİŞ — DÜZELTME YAPILMAMIŞ',
  NOT_WITHIN_TOLERANCE: 'SON ÖLÇÜM TOLERANS DIŞINDA',
  NO_CORRECTION: 'GEÇERLİ DÜZELTME POZİSYONU YOK',
}

const CLOUD_NOTE_LABELS: Record<string, string> = {
  CLOUD_MATCH: 'BULUT REÇETESİ KULLANILACAK',
  CLOUD_DISABLED_BY_RULES: 'BULUT REÇETELERİ KURALLARDA KAPALI',
  CLOUD_SHARE_OFF: 'BULUT REÇETE PAYLAŞIMI KAPALI',
  CLOUD_NO_CENTER_DISTANCE: 'BULUT: MERKEZ MESAFESİ GİRİLMEDİ',
  CLOUD_NO_CANDIDATE: 'BULUTTA UYGUN REÇETE YOK',
  CLOUD_NO_RECIPE: 'BULUTTA UYGUN REÇETE YOK',
  CLOUD_MIN_RECORDS_NOT_MET: 'BULUTTA YETERLİ KAYIT YOK',
  CLOUD_ERROR: 'BULUT ARAMASI BAŞARISIZ',
}

const PAGE_SIZE = 5

function fmt(v: number | null | undefined, lang: string, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString(lang === 'en' ? 'en-GB' : 'tr-TR', { maximumFractionDigits: digits })
}

function fmtDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—'
  const d = new Date(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function sameSettings(a: AiRecipeMatchSettings, b: AiRecipeMatchSettings): boolean {
  return (Object.keys(b) as Array<keyof AiRecipeMatchSettings>)
    .filter((k) => k !== 'updatedAt' && k !== 'updatedBy')
    .every((k) => a[k] === b[k])
}

function countChanges(a: AiRecipeMatchSettings, b: AiRecipeMatchSettings): number {
  return (Object.keys(b) as Array<keyof AiRecipeMatchSettings>)
    .filter((k) => k !== 'updatedAt' && k !== 'updatedBy' && a[k] !== b[k]).length
}

/** Bir kriter sonucunun ekran metni (değerler + tolerans) */
function checkText(c: AiCriterionCheck, t: T, lang: string): string {
  const label = t(CRITERION_LABEL[c.key] ?? c.key)
  const unit = c.unit === 'gün' ? t('gün') : c.unit === 'sn' ? t('sn') : c.unit
  if (c.note === 'IGNORED') return t('{label}: YOK SAYILDI', { label })
  if (c.note === 'NOT_REQUESTED') return t('{label}: DENEMEDE GİRİLMEDİ — BAKILMADI', { label })
  switch (c.key) {
    case 'OilTemp': {
      if (c.actual == null && c.actual2 == null)
        return c.passed
          ? t('YAĞ SICAKLIĞI KAYDI YOK — İZİN VERİLDİ')
          : t('YAĞ SICAKLIĞI KAYDI YOK — İSTENEN {w} ±{tol} °C', { w: fmt(c.wanted, lang), tol: fmt(c.tolerance, lang) })
      return t('YAĞ {a} / ORT. {b} °C — İSTENEN {w} ±{tol} °C', {
        a: fmt(c.actual, lang), b: fmt(c.actual2, lang), w: fmt(c.wanted, lang), tol: fmt(c.tolerance, lang),
      })
    }
    case 'ProfileType':
      return t('PROFİL TİPİ {a} — İSTENEN {w}', {
        a: t(PROFILE_TYPE_LABELS[c.actualText ?? ''] ?? c.actualText ?? '—'),
        w: t(PROFILE_TYPE_LABELS[c.wantedText ?? ''] ?? c.wantedText ?? '—'),
      })
    case 'FailedMeasurement':
      return c.actualText === 'true' ? t('ÖLÇÜM HATASI İŞARETLİ') : t('ÖLÇÜM HATASI YOK')
    case 'MaxAge':
      return t('KAYIT {a} GÜN ÖNCE — SINIR {tol} GÜN', { a: fmt(c.actual, lang, 1), tol: fmt(c.tolerance, lang, 0) })
    case 'Duration':
      return c.passed ? t('SÜRE {a} sn', { a: fmt(c.actual, lang, 0) }) : t('SÜRE KAYDI YOK')
    default:
      return c.tolerance && c.tolerance > 0
        ? t('{label}: {a} {unit} — İSTENEN {w} ±{tol}', { label, a: fmt(c.actual, lang), unit, w: fmt(c.wanted, lang), tol: fmt(c.tolerance, lang) })
        : t('{label}: {a} {unit} — İSTENEN {w} (TAM EŞİT)', { label, a: fmt(c.actual, lang), unit, w: fmt(c.wanted, lang) })
  }
}

export default function AiRecipeRulesPage() {
  const navigate = useNavigate()
  const t = useT()
  const [tab, setTab] = useState(TAB_CRITERIA)
  const [saved, setSaved] = useState<AiRecipeMatchSettings | null>(null)
  const [defaults, setDefaults] = useState<AiRecipeMatchSettings | null>(null)
  const [draft, setDraft] = useState<AiRecipeMatchSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const r = await window.corventa.bending.getAiRecipeRules()
      setSaved(r.settings)
      setDraft(r.settings)
      setDefaults(r.defaults)
    } catch (e) {
      setLoadError(tp(e instanceof Error ? e.message : String(e)))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const set = useCallback(<K extends keyof AiRecipeMatchSettings>(k: K, v: AiRecipeMatchSettings[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d))
    setMessage(null)
  }, [])

  const changes = draft && saved ? countChanges(draft, saved) : 0
  const isDefaultDraft = draft && defaults ? sameSettings(draft, defaults) : true

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMessage(null)
    try {
      const r = await window.corventa.bending.saveAiRecipeRules(draft)
      setSaved(r.settings)
      setDraft(r.settings)
      setMessage({ kind: 'ok', text: t('KURALLAR KAYDEDİLDİ') })
    } catch (e) {
      setMessage({ kind: 'err', text: tp(e instanceof Error ? e.message : String(e)) })
    } finally {
      setSaving(false)
    }
  }

  const footer = draft && (
    <>
      <span className={fs.footerInfo}>
        {message ? (
          <span className={own.footerMsg} data-kind={message.kind}>{message.text}</span>
        ) : changes > 0 ? (
          t('{n} DEĞİŞİKLİK KAYDEDİLMEDİ', { n: changes })
        ) : isDefaultDraft ? (
          t('VARSAYILAN KURALLAR (eski davranış)')
        ) : (
          t('ÖZEL KURALLAR ETKİN')
        )}
      </span>
      <button type="button" className={fs.resetBtn} disabled={saving || changes === 0} onClick={() => saved && setDraft(saved)}>
        {t('DEĞİŞİKLİKLERİ GERİ AL')}
      </button>
      <button type="button" className={fs.resetBtn} disabled={saving || isDefaultDraft} onClick={() => defaults && setDraft({ ...defaults })}>
        {t('VARSAYILANA DÖN')}
      </button>
      <button type="button" className={fs.saveBtn} disabled={saving || changes === 0} onClick={() => void save()}>
        {saving ? t('KAYDEDİLİYOR…') : t('KAYDET')}
      </button>
    </>
  )

  return (
    <SettingsPageShell title={t('AI ÖĞRENME KURALLARI')} onBack={() => navigate('/settings')} footer={footer}>
      <div className={own.root}>
        <div className={fs.tabs}>
          {TABS.map((x) => (
            <button key={x} type="button" className={fs.tab} data-on={x === tab || undefined} onClick={() => setTab(x)}>
              {t(x)}
            </button>
          ))}
        </div>
        {loadError && (
          <div className={fs.card}>
            <p className={fs.message} data-kind="err">{t('Kurallar okunamadı')}: {loadError}</p>
            <button type="button" className={fs.resetBtn} onClick={() => void load()}>{t('TEKRAR DENE')}</button>
          </div>
        )}
        {draft && defaults && tab === TAB_CRITERIA && <CriteriaTab draft={draft} defaults={defaults} set={set} />}
        {draft && defaults && tab === TAB_QUALITY && <QualityTab draft={draft} defaults={defaults} set={set} />}
        {draft && tab === TAB_TRY && <TryTab unsaved={changes > 0} />}
      </div>
    </SettingsPageShell>
  )
}

// ───────────────────────── ortak parçalar ─────────────────────────

function NumberButton({
  label, value, unit, onChange, disabled, digits = 2, integer, max,
}: {
  label: string
  value: number | null
  unit?: string
  onChange: (v: number) => void
  disabled?: boolean
  digits?: number
  integer?: boolean
  max?: number
}) {
  const lang = useLang()
  const [editing, setEditing] = useState(false)
  return (
    <>
      <button type="button" className={`${fs.valueBtn} ${own.numBtn}`} disabled={disabled} onClick={() => setEditing(true)}>
        <span className={fs.valueNum}>{value == null ? '—' : fmt(value, lang, digits)}</span>
        {unit && <span className={fs.unit}>{unit}</span>}
      </button>
      {editing && (
        <NumpadModal
          fieldLabel={label}
          initialValue={value == null ? '' : String(value)}
          onConfirm={(s) => {
            const n = Number(String(s).replace(',', '.'))
            if (Number.isFinite(n) && n >= 0) onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, integer ? Math.round(n) : n))
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

function Seg<V extends string | boolean>({
  value, options, onChange,
}: {
  value: V
  options: Array<{ v: V; label: string }>
  onChange: (v: V) => void
}) {
  const t = useT()
  return (
    <div className={`${fs.segmented} ${own.seg}`}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" className={fs.segBtn} data-on={o.v === value || undefined} onClick={() => onChange(o.v)}>
          {t(o.label)}
        </button>
      ))}
    </div>
  )
}

type SetFn = <K extends keyof AiRecipeMatchSettings>(k: K, v: AiRecipeMatchSettings[K]) => void

// ───────────────────────── DİKKATE ALINANLAR ─────────────────────────

function CriteriaTab({ draft, defaults, set }: { draft: AiRecipeMatchSettings; defaults: AiRecipeMatchSettings; set: SetFn }) {
  const t = useT()
  const lang = useLang()
  return (
    <div className={`${fs.card} ${own.fill}`}>
      <p className={fs.sectionNote}>
        {t('Geçmiş büküm reçete olsun diye DİKKATE ALINAN her kriter tutmalı (tolerans 0 = tam eşit). Sıcaklık değişince eski büküm eşleşmiyorsa YAĞ SICAKLIĞI toleransını genişletin. Yağ nemi kayda yazılmadığından kriter olamaz.')}
      </p>
      <div className={own.critGrid}>
        <span className={own.colHead}>{t('KRİTER')}</span>
        <span className={own.colHead}>{t('TOLERANS (±)')}</span>
        <span className={own.colHead}>{t('KARAR')}</span>
        {CRITERIA.map((c) => {
          const on = draft[c.enabled] as boolean
          const changed = draft[c.enabled] !== defaults[c.enabled] || (c.tol && draft[c.tol] !== defaults[c.tol])
            || (c.key === 'TargetDiameter' && draft.targetDiameterTolUnit !== defaults.targetDiameterTolUnit)
            || (c.key === 'OilTemp' && draft.oilTempAllowMissing !== defaults.oilTempAllowMissing)
          const pct = c.key === 'TargetDiameter' && draft.targetDiameterTolUnit === 'PCT'
          const tolVal = c.tol ? (draft[c.tol] as number) : null
          const defTol = c.tol ? (defaults[c.tol] as number) : null
          return (
            <div key={c.key} className={own.critRow} data-off={!on || undefined} data-changed={changed || undefined}>
              <div className={own.critInfo}>
                <span className={fs.label}>{t(c.label)}</span>
                <span className={fs.desc}>
                  {t(c.desc)}
                  {defTol != null && (
                    <span className={own.defHint}>
                      {' · '}
                      {defTol > 0 ? t('varsayılan ±{v}', { v: `${fmt(defTol, lang)} ${c.unit}` }) : t('varsayılan tam eşit')}
                    </span>
                  )}
                </span>
              </div>
              <div className={own.tolCell}>
                {c.tol ? (
                  <>
                    <NumberButton
                      label={`${t(c.label)} ±`}
                      value={tolVal}
                      unit={pct ? '%' : c.unit}
                      max={pct ? 20 : c.max}
                      disabled={!on}
                      onChange={(v) => set(c.tol as NumKey, v)}
                    />
                    {c.key === 'TargetDiameter' && (
                      <Seg
                        value={draft.targetDiameterTolUnit}
                        options={[{ v: 'MM', label: 'mm' }, { v: 'PCT', label: '%' }]}
                        onChange={(v) => set('targetDiameterTolUnit', v)}
                      />
                    )}
                    {c.key === 'OilTemp' && (
                      <button
                        type="button"
                        className={own.chip}
                        data-on={draft.oilTempAllowMissing || undefined}
                        disabled={!on}
                        onClick={() => set('oilTempAllowMissing', !draft.oilTempAllowMissing)}
                      >
                        {draft.oilTempAllowMissing ? t('YAĞ KAYDI OLMAYAN İŞLER DE') : t('YAĞ KAYDI OLMAYAN ELENİR')}
                      </button>
                    )}
                    {on && tolVal === 0 && <span className={own.exact}>{t('TAM EŞİT')}</span>}
                  </>
                ) : (
                  <span className={own.exact}>{t('AYNI OLMALI')}</span>
                )}
              </div>
              <Seg
                value={on}
                options={[{ v: true, label: 'DİKKATE AL' }, { v: false, label: 'YOK SAY' }]}
                onChange={(v) => set(c.enabled, v)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────────── REÇETE KALİTESİ ─────────────────────────

function QualityTab({ draft, defaults, set }: { draft: AiRecipeMatchSettings; defaults: AiRecipeMatchSettings; set: SetFn }) {
  const t = useT()
  const row = (changed: boolean, label: string, desc: string, control: ReactNode) => (
    <div className={own.qRow} data-changed={changed || undefined}>
      <div className={own.critInfo}>
        <span className={fs.label}>{t(label)}</span>
        <span className={fs.desc}>{t(desc)}</span>
      </div>
      <div className={own.qControl}>{control}</div>
    </div>
  )
  return (
    <div className={`${fs.card} ${own.fill}`}>
      <p className={fs.sectionNote}>
        {t('Kriterlerden geçen kayıtların hangisinin reçete olacağını belirler. Varsayılanlar eski davranışla aynıdır.')}
      </p>
      {row(draft.requireWithinTolerance !== defaults.requireWithinTolerance, 'SON ÖLÇÜM TOLERANS İÇİNDE BİTMİŞ OLSUN',
        'Kapalıysa toleransa girmeden bitmiş kayıtların son düzeltmesi de kullanılır (önerilmez)',
        <Seg value={draft.requireWithinTolerance} options={[{ v: true, label: 'EVET' }, { v: false, label: 'HAYIR' }]} onChange={(v) => set('requireWithinTolerance', v)} />)}
      {row(draft.excludeFailedMeasurement !== defaults.excludeFailedMeasurement, 'ÖLÇÜM HATALI İŞLER KULLANILMASIN',
        'Ölçüm hatası işaretli bükümler reçete olamaz',
        <Seg value={draft.excludeFailedMeasurement} options={[{ v: true, label: 'EVET' }, { v: false, label: 'HAYIR' }]} onChange={(v) => set('excludeFailedMeasurement', v)} />)}
      {row(draft.minSuccessfulRecords !== defaults.minSuccessfulRecords, 'EN AZ UYGUN KAYIT SAYISI',
        'Bu kadar uygun kayıt birikmeden AI reçete kullanılmaz (1 = ilk başarılı kayıt yeter)',
        <NumberButton label={t('EN AZ UYGUN KAYIT SAYISI')} value={draft.minSuccessfulRecords} integer digits={0} max={20}
          onChange={(v) => set('minSuccessfulRecords', Math.max(1, v))} />)}
      {row(draft.selection !== defaults.selection, 'HANGİ KAYIT KULLANILSIN',
        'En hızlı biten (en az düzeltme) ya da en son yapılan uygun büküm',
        <Seg value={draft.selection} options={[{ v: 'FASTEST', label: 'EN HIZLI' }, { v: 'NEWEST', label: 'EN YENİ' }]} onChange={(v) => set('selection', v)} />)}
      {row(draft.maxRecordAgeDays !== defaults.maxRecordAgeDays, 'KAYIT YAŞI SINIRI',
        'Bu günden eski bükümler kullanılmaz (0 = sınır yok)',
        <NumberButton label={t('KAYIT YAŞI SINIRI')} value={draft.maxRecordAgeDays} unit={t('gün')} integer digits={0} max={3650}
          onChange={(v) => set('maxRecordAgeDays', v)} />)}
      {FEATURES.cloudRecipes && row(draft.includeCloudRecipes !== defaults.includeCloudRecipes, 'BULUT REÇETELERİ',
        'Yerelde eşleşme yoksa paylaşılan bulut reçetelerine bak (Bulut Bağlantısı > reçete paylaşımı da açık olmalı)',
        <Seg value={draft.includeCloudRecipes} options={[{ v: true, label: 'KULLAN' }, { v: false, label: 'KULLANMA' }]} onChange={(v) => set('includeCloudRecipes', v)} />)}
      {FEATURES.cloudRecipes && row(draft.cloudCenterDistanceTolMm !== defaults.cloudCenterDistanceTolMm, 'BULUT — MERKEZ MESAFESİ TOLERANSI',
        'Başka makinenin reçetesinde merkez mesafesi her zaman aranır (0 = tam eşit)',
        <NumberButton label={t('BULUT — MERKEZ MESAFESİ TOLERANSI')} value={draft.cloudCenterDistanceTolMm} unit="mm" max={50}
          disabled={!draft.includeCloudRecipes} onChange={(v) => set('cloudCenterDistanceTolMm', v)} />)}
    </div>
  )
}

// ───────────────────────── DENEME / NEDEN EŞLEŞMEDİ ─────────────────────────

interface TryForm {
  targetDiameterMm: number | null
  partLengthMm: number | null
  stepDistanceMm: number | null
  profileA: number | null
  profileB: number | null
  profileS: number | null
  ballDiameterMm: number | null
  centerDistanceMm: number | null
  oilTempC: number | null
  profileType: string
}

const EMPTY_FORM: TryForm = {
  targetDiameterMm: null, partLengthMm: null, stepDistanceMm: null, profileA: null, profileB: 0, profileS: 0,
  ballDiameterMm: 220, centerDistanceMm: null, oilTempC: null, profileType: '',
}

// Sayfadan çıkıp dönünce form korunur
let lastForm: TryForm | null = null

const FORM_FIELDS: Array<{ key: Exclude<keyof TryForm, 'profileType'>; label: string; unit: string; optional?: boolean }> = [
  { key: 'targetDiameterMm', label: 'HEDEF ÇAP', unit: 'mm' },
  { key: 'partLengthMm', label: 'PARÇA BOYU', unit: 'mm' },
  { key: 'stepDistanceMm', label: 'ADIM MESAFESİ', unit: 'mm' },
  { key: 'profileA', label: 'PROFİL A', unit: 'mm' },
  { key: 'profileB', label: 'PROFİL B', unit: 'mm' },
  { key: 'profileS', label: 'PROFİL S', unit: 'mm' },
  { key: 'ballDiameterMm', label: 'TOP ÇAPI', unit: 'mm' },
  { key: 'centerDistanceMm', label: 'MERKEZ MESAFESİ', unit: 'mm', optional: true },
  { key: 'oilTempC', label: 'YAĞ SICAKLIĞI', unit: '°C', optional: true },
]

function TryTab({ unsaved }: { unsaved: boolean }) {
  const t = useT()
  const lang = useLang()
  const [form, setForm] = useState<TryForm>(lastForm ?? EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiRecipeExplainResponse | null>(null)
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<AiExplainCandidate | null>(null)
  const [prefillNote, setPrefillNote] = useState<string | null>(null)

  useEffect(() => {
    lastForm = form
  }, [form])

  const prefill = useCallback(async () => {
    setError(null)
    setPrefillNote(null)
    const oil = useMachineStateStore.getState().state.sensors.oilTempC
    try {
      const jobs = await window.corventa.bending.listJobs({ limit: 50 })
      const j = jobs.find((x) => x.method === BendingMethod.FullCircle && x.status === BendingJobStatus.Completed)
        ?? jobs.find((x) => x.method === BendingMethod.FullCircle)
      if (!j) {
        setPrefillNote(t('Dairesel büküm kaydı bulunamadı'))
        setForm((f) => ({ ...f, oilTempC: oil > 0 ? Math.round(oil) : f.oilTempC }))
        return
      }
      setForm({
        targetDiameterMm: j.targetDiameterMm ?? null,
        partLengthMm: j.partLengthMm ?? null,
        stepDistanceMm: j.stepDistanceMm ?? null,
        profileA: j.profileA ?? null,
        profileB: j.profileB ?? 0,
        profileS: j.profileS ?? 0,
        ballDiameterMm: j.ballDiameterMm || 220,
        centerDistanceMm: j.centerDistanceMm || null,
        oilTempC: oil > 0 ? Math.round(oil) : null,
        profileType: PROFILE_TYPE_BY_NUMBER[j.profileType as number] ?? '',
      })
      setPrefillNote(t('İŞ #{id} DEĞERLERİ + ŞU ANKİ YAĞ SICAKLIĞI', { id: j.id }))
    } catch (e) {
      setError(tp(e instanceof Error ? e.message : String(e)))
    }
  }, [t])

  const valid = (form.targetDiameterMm ?? 0) > 0 && (form.partLengthMm ?? 0) > 0 && (form.stepDistanceMm ?? 0) > 0
    && (form.profileA ?? 0) > 0 && (form.ballDiameterMm ?? 0) > 0

  const run = async () => {
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      const req: AiRecipeExplainRequest = {
        targetDiameterMm: form.targetDiameterMm!, partLengthMm: form.partLengthMm!, stepDistanceMm: form.stepDistanceMm!,
        profileA: form.profileA!, profileB: form.profileB ?? 0, profileS: form.profileS ?? 0, ballDiameterMm: form.ballDiameterMm!,
        oilTempC: form.oilTempC ?? undefined, centerDistanceMm: form.centerDistanceMm ?? undefined,
        profileType: form.profileType || undefined, explainLimit: 30,
      }
      setResult(await window.corventa.bending.explainSimilar(req))
      setPage(0)
    } catch (e) {
      setError(tp(e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  const ex = result?.explain
  const cands = ex?.candidates ?? []
  const pages = Math.max(1, Math.ceil(cands.length / PAGE_SIZE))
  const shown = cands.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const summary = useMemo(() => {
    if (!result || !ex) return null
    if (result.match && ex.source === 'cloud') return t('SONUÇ: BULUT REÇETESİ KULLANILACAK')
    if (result.match) return t('SONUÇ: İŞ #{id} REÇETE OLARAK KULLANILACAK', { id: result.match.id })
    return t('SONUÇ: EŞLEŞME YOK — KLASİK AKIŞ (ölç → düzelt)')
  }, [result, ex, t])

  return (
    <div className={own.tryWrap}>
      <div className={`${fs.card} ${own.formCard}`}>
        <div className={own.formGrid}>
          {FORM_FIELDS.map((f) => (
            <label key={f.key} className={own.formField}>
              <span className={own.formLabel}>{t(f.label)}{f.optional ? ` (${t('ops.')})` : ''}</span>
              <NumberButton label={t(f.label)} value={form[f.key]} unit={f.unit}
                onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
            </label>
          ))}
          <label className={own.formField}>
            <span className={own.formLabel}>{t('PROFİL TİPİ')} ({t('ops.')})</span>
            <select className={own.select} value={form.profileType} onChange={(e) => setForm((x) => ({ ...x, profileType: e.target.value }))}>
              <option value="">—</option>
              {PROFILE_TYPE_NAMES.map((n) => <option key={n} value={n}>{t(PROFILE_TYPE_LABELS[n])}</option>)}
            </select>
          </label>
        </div>
        <div className={own.formActions}>
          <button type="button" className={fs.resetBtn} onClick={() => void prefill()} disabled={busy}>
            <IconLabel icon="reset">{t('SON İŞTEN DOLDUR')}</IconLabel>
          </button>
          {(form.oilTempC != null || form.centerDistanceMm != null) && (
            <button type="button" className={fs.resetBtn} onClick={() => setForm((x) => ({ ...x, oilTempC: null, centerDistanceMm: null }))} disabled={busy}>
              {t('YAĞ / MERKEZ TEMİZLE')}
            </button>
          )}
          <span className={own.formNote}>
            {unsaved ? <b className={own.warn}>{t('KAYDEDİLMEMİŞ DEĞİŞİKLİK VAR — deneme KAYITLI kurallarla yapılır')}</b> : prefillNote}
          </span>
          <button type="button" className={fs.saveBtn} disabled={!valid || busy} onClick={() => void run()}>
            <IconLabel icon="search">{busy ? t('ARANIYOR…') : t('DENE')}</IconLabel>
          </button>
        </div>
      </div>

      <div className={`${fs.card} ${own.resultCard}`}>
        {error && <p className={fs.message} data-kind="err">{error}</p>}
        {!result && !error && <div className={own.empty}>{t('Değerleri girin (veya son işten doldurun) ve DENE’ye basın')}</div>}
        {ex && (
          <>
            <div className={own.summary} data-ok={!!result?.match || undefined}>
              <span className={own.summaryMain}>{summary}</span>
              <span className={own.summaryMeta}>
                {t('{n} DAİRESEL İŞ TARANDI · {p} KRİTERLERDEN GEÇTİ · {r} REÇETE OLABİLİR · EN AZ {m} GEREKLİ', {
                  n: ex.scanned, p: ex.filterPassedCount, r: ex.recipeReadyCount, m: ex.minSuccessfulRecords,
                })}
                {!result?.match && ex.cloudNote ? ` · ${t(CLOUD_NOTE_LABELS[ex.cloudNote] ?? ex.cloudNote)}` : ''}
              </span>
            </div>
            <table className={own.table}>
              <thead>
                <tr>
                  <th>{t('İŞ')}</th>
                  <th>{t('TARİH')}</th>
                  <th>{t('SONUÇ')}</th>
                  <th>{t('NEDEN')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={4} className={own.empty}>{t('Dairesel büküm kaydı yok')}</td></tr>}
                {shown.map((c) => (
                  <tr key={c.jobId} className={own.clickRow} onClick={() => setDetail(c)}>
                    <td className={own.mono}>#{c.jobId < 0 ? `B${-c.jobId}` : c.jobId}</td>
                    <td className={own.mono}>{fmtDate(c.completedAt ?? c.createdAt, lang)}</td>
                    <td><span className={own.pill} data-v={c.verdict}>{t(VERDICT_LABELS[c.verdict] ?? c.verdict)}</span></td>
                    <td className={own.reason}>
                      {c.verdict === 'ELIMINATED'
                        ? c.checks.filter((x) => !x.passed).map((x) => checkText(x, t, lang)).join(' · ')
                        : c.verdict === 'NO_RECIPE'
                          ? t(NO_RECIPE_LABELS[c.noRecipeCode ?? ''] ?? c.noRecipeText ?? '—')
                          : t('{n} ÖLÇÜM · REÇETE {pos} mm · SÜRE {d} sn', {
                              n: c.iterationCount, pos: fmt(c.recipePositionMm, lang), d: fmt(c.durationSeconds, lang, 0),
                            })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={own.pager}>
              <button type="button" className={own.pagerBtn} disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                <IconLabel icon="chevronLeft">{t('ÖNCEKİ')}</IconLabel>
              </button>
              <span className={own.pagerInfo}>{t('SAYFA {p} / {n}', { p: page + 1, n: pages })}</span>
              <button type="button" className={own.pagerBtn} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                <IconLabel icon="chevronRight" trailing>{t('SONRAKİ')}</IconLabel>
              </button>
            </div>
          </>
        )}
      </div>

      {detail && <CandidateDetail c={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function CandidateDetail({ c, onClose }: { c: AiExplainCandidate; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const status = (x: AiCriterionCheck) =>
    x.note === 'IGNORED' ? 'IGNORED' : !x.applied ? 'SKIPPED' : x.passed ? 'OK' : 'FAIL'
  const STATUS_LABEL: Record<string, string> = { IGNORED: 'YOK SAYILDI', SKIPPED: 'BAKILMADI', OK: 'UYGUN', FAIL: 'ELENDİ' }
  return (
    <div className={own.dlgOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={own.dlg} onClick={(e) => e.stopPropagation()}>
        <div className={own.dlgTitle}>
          {t('İŞ #{id}', { id: c.jobId })} · {fmtDate(c.completedAt ?? c.createdAt, lang)}
          <span className={own.pill} data-v={c.verdict}>{t(VERDICT_LABELS[c.verdict] ?? c.verdict)}</span>
        </div>
        <div className={own.dlgSub}>
          {t(PROFILE_TYPE_LABELS[c.profileType] ?? c.profileType)} {fmt(c.profileA, lang)}×{fmt(c.profileB, lang)}×{fmt(c.profileS, lang)}
          {' · Ø'}{fmt(c.targetDiameterMm, lang)} mm · {t('{n} ÖLÇÜM', { n: c.iterationCount })}
          {c.recipePositionMm != null ? ` · ${t('REÇETE {pos} mm', { pos: fmt(c.recipePositionMm, lang) })}` : ''}
          {c.noRecipeCode ? ` · ${t(NO_RECIPE_LABELS[c.noRecipeCode] ?? c.noRecipeCode)}` : ''}
        </div>
        <div className={own.dlgChecks}>
          {c.checks.map((x) => (
            <div key={x.key} className={own.dlgCheck} data-s={status(x)}>
              <span className={own.dlgStatus}>{t(STATUS_LABEL[status(x)])}</span>
              <span>{checkText(x, t, lang)}</span>
            </div>
          ))}
        </div>
        <button type="button" className={own.dlgClose} onClick={onClose}>{t('KAPAT')}</button>
      </div>
    </div>
  )
}
