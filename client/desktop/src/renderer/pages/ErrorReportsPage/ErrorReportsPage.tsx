// Ayarlar > Hata Raporları — hata anı makine snapshot'ları (EXCEL 26).
// Kaynak: DataApi GET /api/error-snapshots (sayfalı özet) + GET /api/error-snapshots/{id} (detay),
// window.corventa.service.listErrorSnapshots / getErrorSnapshot üzerinden (demo'da DemoMachine).
// Kayıtları Bending API ErrorSnapshotService açar: iş başarısız, acil stop (yazılım / fiziksel),
// güvenlik alarmı (termik, faz, PLC hata kodu), güvenlik uyarısı (yağ sıcaklığı / sensör), encoder durması.
// DataApi en yeni 500 kaydı tutar. Ekran sadece okur.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { translateProgress, useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import {
  ERROR_SNAPSHOT_TRIGGERS,
  type ErrorSnapshotDetail,
  type ErrorSnapshotPage,
  type ErrorSnapshotSeverity,
  type PistonState,
} from '@shared'
import styles from './ErrorReportsPage.module.css'

const PAGE_SIZE = 20

const SEV_COLORS: Record<ErrorSnapshotSeverity, string> = { error: '#dc2626', warning: '#f59e0b' }
const SEV_LABELS: Record<ErrorSnapshotSeverity, string> = { error: 'HATA', warning: 'UYARI' }

// Ekranda gösterilen etiketler (t() ile çevrilir) — kayıt değerleri backend kodu olarak kalır.
const TRIGGER_LABELS: Record<string, string> = {
  JobFailed: 'İŞ BAŞARISIZ',
  EmergencyStop: 'ACİL STOP (YAZILIM)',
  PhysicalEmergencyStop: 'ACİL STOP (FİZİKSEL)',
  SafetyAlarm: 'GÜVENLİK ALARMI',
  SafetyWarning: 'GÜVENLİK UYARISI',
  EncoderStall: 'ENCODER DURMASI',
}

const JOB_STATUS_LABELS: Record<string, string> = {
  Created: 'OLUŞTURULDU',
  Calculating: 'HESAPLANIYOR',
  Ready: 'HAZIR',
  Running: 'ÇALIŞIYOR',
  Completed: 'TAMAMLANDI',
  Failed: 'BAŞARISIZ',
  Cancelled: 'İPTAL EDİLDİ',
}

const METHOD_LABELS: Record<string, string> = {
  FullCircle: 'TAM DAİRE',
  Arc: 'KAVİS',
  Serpantin: 'SERPANTİN',
  Sivama: 'SIVAMA',
}

const MOTOR_LABELS: Record<number, string> = { 0: 'KAPALI', 1: 'BAŞLIYOR', 2: 'HAZIR' }

/** Yerel saat — "2026-11-01 14:05:09" */
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Log satırı saati — "14:05:09.123" */
function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function fmtNum(v: number | null | undefined, digits = 2): string {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—'
}

function fmtInt(v: number | null | undefined): string {
  return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—'
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export default function ErrorReportsPage() {
  const navigate = useNavigate()
  const t = useT()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => (selectedId != null ? setSelectedId(null) : navigate('/settings'))}
          aria-label={t('Geri')}
        >
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>
          {selectedId != null ? t('HATA RAPORU #{id}', { id: selectedId }) : t('HATA RAPORLARI')}
        </h1>
      </div>

      {selectedId == null
        ? <SnapshotList onOpen={setSelectedId} />
        : <SnapshotDetailView id={selectedId} onBack={() => setSelectedId(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LİSTE
// ─────────────────────────────────────────────────────────────

// Sayfa / filtre detaydan dönüşte korunsun (bileşen yeniden kurulur)
let lastListState = { page: 1, trigger: '' }

function SnapshotList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT()
  const lang = useLang()
  const [page, setPage] = useState(lastListState.page)
  const [trigger, setTrigger] = useState(lastListState.trigger)
  const [data, setData] = useState<ErrorSnapshotPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.corventa.service.listErrorSnapshots({
        page,
        pageSize: PAGE_SIZE,
        triggerType: trigger || undefined,
      })
      setData(res)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [page, trigger])

  useEffect(() => {
    lastListState = { page, trigger }
    void load()
  }, [load, page, trigger])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className={styles.body}>
      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('FİLTRELER')}</div>
        <div className={styles.filterRow}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>{t('TETİKLEYİCİ')}</label>
            <select
              className={styles.selectInput}
              value={trigger}
              onChange={(e) => { setTrigger(e.target.value); setPage(1) }}
            >
              <option value="">{t('HEPSİ')}</option>
              {ERROR_SNAPSHOT_TRIGGERS.map((k) => (
                <option key={k} value={k}>{t(TRIGGER_LABELS[k] ?? k)}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterHint}>
            {t('Hata anında makinenin durumu, aktif iş ve son log satırları kaydedilir. En yeni 500 kayıt saklanır.')}
          </div>
          <button className={styles.refreshBtn} onClick={() => void load()} disabled={loading}>
            <IconLabel icon="reset">{t('YENİLE')}</IconLabel>
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('KAYITLAR ({n})', { n: data?.total ?? 0 })}</div>
        {error && (
          <div className={styles.errorBox}>
            <IconLabel icon="error">{t('Kayıtlar alınamadı')}</IconLabel>
            <span className={styles.errorDetail}>{error}</span>
          </div>
        )}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('ZAMAN')}</th>
              <th>{t('SEVİYE')}</th>
              <th>{t('TETİKLEYİCİ')}</th>
              <th>{t('SEBEP')}</th>
              <th>{t('İŞ')}</th>
              <th className={styles.thNum}>{t('S1 / S2 (bar)')}</th>
              <th className={styles.thNum}>{t('YAĞ (°C)')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!loading && data && data.items.length === 0 && (
              <tr><td colSpan={8} className={styles.empty}>{t('Kayıt yok')}</td></tr>
            )}
            {loading && !data && (
              <tr><td colSpan={8} className={styles.empty}>{t('Yükleniyor…')}</td></tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.id} className={styles.clickRow} onClick={() => onOpen(r.id)}>
                <td className={styles.tdMono}>{fmtDateTime(r.capturedAt)}</td>
                <td>
                  <span className={styles.sevPill} style={{ background: SEV_COLORS[r.severity] ?? SEV_COLORS.error }}>
                    {t(SEV_LABELS[r.severity] ?? 'HATA')}
                  </span>
                </td>
                <td className={styles.tdCat}>{t(TRIGGER_LABELS[r.triggerType] ?? r.triggerType)}</td>
                <td className={styles.tdReason}>{translateReason(r.reason, lang)}</td>
                <td className={styles.tdMono}>{r.bendingJobId != null ? `#${r.bendingJobId}` : '—'}</td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtInt(r.s1PressureBar)} / {fmtInt(r.s2PressureBar)}</td>
                <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtInt(r.oilTempC)}</td>
                <td className={styles.tdAction}><Icon name="chevronRight" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.pager}>
          <button className={styles.pagerBtn} disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <IconLabel icon="chevronLeft">{t('ÖNCEKİ')}</IconLabel>
          </button>
          <span className={styles.pagerInfo}>{t('SAYFA {p} / {n}', { p: page, n: totalPages })}</span>
          <button className={styles.pagerBtn} disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            <IconLabel icon="chevronRight" trailing>{t('SONRAKİ')}</IconLabel>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Uyarı kümesi " | " ile birleşik gelebilir — her parça ayrı çevrilir */
function translateReason(reason: string, lang: ReturnType<typeof useLang>): string {
  return reason.split(' | ').map((p) => translateProgress(p, lang)).join(' | ')
}

// ─────────────────────────────────────────────────────────────
// DETAY
// ─────────────────────────────────────────────────────────────

function SnapshotDetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const t = useT()
  const lang = useLang()
  const [snap, setSnap] = useState<ErrorSnapshotDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setSnap(null)
    setError(null)
    window.corventa.service.getErrorSnapshot(id)
      .then((s) => { if (alive) setSnap(s) })
      .catch((e) => { if (alive) setError(errMsg(e)) })
    return () => { alive = false }
  }, [id])

  if (error) {
    return (
      <div className={styles.body}>
        <div className={styles.errorBox}>
          <IconLabel icon="error">{t('Kayıt alınamadı')}</IconLabel>
          <span className={styles.errorDetail}>{error}</span>
        </div>
        <button className={styles.refreshBtn} onClick={onBack}>
          <IconLabel icon="back">{t('LİSTEYE DÖN')}</IconLabel>
        </button>
      </div>
    )
  }
  if (!snap) return <div className={styles.body}><div className={styles.empty}>{t('Yükleniyor…')}</div></div>

  const ms = snap.machineState
  const pistons: [string, Partial<PistonState> | undefined][] = [
    ['SAĞ PİSTON', ms?.rightPiston],
    ['SOL PİSTON', ms?.leftPiston],
    ['ÜST PİSTON', ms?.upperPiston],
    ['ALT PİSTON', ms?.lowerPiston],
  ]
  const sn = ms?.sensors
  const sf = ms?.safety
  const job = snap.job
  const prog = snap.progress
  const yesNo = (v: boolean | undefined) => (v == null ? '—' : v ? t('EVET') : t('HAYIR'))
  const plcCode = snap.plcErrorCode ?? 0
  const plcName = typeof ms?.errorCode === 'string' ? ms.errorCode : null

  return (
    <div className={styles.body}>
      {/* Özet */}
      <div className={styles.card} style={{ borderColor: SEV_COLORS[snap.severity] ?? SEV_COLORS.error }}>
        <div className={styles.detailHead}>
          <span className={styles.sevPill} style={{ background: SEV_COLORS[snap.severity] ?? SEV_COLORS.error }}>
            {t(SEV_LABELS[snap.severity] ?? 'HATA')}
          </span>
          <span className={styles.detailTrigger}>{t(TRIGGER_LABELS[snap.triggerType] ?? snap.triggerType)}</span>
          <span className={styles.detailTime}>{fmtDateTime(snap.capturedAt)}</span>
        </div>
        <div className={styles.detailReason}>{translateReason(snap.reason, lang) || '—'}</div>
        <div className={styles.kvGrid}>
          <KV label={t('İŞ')} value={snap.bendingJobId != null ? `#${snap.bendingJobId}` : '—'} />
          <KV label={t('PLC HATA KODU')} value={plcCode === 0 ? t('YOK') : `${plcCode}${plcName ? ` (${plcName})` : ''}`} warn={plcCode !== 0} />
          <KV label={t('HİDROLİK MOTOR')} value={ms?.hydraulicMotorState != null ? t(MOTOR_LABELS[ms.hydraulicMotorState] ?? String(ms.hydraulicMotorState)) : '—'} />
          <KV label={t('ALARM')} value={yesNo(ms?.alarmActive)} warn={ms?.alarmActive === true} />
          <KV label={t('GÖNYE')} value={ms?.physicalInfo?.isGonyeCompleted == null ? '—' : ms.physicalInfo.isGonyeCompleted ? t('ALINDI') : t('ALINMADI')} />
          <KV label={t('STAGE')} value={ms?.physicalInfo?.currentStage ? String(ms.physicalInfo.currentStage) : '—'} />
        </div>
      </div>

      {ms == null && (
        <div className={styles.errorBox}><IconLabel icon="warning">{t('Makine durumu kaydedilmemiş')}</IconLabel></div>
      )}

      {ms != null && (
        <div className={styles.twoCol}>
          {/* Pistonlar + rotasyon */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>{t('PİSTONLAR VE ROTASYON')}</div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('EKSEN')}</th>
                  <th className={styles.thNum}>{t('ENCODER (mm)')}</th>
                  <th className={styles.thNum}>{t('FİZİKSEL (mm)')}</th>
                  <th className={styles.thNum}>{t('HAM')}</th>
                  <th>{t('HAREKET')}</th>
                  <th>{t('KONUMDA')}</th>
                </tr>
              </thead>
              <tbody>
                {pistons.map(([label, p]) => (
                  <tr key={label}>
                    <td className={styles.tdCat}>{t(label)}</td>
                    <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtNum(p?.positionMm)}</td>
                    <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtNum(p?.physicalPositionMm)}</td>
                    <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtInt(p?.encoderRaw)}</td>
                    <td><Flag on={p?.moving} onLabel={t('VAR')} offLabel={t('YOK')} onColor="#f59e0b" /></td>
                    <td><Flag on={p?.inPosition} onLabel={t('EVET')} offLabel={t('HAYIR')} onColor="#16a34a" /></td>
                  </tr>
                ))}
                <tr>
                  <td className={styles.tdCat}>{t('ROTASYON')}</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtNum(ms.rotation?.positionMm)}</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>—</td>
                  <td className={`${styles.tdMono} ${styles.tdNum}`}>{fmtInt(ms.rotation?.encoderRaw)}</td>
                  <td>
                    <Flag
                      on={ms.rotation?.activeDirection != null ? ms.rotation.activeDirection !== 0 : undefined}
                      onLabel={ms.rotation?.activeDirection === 1 ? t('CW') : t('CCW')}
                      offLabel={t('YOK')}
                      onColor="#f59e0b"
                    />
                  </td>
                  <td><Flag on={ms.rotation?.inPosition} onLabel={t('EVET')} offLabel={t('HAYIR')} onColor="#16a34a" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Basınç ve sensörler */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>{t('BASINÇ VE SENSÖRLER')}</div>
            <table className={styles.table}>
              <tbody>
                <SensorRow label={t('S1 BASINÇ')} value={fmtInt(sn?.s1PressureBar)} unit="bar" />
                <SensorRow label={t('S2 BASINÇ')} value={fmtInt(sn?.s2PressureBar)} unit="bar" />
                <SensorRow label={t('S1 AKIŞ')} value={fmtInt(sn?.s1FlowCms)} unit="cm/s" />
                <SensorRow label={t('S2 AKIŞ')} value={fmtInt(sn?.s2FlowCms)} unit="cm/s" />
                <SensorRow label={t('YAĞ SICAKLIĞI')} value={fmtInt(sn?.oilTempC)} unit="°C" />
                <SensorRow label={t('YAĞ NEMİ')} value={fmtInt(sn?.oilHumidityPercent)} unit="%" />
                <SensorRow label={t('YAĞ SEVİYESİ')} value={fmtInt(sn?.oilLevelPercent)} unit="%" />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ms != null && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('GÜVENLİK GİRİŞLERİ')}</div>
          <div className={styles.safetyGrid}>
            <SafetyItem label={t('ACİL STOP')} ok={sf?.emergencyStopOK} />
            <SafetyItem label={t('MOTOR TERMİK')} ok={sf?.motorThermalOK} />
            <SafetyItem label={t('FAN TERMİK')} ok={sf?.fanThermalOK} />
            <SafetyItem label={t('FAZ SIRASI')} ok={sf?.phaseSequenceOK} />
            <SafetyItem label={t('SOL PARÇA SENSÖRÜ')} ok={sf?.leftPartSensor} okLabel={t('VAR')} badLabel={t('YOK')} neutral />
            <SafetyItem label={t('SAĞ PARÇA SENSÖRÜ')} ok={sf?.rightPartSensor} okLabel={t('VAR')} badLabel={t('YOK')} neutral />
          </div>
        </div>
      )}

      {/* Aktif iş */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('AKTİF İŞ')}</div>
        {job == null
          ? <div className={styles.empty}>{t('Olay anında aktif iş yoktu')}</div>
          : (
            <>
              <div className={styles.kvGrid}>
                <KV label={t('İŞ')} value={`#${job.id}`} />
                <KV label={t('DURUM')} value={t(JOB_STATUS_LABELS[job.status] ?? job.status)} warn={job.status === 'Failed'} />
                <KV label={t('METOT')} value={t(METHOD_LABELS[job.method] ?? job.method)} />
                <KV label={t('PROFİL A / B / S')} value={`${fmtNum(job.profileA, 1)} / ${fmtNum(job.profileB, 1)} / ${fmtNum(job.profileS, 1)}`} />
                <KV label={t('HEDEF ÇAP (mm)')} value={fmtNum(job.targetDiameterMm, 1)} />
                <KV label={t('PARÇA BOYU (mm)')} value={fmtNum(job.partLengthMm, 0)} />
                <KV label={t('PASO')} value={`${prog?.completedPasos ?? job.completedPasos} / ${prog?.totalPasos || job.totalPasos}`} />
                <KV label={t('BAŞLANGIÇ')} value={fmtDateTime(job.startedAt)} />
              </div>
              {prog?.message && (
                <div className={styles.kvLine}><span className={styles.filterLabel}>{t('SON ADIM')}</span> {translateProgress(prog.message, lang)}</div>
              )}
              {job.errorMessage && (
                <div className={styles.kvLine}><span className={styles.filterLabel}>{t('İŞ HATASI')}</span> {translateProgress(job.errorMessage, lang)}</div>
              )}
            </>
          )}
      </div>

      {/* Son loglar */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>{t('SON LOG SATIRLARI ({n})', { n: snap.logs?.length ?? 0 })}</div>
        {!snap.logs || snap.logs.length === 0
          ? <div className={styles.empty}>{t('Log satırı yok')}</div>
          : (
            <div className={styles.logBox}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('SAAT')}</th>
                    <th>{t('KATEGORİ')}</th>
                    <th>{t('MESAJ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.logs.map((l, i) => (
                    <tr key={i} className={l.isError ? styles.logError : undefined}>
                      <td className={styles.tdMono}>{fmtTime(l.timestamp)}</td>
                      <td className={styles.tdCat}>{l.category}</td>
                      <td className={styles.tdLog}>{translateProgress(l.message, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <button className={styles.refreshBtn} onClick={onBack}>
        <IconLabel icon="back">{t('LİSTEYE DÖN')}</IconLabel>
      </button>
    </div>
  )
}

function KV({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.filterLabel}>{label}</span>
      <span className={styles.kvValue} style={warn ? { color: SEV_COLORS.error } : undefined}>{value}</span>
    </div>
  )
}

function SensorRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <tr>
      <td className={styles.tdCat}>{label}</td>
      <td className={`${styles.tdMono} ${styles.tdNum} ${styles.tdBig}`}>{value}</td>
      <td className={styles.tdUnit}>{unit}</td>
    </tr>
  )
}

function Flag({ on, onLabel, offLabel, onColor }: { on: boolean | undefined; onLabel: string; offLabel: string; onColor: string }) {
  if (on == null) return <span className={styles.tdMono}>—</span>
  return (
    <span className={styles.flag} style={on ? { background: onColor, color: '#fff' } : undefined}>
      {on ? onLabel : offLabel}
    </span>
  )
}

function SafetyItem({ label, ok, okLabel, badLabel, neutral }: {
  label: string
  ok: boolean | undefined
  okLabel?: string
  badLabel?: string
  /** Parça sensörü gibi — değer hata anlamına gelmez, sadece bilgi */
  neutral?: boolean
}) {
  const t = useT()
  const color = ok == null ? '#9ca3af' : ok ? '#16a34a' : neutral ? '#6b7280' : '#dc2626'
  const text = ok == null ? '—' : ok ? (okLabel ?? t('TAMAM')) : (badLabel ?? t('HATA'))
  return (
    <div className={styles.safetyItem} style={{ borderColor: color }}>
      <span className={styles.filterLabel}>{label}</span>
      <span className={styles.safetyValue} style={{ color }}>{text}</span>
    </div>
  )
}
