// Ayarlar > UYARI KAYITLARI (2026-11-19, ATÖLYE SORUMLUSU+) — uyarı pencerelerinde basılan düğmeler + durumun
// algılandığı / düzeldiği an. Amaç: "yağ kirlilik uyarısını 3 kez kapattınız, düzeltilmedi" diyebilmek.
// Kaynak: DataApi GET /api/alert-acks (sayfalı) + GET /api/alert-acks/summary (uyarı / anahtar başına sayaç),
// window.corventa.service.listAlertAcks / getAlertAckSummary (demoda demoAlertAcks.ts). Ekran sadece okur.
// Üst alana (750 px) kaydırma çubuğu olmadan sığar: özet şeridi + filtre + 8 satırlık sayfa + sayfalama;
// satıra dokununca kayıtlı tam metin ve o anki makine durumu açılır.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tp, useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import { ROLE_SHORT_LABELS } from '@/constants/permissions'
import { MAINTENANCE_PERIODS, type UserRole } from '@shared/types'
import {
  ALERT_ACK_KINDS,
  type AlertAck,
  type AlertAckPage,
  type AlertAckSummaryItem,
} from '@shared/types/alert-ack'
import styles from './AlertAcksPage.module.css'

const PAGE_SIZE = 8
const MAX_CHIPS = 6

/** Ekranda gösterilen uyarı adı (t() ile çevrilir) — kayıt değeri backend kodu */
export const ALERT_KIND_LABELS: Record<string, string> = {
  Contamination: 'YAĞ KİRLİLİĞİ',
  MaintenanceOverdue: 'BAKIM GECİKMESİ',
  MaintenanceLock: 'BAKIM KİLİDİ',
  MaintenanceReminder: 'BAKIM MODU HATIRLATMASI',
  MaintenanceAutoClosed: 'BAKIM MODU OTOMATİK KAPANDI',
  SafetyCheck: 'GÜVENLİK KONTROLÜ',
  EncoderStall: 'ENCODER DURMASI',
}

const ACTION_LABELS: Record<string, string> = {
  DISMISSED: 'KAPATTI',
  CONTINUED: 'DEVAM ETTİ',
  ACKNOWLEDGED: 'TAMAM DEDİ',
  OPENED_MAINTENANCE: 'BAKIM SAYFASINI AÇTI',
  FINISHED_MAINTENANCE: 'BAKIMI BİTİRDİ',
  OPENED_SERVICE_REQUEST: 'SERVİS TALEBİ AÇTI',
  DETECTED: 'ALGILANDI',
  RESOLVED: 'DÜZELDİ',
}

const KEY_LABELS: Record<string, string> = {
  ...Object.fromEntries(MAINTENANCE_PERIODS.map((p) => [p.key, `${p.label.toLocaleUpperCase('tr-TR')} BAKIM`])),
  mode: 'BAKIM MODU',
  Right: 'SAĞ PİSTON',
  Left: 'SOL PİSTON',
  Upper: 'ÜST PİSTON',
  Lower: 'ALT PİSTON',
  Rotation: 'ROTASYON',
  OilTempHigh: 'YAĞ SICAKLIĞI YÜKSEK',
  OilTempCritical: 'YAĞ SICAKLIĞI ÇOK YÜKSEK',
  OilTempSensorFault: 'YAĞ SICAKLIĞI SENSÖRÜ',
  S1PressureSensorFault: 'S1 BASINÇ SENSÖRÜ',
  S2PressureSensorFault: 'S2 BASINÇ SENSÖRÜ',
}

type T = ReturnType<typeof useT>

function keyLabel(kind: string, key: string, t: T): string {
  if (!key) return '—'
  if (kind === 'Contamination') return t('SENSÖR {k}', { k: key })
  return KEY_LABELS[key] ? t(KEY_LABELS[key]) : key
}

function fmtDateTime(iso: string | null | undefined, lang: string, withSeconds = true): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'tr-TR', {
    day: '2-digit', month: '2-digit', year: withSeconds ? 'numeric' : undefined,
    hour: '2-digit', minute: '2-digit', second: withSeconds ? '2-digit' : undefined,
  })
}

function roleLabel(role: string | null, t: T): string {
  if (!role) return ''
  return t(ROLE_SHORT_LABELS[role as UserRole] ?? role)
}

function occurrenceText(r: AlertAck, t: T, short = false): string {
  if (r.action === 'DETECTED') return '—'
  if (r.action === 'RESOLVED') return short ? t('{n} KEZDEN SONRA', { n: r.occurrenceIndex }) : t('ÖNCESİNDE {n} KEZ KAPATILDI', { n: r.occurrenceIndex })
  return t('{n}. KEZ', { n: r.occurrenceIndex })
}

// Sayfa / filtre detaydan dönüşte korunsun
let lastListState = { page: 1, kind: '', key: '' }

export default function AlertAcksPage() {
  const navigate = useNavigate()
  const t = useT()
  const lang = useLang()
  const [page, setPage] = useState(lastListState.page)
  const [kind, setKind] = useState(lastListState.kind)
  const [key, setKey] = useState(lastListState.key)
  const [data, setData] = useState<AlertAckPage | null>(null)
  const [summary, setSummary] = useState<AlertAckSummaryItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AlertAck | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, sum] = await Promise.all([
        window.corventa.service.listAlertAcks({ page, pageSize: PAGE_SIZE, kind: kind || undefined, key: key || undefined }),
        window.corventa.service.getAlertAckSummary(),
      ])
      setData(res)
      setSummary(sum.items)
    } catch (e) {
      setError(tp(e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }, [page, kind, key])

  useEffect(() => {
    lastListState = { page, kind, key }
    void load()
  }, [load, page, kind, key])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  // Kapatılmış (en az bir kullanıcı cevabı olan) uyarılar — açık olanlar önce (backend sırası)
  const chips = (summary ?? []).filter((s) => s.ackCount > 0).slice(0, MAX_CHIPS)
  const chipActive = (s: AlertAckSummaryItem) => kind === s.alertKind && key === s.alertKey

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('UYARI KAYITLARI')}</h1>
        <button className={styles.refreshBtn} onClick={() => void load()} disabled={loading}>
          <IconLabel icon="reset">{t('YENİLE')}</IconLabel>
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('ÖZET — KAPATILAN UYARILAR')}</div>
          {chips.length === 0 ? (
            <div className={styles.chipsEmpty}>{t('Henüz kapatılmış uyarı yok')}</div>
          ) : (
            <div className={styles.chips}>
              {chips.map((s) => {
                const n = s.isOpen ? s.openAckCount : s.ackCount
                return (
                  <button
                    key={`${s.alertKind}|${s.alertKey}`}
                    type="button"
                    className={`${styles.chip} ${s.isOpen ? styles.chipOpen : styles.chipResolved}`}
                    data-active={chipActive(s) || undefined}
                    onClick={() => {
                      const on = chipActive(s)
                      setKind(on ? '' : s.alertKind)
                      setKey(on ? '' : s.alertKey)
                      setPage(1)
                    }}
                  >
                    <span className={styles.chipTitle}>
                      {t(ALERT_KIND_LABELS[s.alertKind] ?? s.alertKind)}
                      {s.alertKey && s.alertKey !== 'mode' ? ` · ${keyLabel(s.alertKind, s.alertKey, t)}` : ''}
                    </span>
                    <span className={styles.chipText}>
                      {s.isOpen
                        ? t('{n} KEZ KAPATILDI — DÜZELMEDİ', { n })
                        : t('DÜZELDİ — TOPLAM {n} KEZ KAPATILDI', { n })}
                    </span>
                    <span className={styles.chipMeta}>
                      {t('SON: {when} ({user})', {
                        when: fmtDateTime(s.lastAckAt, lang, false),
                        user: s.lastAckByDisplayName || s.lastAckBy || '—',
                      })}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className={`${styles.card} ${styles.listCard}`}>
          <div className={styles.listHead}>
            <div className={styles.sectionTitle}>{t('KAYITLAR ({n})', { n: data?.total ?? 0 })}</div>
            <label className={styles.filterLabel}>{t('UYARI')}</label>
            <select
              className={styles.selectInput}
              value={kind}
              onChange={(e) => { setKind(e.target.value); setKey(''); setPage(1) }}
            >
              <option value="">{t('HEPSİ')}</option>
              {ALERT_ACK_KINDS.map((k) => (
                <option key={k} value={k}>{t(ALERT_KIND_LABELS[k] ?? k)}</option>
              ))}
            </select>
            {key && (
              <button type="button" className={styles.keyPill} onClick={() => { setKey(''); setPage(1) }}>
                <IconLabel icon="close" size="sm">{keyLabel(kind, key, t)}</IconLabel>
              </button>
            )}
          </div>

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
                <th>{t('UYARI')}</th>
                <th>{t('DETAY')}</th>
                <th>{t('KULLANICI / ROL')}</th>
                <th>{t('CEVAP')}</th>
                <th>{t('KAÇINCI')}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && data && data.items.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>{t('Kayıt yok')}</td></tr>
              )}
              {loading && !data && (
                <tr><td colSpan={6} className={styles.empty}>{t('Yükleniyor…')}</td></tr>
              )}
              {data?.items.map((r) => (
                <tr key={r.id} className={styles.clickRow} data-system={r.source === 'SYSTEM' || undefined} onClick={() => setSelected(r)}>
                  <td className={styles.tdMono}>{fmtDateTime(r.acknowledgedAt, lang)}</td>
                  <td className={styles.tdKind}>{t(ALERT_KIND_LABELS[r.alertKind] ?? r.alertKind)}</td>
                  <td className={styles.tdDetail}>{keyLabel(r.alertKind, r.alertKey, t)}</td>
                  <td className={styles.tdUser}>
                    {r.source === 'SYSTEM' ? t('SİSTEM') : (r.displayName || r.username || '—')}
                    {r.role && <span className={styles.role}>{roleLabel(r.role, t)}</span>}
                  </td>
                  <td>
                    <span className={styles.actionPill} data-action={r.action}>{t(ACTION_LABELS[r.action] ?? r.action)}</span>
                  </td>
                  <td className={styles.tdOcc} data-repeat={r.source === 'UI' && r.occurrenceIndex > 1 || undefined}>
                    {occurrenceText(r, t, true)}
                  </td>
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

      {selected && <AckDetail ack={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function AckDetail({ ack, onClose }: { ack: AlertAck; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  let state: Record<string, unknown> | null = null
  try {
    state = ack.machineStateJson ? (JSON.parse(ack.machineStateJson) as Record<string, unknown>) : null
  } catch {
    state = null
  }
  const sensor = (v: unknown) => (v === true ? t('KİRLİ / ARIZA') : v === false ? t('TEMİZ') : '—')
  const num = (v: unknown, unit: string) => (typeof v === 'number' ? `${v}${unit}` : '—')

  return (
    <div className={styles.dlgOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.dlg} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dlgTitle}>
          {t(ALERT_KIND_LABELS[ack.alertKind] ?? ack.alertKind)} · {keyLabel(ack.alertKind, ack.alertKey, t)}
        </div>
        <dl className={styles.dlgGrid}>
          <dt>{t('GÖSTERİLDİ')}</dt><dd>{fmtDateTime(ack.shownAt, lang)}</dd>
          <dt>{t('CEVAP ZAMANI')}</dt><dd>{fmtDateTime(ack.acknowledgedAt, lang)}</dd>
          <dt>{t('KULLANICI / ROL')}</dt>
          <dd>
            {ack.source === 'SYSTEM' ? t('SİSTEM') : `${ack.displayName || ack.username || '—'}${ack.username && ack.displayName ? ` (${ack.username})` : ''}`}
            {ack.role ? ` — ${roleLabel(ack.role, t)}` : ''}
          </dd>
          <dt>{t('CEVAP')}</dt><dd>{t(ACTION_LABELS[ack.action] ?? ack.action)} · {occurrenceText(ack, t)}</dd>
          {state && (
            <>
              <dt>{t('KİRLİLİK K1 / K2 / K3')}</dt>
              <dd>{sensor(state.k1)} / {sensor(state.k2)} / {sensor(state.k3)}</dd>
              <dt>{t('YAĞ SICAKLIĞI / SEVİYESİ')}</dt>
              <dd>{num(state.oilTempC, ' °C')} / {num(state.oilLevelPercent, ' %')}</dd>
            </>
          )}
        </dl>
        <div className={styles.dlgMsgLabel}>{t('GÖSTERİLEN METİN (KAYIT)')}</div>
        <div className={styles.dlgMsg}>{ack.message || '—'}</div>
        <button type="button" className={styles.dlgClose} onClick={onClose}>{t('KAPAT')}</button>
      </div>
    </div>
  )
}
