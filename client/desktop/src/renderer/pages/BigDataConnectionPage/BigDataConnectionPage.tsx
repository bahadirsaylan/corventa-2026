// Ayarlar > BULUT BAĞLANTISI (rota /settings/big-data, ADMIN+) — BULUT_API.md §4–5.
//   • İNTERNET ERİŞİMİ (EXCEL 37) — main ConnectivityService (Google generate_204, 30 sn)
//   • BULUT DURUMU — DataApi GET /api/cloud/status (sayfa açıkken 5 sn'de bir), ŞİMDİ SENKRONİZE ET
//   • AKTİVASYON — kod XXXX-XXXX-XXXX-XXXX → BULUTA BAĞLAN; bağlıysa BULUT BAĞLANTISINI KALDIR (SÜPERADMİN)
//   • REÇETE PAYLAŞIMI (BIG DATA) — MachineSettings.CloudShareRecipes
//   • GÜNCELLEME — İNDİR (DataApi) → GÜNCELLEMEYİ KUR (main setup'ı başlatıp kapanır). Büküm / tahliye /
//     hareket sürerken KUR kapalı; main ayrıca kendisi de kontrol eder.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import { LockIcon } from '@/components/RoleNotice/LockIcon'
import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import { formatCheckTime, internetStateText } from '@/components/InternetStatus/InternetStatusChip'
import { PERMISSIONS } from '@/constants/permissions'
import { useInternetStore } from '@/stores/internetStore'
import { useCloudStatusPolling, useCloudStore } from '@/stores/cloudStore'
import { useBendingActive } from '@/stores/bendingActivityStore'
import { useCan } from '@/stores/sessionStore'
import type { CloudInstallBlockers, CloudStatus } from '@shared/types'
import styles from './BigDataConnectionPage.module.css'

const PAGE_POLL_MS = 5_000

type T = (source: string, vars?: Record<string, string | number>) => string
type Dot = 'connected' | 'disconnected' | 'error' | 'testing'

/** Aktivasyon kodu: büyük harf, sadece A-Z0-9, 4'lü gruplar tireyle (en fazla 16 karakter) */
function formatActivationCode(raw: string): string {
  const clean = raw
    .replace(/[iİı]/g, 'I')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16)
  return (clean.match(/.{1,4}/g) ?? []).join('-')
}

const CODE_RE = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

/** ISO → "dd.MM.yyyy HH:mm:ss"; "Z" eksikse UTC kabul edilir (DataApi SQLite tarihleri) */
function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale, { hour12: false, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—'
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

function cloudStateView(status: CloudStatus | null, loaded: boolean, error: string | null, t: T): { dot: Dot; text: string } {
  if (!status) {
    if (!loaded) return { dot: 'testing', text: t('YÜKLENİYOR…') }
    return { dot: 'error', text: error ? t('DATAAPI YANIT VERMİYOR') : t('BİLİNMİYOR') }
  }
  if (!status.configured) return { dot: 'disconnected', text: t('YAPILANDIRILMAMIŞ') }
  if (!status.activated) return { dot: 'testing', text: t('AKTİVE EDİLMEMİŞ') }
  return status.online ? { dot: 'connected', text: t('BAĞLI') } : { dot: 'error', text: t('ÇEVRİMDIŞI') }
}

export default function BigDataConnectionPage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'

  // İnternet erişimi (EXCEL 37) — gerçek durum
  const internet = useInternetStore((s) => s.status)
  const checkInternetNow = useInternetStore((s) => s.checkNow)
  const internetDot: Dot =
    internet.state === 'online' ? 'connected' : internet.state === 'offline' ? 'error' : internet.checking ? 'testing' : 'disconnected'

  // Bulut durumu — sayfa açıkken 5 sn
  useCloudStatusPolling(PAGE_POLL_MS)
  const status = useCloudStore((s) => s.status)
  const loaded = useCloudStore((s) => s.loaded)
  const pollError = useCloudStore((s) => s.error)
  const refresh = useCloudStore((s) => s.refresh)
  const setStatus = useCloudStore((s) => s.setStatus)
  const view = cloudStateView(status, loaded, pollError, t)

  const canDeactivate = useCan('cloud-deactivate')
  const bendingActive = useBendingActive()

  const [code, setCode] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [busy, setBusy] = useState<null | 'sync' | 'activate' | 'deactivate' | 'share' | 'download' | 'install'>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'install'>(null)
  const [installing, setInstalling] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')

  // Kurulum engelleri (main hesaplar) — indirilmiş güncelleme varken 5 sn'de bir
  const update = status?.update ?? null
  const [blockers, setBlockers] = useState<CloudInstallBlockers | null | undefined>(undefined)
  useEffect(() => {
    if (!update?.downloaded) return
    let alive = true
    const load = () => {
      window.corventa.cloud.getInstallBlockers().then(
        (b) => { if (alive) setBlockers(b) },
        () => { if (alive) setBlockers(null) },
      )
    }
    load()
    const id = setInterval(load, PAGE_POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [update?.downloaded])

  useEffect(() => {
    window.corventa.getAppVersion().then(setAppVersion, () => {})
  }, [])

  const installBlockReason: string | null = !update?.downloaded
    ? null
    : bendingActive || blockers?.bendingActive
      ? t('Büküm sürüyor — bitince kurabilirsiniz')
      : blockers?.unloadActive
        ? t('Tahliye sürüyor — bitince kurabilirsiniz')
        : blockers?.machineMoving
          ? t('Makine hareket halinde — durunca kurabilirsiniz')
          : blockers === null
            ? t('Büküm durumu doğrulanamadı (DataApi yanıt vermiyor)')
            : null

  async function run<R>(
    kind: NonNullable<typeof busy>,
    fn: () => Promise<{ ok: true; data: R } | { ok: false; status: number; error: string }>,
    okText?: string,
  ): Promise<R | null> {
    setBusy(kind)
    setMessage(null)
    try {
      const r = await fn()
      if (!r.ok) {
        setMessage({ kind: 'error', text: r.error || t('İşlem başarısız') })
        return null
      }
      if (okText) setMessage({ kind: 'ok', text: okText })
      return r.data
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
      return null
    } finally {
      setBusy(null)
      void refresh()
    }
  }

  async function activate() {
    const c = formatActivationCode(code)
    if (!CODE_RE.test(c)) {
      setMessage({ kind: 'error', text: t('Aktivasyon kodu XXXX-XXXX-XXXX-XXXX biçiminde olmalı') })
      return
    }
    const s = await run('activate', () => window.corventa.cloud.activate(c), t('Makine buluta bağlandı'))
    if (s) {
      setStatus(s)
      setCode('')
    }
  }

  async function deactivate() {
    setConfirm(null)
    const s = await run('deactivate', () => window.corventa.cloud.deactivate(), t('Bulut bağlantısı kaldırıldı'))
    if (s) setStatus(s)
  }

  async function install() {
    setConfirm(null)
    if (!update?.downloadPath) return
    setBusy('install')
    setMessage(null)
    try {
      const r = await window.corventa.cloud.installUpdate(update.downloadPath)
      if (r.ok) setInstalling(true)
      else setMessage({ kind: 'error', text: r.error ?? t('İşlem başarısız') })
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const activated = status?.activated === true
  const configured = status?.configured === true
  const codeValid = CODE_RE.test(code)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}><Icon name="back" size="lg" /></button>
        <h1 className={styles.title}>{t('BULUT BAĞLANTISI')}</h1>
        {message && (
          <div className={`${styles.message} ${message.kind === 'error' ? styles.messageError : styles.messageOk}`} role="status">
            <Icon name={message.kind === 'error' ? 'warning' : 'success'} size="sm" />
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        {/* ── İnternet Erişimi (EXCEL 37) — gerçek kontrol ── */}
        <section className={styles.card}>
          <div className={styles.sectionTitle}>{t('İNTERNET ERİŞİMİ')}</div>
          <div className={styles.statusRow}>
            <div className={`${styles.statusDot} ${styles[internetDot]}`} />
            <Stat label={t('DURUM')} value={internetStateText(internet, t)} />
            <Stat label={t('SON KONTROL')} value={formatCheckTime(internet.lastCheckedAt, locale)} />
            <Stat label={t('GECİKME')} value={internet.latencyMs != null ? `${internet.latencyMs} ms` : '—'} />
            <Stat label={t('SON ÇEVRİMİÇİ')} value={formatCheckTime(internet.lastOnlineAt, locale)} />
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => void checkInternetNow()}
              disabled={internet.checking}
            >
              {internet.checking ? t('KONTROL EDİLİYOR…') : t('ŞİMDİ KONTROL ET')}
            </button>
          </div>
          {internet.state === 'offline' && internet.error && (
            <p className={styles.noteError}>{t('HATA')}: {internet.error}</p>
          )}
        </section>

        {/* ── Bulut durumu ── */}
        <section className={styles.card}>
          <div className={styles.sectionTitle}>{t('BULUT DURUMU')}</div>
          <div className={styles.statusRow}>
            <div className={`${styles.statusDot} ${styles[view.dot]}`} />
            <Stat label={t('DURUM')} value={view.text} />
            <Stat label={t('MAKİNE ADI')} value={status?.name || '—'} wide />
            <Stat label={t('SERİ NO')} value={status?.serialNumber || '—'} />
            <Stat label={t('MAKİNE KİMLİĞİ')} value={status?.machineId ? status.machineId.slice(0, 8) : '—'} title={status?.machineId ?? undefined} />
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => void run('sync', () => window.corventa.cloud.syncNow(), t('Senkronizasyon başlatıldı'))}
              disabled={!activated || busy != null}
            >
              {busy === 'sync' ? t('GÖNDERİLİYOR…') : t('ŞİMDİ SENKRONİZE ET')}
            </button>
          </div>
          <div className={styles.statGrid}>
            <Stat label={t('SON SİNYAL')} value={formatDateTime(status?.lastHeartbeatAt, locale)} />
            <Stat label={t('SON GÖNDERİM')} value={formatDateTime(status?.lastPushAt, locale)} />
            <Stat label={t('SON REÇETE ÇEKME')} value={formatDateTime(status?.lastRecipePullAt, locale)} />
            <Stat label={t('BEKLEYEN KAYIT')} value={status ? String(status.pendingCount) : '—'} />
          </div>
          {(status?.lastError || (!status && pollError)) && (
            <p className={styles.noteError}>{t('SON HATA')}: {status?.lastError ?? pollError}</p>
          )}
          {status && !configured && (
            <p className={styles.note}>{t('Bulut adresi ve anahtarı yapılandırılmamış (DataApi Cloud ayarları). Makine çevrimdışı çalışmaya devam eder.')}</p>
          )}
        </section>

        <div className={styles.twoCol}>
          {/* ── Aktivasyon / bağlantıyı kaldır ── */}
          <section className={styles.card}>
            <div className={styles.sectionTitle}>{activated ? t('BULUT KAYDI') : t('AKTİVASYON')}</div>
            {!activated ? (
              <>
                <span className={styles.fieldLabel}>{t('AKTİVASYON KODU')}</span>
                <div className={styles.codeRow}>
                  <button
                    type="button"
                    className={styles.codeField}
                    onClick={() => setShowKeyboard(true)}
                    disabled={!configured || busy != null}
                    aria-label={t('AKTİVASYON KODU')}
                  >
                    {code || <span className={styles.placeholder}>XXXX-XXXX-XXXX-XXXX</span>}
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => void activate()}
                    disabled={!configured || !codeValid || busy != null}
                  >
                    {busy === 'activate' ? t('BAĞLANIYOR…') : t('BULUTA BAĞLAN')}
                  </button>
                </div>
                <p className={styles.note}>{t('Kod bulut panelinden alınır, 24 saat geçerlidir ve tek kullanımlıktır. İnternet bağlantısı gerekir.')}</p>
              </>
            ) : (
              <>
                <p className={styles.note}>{t('Makine buluta kayıtlı. Bağlantı kaldırılırsa veri gönderimi durur; yeniden bağlanmak için yeni aktivasyon kodu gerekir.')}</p>
                <button
                  type="button"
                  className={`${styles.dangerBtn} ${canDeactivate ? '' : styles.locked}`}
                  onClick={canDeactivate ? () => setConfirm('deactivate') : () => showRoleNotice(PERMISSIONS['cloud-deactivate'])}
                  disabled={busy != null}
                  aria-disabled={!canDeactivate || undefined}
                >
                  {busy === 'deactivate' ? t('KALDIRILIYOR…') : t('BULUT BAĞLANTISINI KALDIR')}
                  {!canDeactivate && <LockIcon className={styles.lockIcon} />}
                </button>
              </>
            )}
          </section>

          {/* ── Reçete paylaşımı (Big Data) ── */}
          <section className={styles.card}>
            <div className={styles.sectionTitle}>{t('REÇETE PAYLAŞIMI (BIG DATA)')}</div>
            <div className={styles.shareRow}>
              <button
                type="button"
                className={`${styles.toggle} ${status?.shareRecipes ? styles.toggleOn : ''}`}
                onClick={() => void run('share', () => window.corventa.cloud.setShare(!status?.shareRecipes))}
                disabled={!activated || busy != null}
                aria-pressed={status?.shareRecipes === true}
              >
                <span className={styles.toggleKnob} />
                <span className={styles.toggleText}>{status?.shareRecipes ? t('AÇIK') : t('KAPALI')}</span>
              </button>
              <Stat label={t('BULUT REÇETESİ')} value={status ? String(status.recipeCount) : '—'} />
            </div>
            <p className={styles.note}>
              {t('Açıkken bu makinenin başarılı bükümleri diğer makinelerle paylaşılır ve diğer makinelerin reçeteleri bu makinede kullanılır.')}
            </p>
          </section>
        </div>

        {/* ── Yazılım güncellemesi ── */}
        <section className={styles.card}>
          <div className={styles.sectionTitle}>{t('YAZILIM GÜNCELLEMESİ')}</div>
          {!update ? (
            <div className={styles.statusRow}>
              <Stat label={t('MEVCUT SÜRÜM')} value={appVersion || '—'} />
              <span className={styles.upToDate}>
                {activated ? t('YAZILIM GÜNCEL — yeni sürüm yok') : t('Güncellemeler buluta bağlandıktan sonra görünür')}
              </span>
            </div>
          ) : (
            <>
              <div className={styles.statusRow}>
                <Stat label={t('MEVCUT SÜRÜM')} value={appVersion || '—'} />
                <Stat label={t('YENİ SÜRÜM')} value={update.version} />
                <Stat label={t('BOYUT')} value={formatSize(update.sizeBytes)} />
                {!update.downloaded ? (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => void run('download', () => window.corventa.cloud.downloadUpdate())}
                    disabled={update.downloading || busy != null}
                  >
                    {update.downloading
                      ? t('İNDİRİLİYOR %{p}', { p: Math.round(update.progress ?? 0) })
                      : <IconLabel icon="download">{t('İNDİR')}</IconLabel>}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => setConfirm('install')}
                    disabled={installBlockReason != null || !update.downloadPath || busy != null || installing}
                  >
                    {busy === 'install' || installing ? t('KURULUYOR…') : t('GÜNCELLEMEYİ KUR')}
                  </button>
                )}
              </div>
              {update.downloading && (
                <div className={styles.progress}><div className={styles.progressBar} style={{ width: `${Math.min(100, Math.max(0, update.progress ?? 0))}%` }} /></div>
              )}
              {update.notes && <p className={styles.notes}>{update.notes}</p>}
              {installBlockReason && <p className={styles.noteError}>{installBlockReason}</p>}
            </>
          )}
        </section>
      </div>

      {showKeyboard && (
        <KeyboardModal
          initialValue={code}
          label={t('AKTİVASYON KODU')}
          maxLength={19}
          onConfirm={(v) => { setCode(formatActivationCode(v)); setShowKeyboard(false) }}
          onClose={() => setShowKeyboard(false)}
        />
      )}

      {confirm === 'deactivate' && (
        <ConfirmModal
          message="BULUT BAĞLANTISI KALDIRILACAK. VERİ GÖNDERİMİ DURACAK, YENİDEN BAĞLANMAK İÇİN YENİ AKTİVASYON KODU GEREKECEK. DEVAM EDİLSİN Mİ"
          variant="danger"
          confirmLabel="KALDIR"
          cancelLabel="VAZGEÇ"
          onCancel={() => setConfirm(null)}
          onConfirm={() => void deactivate()}
        />
      )}

      {confirm === 'install' && (
        <ConfirmModal
          message="UYGULAMA KAPANIP GÜNCELLEME KURULACAK, SONRA OTOMATİK AÇILACAK. DEVAM EDİLSİN Mİ"
          variant="primary"
          confirmLabel="KUR"
          cancelLabel="VAZGEÇ"
          onCancel={() => setConfirm(null)}
          onConfirm={() => void install()}
        />
      )}

      {installing && (
        <div className={styles.installOverlay}>
          <div className={styles.installBox}>
            <div className={styles.installTitle}>{t('GÜNCELLEME KURULUYOR')}</div>
            <p>{t('Uygulama kapanıyor. Kurulum bitince otomatik olarak yeniden açılacak — makineyi kapatmayın.')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, wide, title }: { label: string; value: string; wide?: boolean; title?: string }) {
  return (
    <div className={`${styles.stat} ${wide ? styles.statWide : ''}`} title={title}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
