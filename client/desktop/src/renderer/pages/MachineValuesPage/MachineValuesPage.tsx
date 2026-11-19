// Ayarlar > MAKİNE DEĞERLERİ (2026-11-19, sadece SÜPERADMİN) — makineden gelen TÜM canlı değerler + motor / fan / alarm.
// Kaynak: SignalR /machineHub StateUpdated (MachineState, ~10 Hz) → machineStateStore. Ekran sadece okur;
// komutlar mevcut uçlar: POST /api/machine/motor | fan | alarm { value }.
// Eksik alan kalmasın diye: piston / pnömatik tabloları satırlarını nesnenin KENDİ anahtarlarından üretir; bilinen
// alanların dışında state'e eklenen her yeni alan (ad + değer) otomatik olarak DİĞER sekmesinde görünür.
// Emniyet girişleri ACTIVE LOW: backend ...OK=true → sağlam. Kirlilik K1-K3: true = KİRLİ (PLC GVL_IO).
// Üst alan 750 px — kaydırma çubuğu YOK: bölümler sekmelerde, DİĞER sekmesi sayfalı.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useT, tp } from '@/i18n'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import type { ConnectionState, MachineState } from '@shared/types'
import { SIDE_RULERS } from '@shared/sideRulers'
import styles from './MachineValuesPage.module.css'

type Tone = 'ok' | 'bad' | 'warn' | 'idle' | 'plain'
type T = (s: string, v?: Record<string, string | number>) => string

/** Bir alanın ekrandaki gösterimi: metin + renk tonu + (varsa) çip */
interface Shown {
  text: string
  tone: Tone
  chip?: boolean
}

type Kind = 'num' | 'num3' | 'int' | 'okFault' | 'onOff' | 'presence' | 'dirty' | 'yesNo' | 'zeroed' | 'text' | 'motionDir'
  | 'rotDir' | 'pneuDir' | 'motor' | 'mode' | 'error' | 'bits' | 'time' | 'gonye' | 'alarm'

interface Field {
  path: string
  label: string
  unit?: string
  kind: Kind
}

const MODE_LABELS: Record<number, string> = { 0: 'MANUEL', 1: 'YARI OTOMATİK', 2: 'OTOMATİK', 3: 'KURULUM / AYAR' }
const MOTOR_LABELS: Record<number, string> = { 0: 'KAPALI', 1: 'BAŞLIYOR', 2: 'ÇALIŞIYOR' }
const ERROR_LABELS: Record<number, string> = {
  0: 'HATA YOK',
  1: 'ACİL STOP',
  2: 'MOTOR TERMİK',
  3: 'FAN TERMİK',
  4: 'FAZ SIRASI',
  11: 'SİSTEM HAZIR DEĞİL',
  12: 'VALF AÇILMADI',
  13: 'HABERLEŞME HATASI',
  14: 'MOTOR HAZIR DEĞİL',
  20: 'HAREKET ZAMAN AŞIMI',
  21: 'TAKILMA ALGILANDI',
  22: 'EK VALF ZAMAN AŞIMI',
  31: 'YAĞ SICAKLIĞI YÜKSEK',
  32: 'YAĞ SEVİYESİ DÜŞÜK',
  33: 'YAĞ KİRLİ',
  41: 'PARÇA ALGILANMADI',
  42: 'PARÇA HİZASIZ',
  99: 'ROTASYON YÖN ÇAKIŞMASI',
}
const CONN_LABELS: Record<ConnectionState, string> = {
  connected: 'BAĞLI',
  connecting: 'BAĞLANIYOR',
  reconnecting: 'YENİDEN BAĞLANIYOR',
  disconnected: 'BAĞLI DEĞİL',
  error: 'HATA',
}

// ── Bölüm tanımları ──────────────────────────────────────────

const SYSTEM_FIELDS: Field[] = [
  { path: 'mode', label: 'ÇALIŞMA MODU', kind: 'mode' },
  { path: 'hydraulicMotorState', label: 'HİDROLİK MOTOR', kind: 'motor' },
  { path: 'fanActive', label: 'FAN', kind: 'onOff' },
  { path: 'alarmActive', label: 'ALARM', kind: 'alarm' },
  { path: 'systemReady', label: 'SİSTEM HAZIR', kind: 'yesNo' },
  { path: 'errorCode', label: 'HATA KODU', kind: 'error' },
  { path: 'safetyBits', label: 'EMNİYET BİTLERİ', kind: 'bits' },
  { path: 'timestamp', label: 'SON VERİ ZAMANI', kind: 'time' },
  { path: 'physicalInfo.isGonyeCompleted', label: 'GÖNYE', kind: 'gonye' },
  { path: 'physicalInfo.currentStage', label: 'AKTİF STAGE', kind: 'int' },
  { path: 'physicalInfo.currentStageName', label: 'STAGE ADI', kind: 'text' },
]

const SAFETY_FIELDS: Field[] = [
  { path: 'safety.emergencyStopOK', label: 'ACİL STOP', kind: 'okFault' },
  { path: 'safety.motorThermalOK', label: 'MOTOR TERMİK', kind: 'okFault' },
  { path: 'safety.fanThermalOK', label: 'FAN TERMİK', kind: 'okFault' },
  { path: 'safety.phaseSequenceOK', label: 'FAZ SIRASI', kind: 'okFault' },
  { path: 'safety.leftPartSensor', label: 'SOL PARÇA SENSÖRÜ', kind: 'presence' },
  { path: 'safety.rightPartSensor', label: 'SAĞ PARÇA SENSÖRÜ', kind: 'presence' },
  { path: 'safety.contaminationK1', label: 'KİRLİLİK SENSÖRÜ K1', kind: 'dirty' },
  { path: 'safety.contaminationK2', label: 'KİRLİLİK SENSÖRÜ K2', kind: 'dirty' },
  { path: 'safety.contaminationK3', label: 'KİRLİLİK SENSÖRÜ K3', kind: 'dirty' },
]

const OIL_FIELDS: Field[] = [
  { path: 'sensors.s1PressureBar', label: 'S1 BASINÇ (ÜST / ALT)', unit: 'bar', kind: 'int' },
  { path: 'sensors.s2PressureBar', label: 'S2 BASINÇ (SAĞ / SOL)', unit: 'bar', kind: 'int' },
  { path: 'sensors.s1FlowCms', label: 'S1 AKIŞ', kind: 'int' },
  { path: 'sensors.s2FlowCms', label: 'S2 AKIŞ', kind: 'int' },
  { path: 'sensors.oilTempC', label: 'YAĞ SICAKLIĞI', unit: '°C', kind: 'int' },
  { path: 'sensors.oilHumidityPercent', label: 'YAĞ NEMİ', unit: '%', kind: 'int' },
  { path: 'sensors.oilLevelPercent', label: 'YAĞ SEVİYESİ', unit: '%', kind: 'int' },
]

const ROTATION_FIELDS: Field[] = [
  { path: 'rotation.encoderRaw', label: 'ROTASYON CETVEL HAM', kind: 'int' },
  { path: 'rotation.positionMm', label: 'ROTASYON KONUMU', unit: 'mm', kind: 'num' },
  { path: 'rotation.activeDirection', label: 'ROTASYON YÖNÜ', kind: 'rotDir' },
  { path: 'rotation.inPosition', label: 'ROTASYON HEDEFTE', kind: 'yesNo' },
]

const SPRINGBACK_FIELDS: Field[] = [
  { path: 'springback.state', label: 'DURUM KODU', kind: 'int' },
  { path: 'springback.detectedPositionMm', label: 'ALGILANAN KONUM', unit: 'mm', kind: 'num3' },
  { path: 'springback.pneumaticStartMm', label: 'PNÖMATİK BAŞLANGIÇ', unit: 'mm', kind: 'num3' },
  { path: 'springback.pneumaticEndMm', label: 'PNÖMATİK BİTİŞ', unit: 'mm', kind: 'num3' },
  { path: 'springback.detectionType', label: 'ALGILAMA TİPİ', kind: 'int' },
  { path: 'springback.minValueMm', label: 'MİNİMUM DEĞER', unit: 'mm', kind: 'num3' },
  { path: 'springback.errorCode', label: 'GERİ ESNEME HATA KODU', kind: 'int' },
  { path: 'springback.isMeasuring', label: 'ÖLÇÜYOR', kind: 'yesNo' },
  { path: 'springback.isComplete', label: 'TAMAMLANDI', kind: 'yesNo' },
  { path: 'springback.hasError', label: 'HATA VAR', kind: 'yesNo' },
]

/** Ölçüm sensörleri tablosu: satır = ölçüm türü, sütun = sensör (state anahtarı öneki) */
const MEASURE_COLUMNS = [
  { prefix: 'slpisSensor', label: 'GERİ ESNEME (SLPIS)' },
  { prefix: 'leftRadiusSensor', label: 'SOL RADYUS SENSÖRÜ' },
  { prefix: 'rightRadiusSensor', label: 'SAĞ RADYUS SENSÖRÜ' },
] as const
const MEASURE_ROWS: { suffix: string; label: string; kind: Kind; unit?: string }[] = [
  { suffix: 'Raw', label: 'HAM DEĞER (ADC)', kind: 'int' },
  { suffix: 'Mm', label: 'ÖLÇÜLEN', kind: 'num3', unit: 'mm' },
  { suffix: 'EffectiveMm', label: 'SIFIR OFSETLİ', kind: 'num3', unit: 'mm' },
  { suffix: 'Zeroed', label: 'SIFIRLANDI', kind: 'zeroed' },
]

const PISTONS = [
  { key: 'rightPiston', label: 'SAĞ TOP' },
  { key: 'leftPiston', label: 'SOL TOP' },
  { key: 'upperPiston', label: 'ÜST TOP' },
  { key: 'lowerPiston', label: 'ALT TOP' },
] as const
/** Bilinen piston alanları (sıra = ekrandaki sıra). Bilinmeyen yeni alanlar sonda ham adıyla çıkar. */
const PISTON_ROWS: Record<string, { label: string; kind: Kind; unit?: string }> = {
  encoderRaw: { label: 'CETVEL HAM', kind: 'int' },
  positionMm: { label: 'CETVEL KONUMU', kind: 'num', unit: 'mm' },
  inPosition: { label: 'HEDEFTE', kind: 'yesNo' },
  moving: { label: 'HAREKET', kind: 'motionDir' },
  physicalPositionMm: { label: 'FİZİKSEL KONUM', kind: 'num', unit: 'mm' },
  gonyeOffsetMm: { label: 'GÖNYE OFSETİ', kind: 'num', unit: 'mm' },
  stageOffsetMm: { label: 'STAGE OFSETİ', kind: 'num', unit: 'mm' },
  safeBackwardMm: { label: 'GÜVENLİ GERİ LİMİT', kind: 'num', unit: 'mm' },
  safeForwardMm: { label: 'GÜVENLİ İLERİ LİMİT', kind: 'num', unit: 'mm' },
}

const PNEUMATICS = [
  { key: 'leftPneumatic', label: 'SOL PNÖMATİK' },
  { key: 'rightPneumatic', label: 'SAĞ PNÖMATİK' },
] as const
const PNEUMATIC_ROWS: Record<string, { label: string; kind: Kind; unit?: string }> = {
  encoderPosition: { label: 'PNÖMATİK CETVEL', kind: 'num' },
  activeDirection: { label: 'PNÖMATİK YÖNÜ', kind: 'pneuDir' },
  extended: { label: 'İLERİDE (UZADI)', kind: 'yesNo' },
  retracted: { label: 'GERİDE (KAPANDI)', kind: 'yesNo' },
}

// Yan dayama cetvelleri (2026-11-19) — MachineState.sideSupportRulers (eski backend göndermez → "—")
const SIDE_RULER_OBJECTS = SIDE_RULERS.map((r) => ({ key: `sideSupportRulers.${r.key}`, label: r.label }))
const SIDE_RULER_ROWS: Record<string, { label: string; kind: Kind; unit?: string }> = {
  raw: { label: 'HAM DEĞER (ADC)', kind: 'int' },
  calibratedMm: { label: 'KALİBRE KONUM', kind: 'num', unit: 'mm' },
  offsetMm: { label: 'SIFIR OFSETİ', kind: 'num', unit: 'mm' },
  mm: { label: 'GÖSTERİLEN (OFSETLİ)', kind: 'num', unit: 'mm' },
  available: { label: 'OKUNUYOR', kind: 'yesNo' },
  calibrated: { label: 'KALİBRE EDİLDİ', kind: 'yesNo' },
  strokeMm: { label: 'STROK', kind: 'num', unit: 'mm' },
}

/** Tablo ile gösterilen nesneler — altındaki her alan "kapsanmış" sayılır */
const TABLE_PREFIXES = [...PISTONS.map((p) => p.key), ...PNEUMATICS.map((p) => p.key), ...SIDE_RULER_OBJECTS.map((p) => p.key)]

const COVERED = new Set<string>([
  ...SYSTEM_FIELDS, ...SAFETY_FIELDS, ...OIL_FIELDS, ...ROTATION_FIELDS, ...SPRINGBACK_FIELDS,
].map((f) => f.path).concat(MEASURE_COLUMNS.flatMap((c) => MEASURE_ROWS.map((r) => c.prefix + r.suffix))))

const OTHER_PAGE_SIZE = 24

// ── yardımcılar ─────────────────────────────────────────────

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const k of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

/** Nesneyi yapraklarına açar: "a.b.c" → değer (dizi = tek yaprak) */
function flatten(obj: unknown, prefix = '', out: [string, unknown][] = []): [string, unknown][] {
  if (obj != null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  } else if (prefix) {
    out.push([prefix, obj])
  }
  return out
}

function fmtNum(v: number, digits: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(digits)
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return '—'
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function show(v: unknown, kind: Kind, t: T, unit?: string): Shown {
  if (v === undefined || v === null) return { text: '—', tone: 'idle' }
  const b = v === true
  const n = typeof v === 'number' ? v : Number(v)
  const withUnit = (s: string) => (unit ? `${s} ${unit}` : s)
  switch (kind) {
    case 'okFault':
      return { text: b ? 'OK' : t('ARIZA'), tone: b ? 'ok' : 'bad', chip: true }
    case 'onOff':
      return { text: b ? t('AÇIK') : t('KAPALI'), tone: b ? 'ok' : 'idle', chip: true }
    case 'alarm':
      return { text: b ? t('AÇIK') : t('KAPALI'), tone: b ? 'warn' : 'idle', chip: true }
    case 'presence':
      return { text: b ? t('PARÇA VAR') : t('PARÇA YOK'), tone: b ? 'ok' : 'idle', chip: true }
    case 'dirty':
      return { text: b ? t('KİRLİ / ARIZA') : t('TEMİZ'), tone: b ? 'bad' : 'ok', chip: true }
    case 'yesNo':
      return { text: b ? t('EVET') : t('HAYIR'), tone: b ? 'ok' : 'idle', chip: true }
    case 'zeroed':
      return { text: b ? t('EVET') : t('HAYIR'), tone: b ? 'ok' : 'warn', chip: true }
    case 'gonye':
      return { text: b ? t('YAPILDI') : t('YAPILMADI'), tone: b ? 'ok' : 'warn', chip: true }
    case 'motionDir':
      return { text: b ? t('HAREKETLİ') : t('DURUYOR'), tone: b ? 'warn' : 'idle', chip: true }
    case 'rotDir':
      return { text: n > 0 ? 'CW' : n < 0 ? 'CCW' : t('DURUYOR'), tone: n !== 0 ? 'warn' : 'idle', chip: true }
    case 'pneuDir':
      return { text: n > 0 ? t('İLERİ') : n < 0 ? t('GERİ') : t('DURUYOR'), tone: n !== 0 ? 'warn' : 'idle', chip: true }
    case 'motor':
      return { text: t(MOTOR_LABELS[n] ?? '—'), tone: n === 2 ? 'ok' : n === 1 ? 'warn' : 'idle', chip: true }
    case 'mode':
      return { text: `${t(MODE_LABELS[n] ?? '—')} (${n})`, tone: 'plain' }
    case 'error':
      return { text: `${n} · ${ERROR_LABELS[n] ? t(ERROR_LABELS[n]) : t('BİLİNMEYEN')}`, tone: n === 0 ? 'ok' : 'bad' }
    case 'bits':
      return { text: `0x${(n >>> 0).toString(16).toUpperCase().padStart(4, '0')} · ${(n >>> 0).toString(2).padStart(9, '0')}`, tone: 'plain' }
    case 'time':
      return { text: fmtTime(String(v)), tone: 'plain' }
    case 'text':
      return { text: String(v) || '—', tone: 'plain' }
    case 'int':
      return { text: withUnit(Number.isFinite(n) ? String(Math.round(n)) : String(v)), tone: 'plain' }
    case 'num':
      return { text: withUnit(Number.isFinite(n) ? fmtNum(n, 2) : String(v)), tone: 'plain' }
    case 'num3':
      return { text: withUnit(Number.isFinite(n) ? fmtNum(n, 3) : String(v)), tone: 'plain' }
  }
}

/** Bilinmeyen (yeni) alan — tipine göre genel gösterim */
function showGeneric(v: unknown, t: T): Shown {
  if (typeof v === 'boolean') return show(v, 'yesNo', t)
  if (typeof v === 'number') return show(v, 'num3', t)
  if (v === null || v === undefined) return { text: '—', tone: 'idle' }
  return { text: typeof v === 'object' ? JSON.stringify(v) : String(v), tone: 'plain' }
}

// ── sayfa ───────────────────────────────────────────────────

const TABS = ['SİSTEM', 'EMNİYET & YAĞ', 'PİSTONLAR', 'ROTASYON & PNÖMATİK', 'ÖLÇÜM SENSÖRLERİ', 'YAN DAYAMA', 'DİĞER'] as const
type Tab = (typeof TABS)[number]

export default function MachineValuesPage() {
  const navigate = useNavigate()
  const t = useT()
  const state = useMachineStateStore((s) => s.state)
  const hasData = useMachineStateStore((s) => s.hasReceivedFirstUpdate)
  const [tab, setTab] = useState<Tab>('SİSTEM')

  const leftovers = useMemo(
    () =>
      flatten(state).filter(([p]) => !COVERED.has(p) && !TABLE_PREFIXES.some((pre) => p.startsWith(pre + '.'))),
    [state],
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('MAKİNE DEĞERLERİ')}</h1>
        <span className={styles.live} data-on={hasData || undefined}>
          <span className={styles.liveDot} />
          {hasData ? `${t('CANLI')} · ${fmtTime(state.timestamp)}` : t('VERİ YOK')}
        </span>
      </div>

      <div className={styles.body}>
        <Controls state={state} />

        <div className={styles.tabs}>
          {TABS.map((x) => (
            <button key={x} type="button" className={styles.tab} data-on={x === tab || undefined} onClick={() => setTab(x)}>
              {x === 'DİĞER' ? `${t('DİĞER')} (${leftovers.length})` : t(x)}
            </button>
          ))}
        </div>

        <div className={styles.panel}>
          {tab === 'SİSTEM' && <SystemTab state={state} />}
          {tab === 'EMNİYET & YAĞ' && (
            <>
              <Section title={t('EMNİYET GİRİŞLERİ')} fields={SAFETY_FIELDS} state={state} />
              <Section title={t('YAĞ VE HİDROLİK SENSÖRLERİ')} fields={OIL_FIELDS} state={state} />
            </>
          )}
          {tab === 'PİSTONLAR' && <ObjectTable state={state} objects={PISTONS} rows={PISTON_ROWS} />}
          {tab === 'ROTASYON & PNÖMATİK' && (
            <>
              <Section title={t('ROTASYON')} fields={ROTATION_FIELDS} state={state} />
              <div className={styles.sectionTitle}>{t('PNÖMATİKLER')}</div>
              <ObjectTable state={state} objects={PNEUMATICS} rows={PNEUMATIC_ROWS} />
            </>
          )}
          {tab === 'ÖLÇÜM SENSÖRLERİ' && <MeasureTab state={state} />}
          {tab === 'YAN DAYAMA' && (
            <>
              <div className={styles.sectionTitle}>{t('YAN DAYAMA CETVELLERİ')}</div>
              <ObjectTable state={state} objects={SIDE_RULER_OBJECTS} rows={SIDE_RULER_ROWS} />
            </>
          )}
          {tab === 'DİĞER' && <OtherTab items={leftovers} />}
        </div>
      </div>
    </div>
  )
}

// ── motor / fan / alarm ─────────────────────────────────────

function Controls({ state }: { state: MachineState }) {
  const t = useT()
  const bendingActive = useBendingActive()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send(key: string, fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(tp(e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(null)
    }
  }

  const m = window.corventa.machine
  const motor = state.hydraulicMotorState
  // Büküm sürerken sadece MOTOR DURDUR serbest (operatör motoru her an kesebilmeli)
  return (
    <>
      <div className={styles.controls}>
        <ControlCard
          label={t('HİDROLİK MOTOR')}
          shown={show(motor, 'motor', t)}
          onLabel={t('ÇALIŞTIR')}
          offLabel={t('DURDUR')}
          onDisabled={bendingActive || motor !== 0 || busy != null}
          offDisabled={motor === 0 || busy != null}
          onOn={() => void send('motor', () => m.setHydraulicMotor(true))}
          onOff={() => void send('motor', () => m.setHydraulicMotor(false))}
        />
        <ControlCard
          label={t('FAN')}
          shown={show(state.fanActive, 'onOff', t)}
          onLabel={t('FANI AÇ')}
          offLabel={t('FANI KAPAT')}
          onDisabled={bendingActive || state.fanActive || busy != null}
          offDisabled={bendingActive || !state.fanActive || busy != null}
          onOn={() => void send('fan', () => m.setFan(true))}
          onOff={() => void send('fan', () => m.setFan(false))}
        />
        <ControlCard
          label={t('ALARM')}
          shown={show(state.alarmActive, 'alarm', t)}
          onLabel={t('ALARMI AÇ')}
          offLabel={t('ALARMI KAPAT')}
          onDisabled={bendingActive || state.alarmActive || busy != null}
          offDisabled={bendingActive || !state.alarmActive || busy != null}
          onOn={() => void send('alarm', () => m.setAlarm(true))}
          onOff={() => void send('alarm', () => m.setAlarm(false))}
        />
      </div>
      {(bendingActive || error) && (
        <p className={styles.message} data-kind="err">
          {error ? `${t('KOMUT GÖNDERİLEMEDİ')}: ${error}` : t('BÜKÜM DEVAM EDİYOR — SADECE MOTOR DURDURMA SERBEST')}
        </p>
      )}
    </>
  )
}

function ControlCard(p: {
  label: string
  shown: Shown
  onLabel: string
  offLabel: string
  onDisabled: boolean
  offDisabled: boolean
  onOn: () => void
  onOff: () => void
}) {
  return (
    <div className={styles.ctrlCard}>
      <div className={styles.ctrlHead}>
        <span className={styles.ctrlLabel}>{p.label}</span>
        <Value shown={p.shown} />
      </div>
      <div className={styles.ctrlBtns}>
        <button type="button" className={styles.onBtn} disabled={p.onDisabled} onClick={p.onOn}>
          {p.onLabel}
        </button>
        <button type="button" className={styles.offBtn} disabled={p.offDisabled} onClick={p.onOff}>
          {p.offLabel}
        </button>
      </div>
    </div>
  )
}

// ── bölümler ────────────────────────────────────────────────

function Value({ shown }: { shown: Shown }) {
  return (
    <span className={shown.chip ? styles.chip : styles.value} data-tone={shown.tone}>
      {shown.text}
    </span>
  )
}

function Cell({ label, shown }: { label: string; shown: Shown }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <Value shown={shown} />
    </div>
  )
}

function Section({ title, fields, state }: { title?: string; fields: Field[]; state: MachineState }) {
  const t = useT()
  return (
    <>
      {title && <div className={styles.sectionTitle}>{title}</div>}
      <div className={styles.cells}>
        {fields.map((f) => (
          <Cell key={f.path} label={t(f.label)} shown={show(getPath(state, f.path), f.kind, t, f.unit)} />
        ))}
      </div>
    </>
  )
}

function SystemTab({ state }: { state: MachineState }) {
  const t = useT()
  const conn = useConnectionStatus()
  const c = (s: ConnectionState): Shown => ({ text: t(CONN_LABELS[s] ?? s), tone: s === 'connected' ? 'ok' : s === 'error' || s === 'disconnected' ? 'bad' : 'warn', chip: true })
  return (
    <>
      <Section title={t('SİSTEM DURUMU')} fields={SYSTEM_FIELDS} state={state} />
      <div className={styles.sectionTitle}>{t('BAĞLANTILAR')}</div>
      <div className={styles.cells}>
        <Cell label={t('BÜKÜM API (HTTP)')} shown={c(conn.engineHttp)} />
        <Cell label={t('MAKİNE CANLI VERİ (HUB)')} shown={c(conn.machineHub)} />
        <Cell label={t('VERİ API (HTTP)')} shown={c(conn.dataApiHttp)} />
        <Cell label={t('OLAY KANALI (HUB)')} shown={c(conn.corventaHub)} />
      </div>
    </>
  )
}

function ObjectTable({
  state,
  objects,
  rows,
}: {
  state: MachineState
  objects: ReadonlyArray<{ key: string; label: string }>
  rows: Record<string, { label: string; kind: Kind; unit?: string }>
}) {
  const t = useT()
  // Satırlar: önce bilinen alanlar (tanım sırası), sonra nesnede olup tanımda olmayan yeni alanlar (ham ad)
  const keys = new Set<string>(Object.keys(rows))
  for (const o of objects) {
    const obj = getPath(state, o.key)
    if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) keys.add(k)
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th />
          {objects.map((o) => (
            <th key={o.key}>{t(o.label)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...keys].map((k) => {
          const def = rows[k]
          return (
            <tr key={k}>
              <td className={styles.rowLabel}>{def ? t(def.label) : k}</td>
              {objects.map((o) => {
                const v = getPath(state, `${o.key}.${k}`)
                return (
                  <td key={o.key}>
                    <Value shown={def ? show(v, def.kind, t, def.unit) : showGeneric(v, t)} />
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function MeasureTab({ state }: { state: MachineState }) {
  const t = useT()
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th />
            {MEASURE_COLUMNS.map((c) => (
              <th key={c.prefix}>{t(c.label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEASURE_ROWS.map((r) => (
            <tr key={r.suffix}>
              <td className={styles.rowLabel}>{t(r.label)}</td>
              {MEASURE_COLUMNS.map((c) => (
                <td key={c.prefix}>
                  <Value shown={show(getPath(state, c.prefix + r.suffix), r.kind, t, r.unit)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Section title={t('GERİ ESNEME DURUM MAKİNESİ (PLC)')} fields={SPRINGBACK_FIELDS} state={state} />
    </>
  )
}

function OtherTab({ items }: { items: [string, unknown][] }) {
  const t = useT()
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / OTHER_PAGE_SIZE))
  const cur = Math.min(page, pages - 1)
  if (items.length === 0)
    return <p className={styles.empty}>{t('Ek alan yok — makineden gelen tüm değerler diğer sekmelerde gösteriliyor.')}</p>
  return (
    <>
      <p className={styles.note}>{t('Tanımlı bölümlere girmeyen yeni alanlar (ham adlarıyla).')}</p>
      <div className={styles.cells}>
        {items.slice(cur * OTHER_PAGE_SIZE, (cur + 1) * OTHER_PAGE_SIZE).map(([p, v]) => (
          <Cell key={p} label={p} shown={showGeneric(v, t)} />
        ))}
      </div>
      {pages > 1 && (
        <div className={styles.pager}>
          <button type="button" className={styles.tab} disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            ‹
          </button>
          <span className={styles.pageInfo}>
            {cur + 1} / {pages}
          </span>
          <button type="button" className={styles.tab} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
            ›
          </button>
        </div>
      )}
    </>
  )
}
