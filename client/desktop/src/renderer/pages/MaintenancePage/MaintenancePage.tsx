// SEKIL: Ayarlar > Bakım Süresi (PDF s.8-12)
// 5 periyot kartı (Günlük/Haftalık/Aylık/6 Aylık/12 Aylık) — her biri son yapılma tarihi ve
// sonraki tarih gösterir; "Bakım tamamlandı" butonuyla now'a set edilir.
// Ayrıca "Bakım Modu" (IsInMaintenanceMode) toggle — servis öncesi/sonrası aç/kapa.
// BAKIM KURALLARI (2026-11-01): "BAKIM YAPILDI" sadece bakım modu açıkken ve periyodun minimum bakım
// süresi dolduktan sonra kabul edilir (DataApi 409). Mod kapalıyken düğmeler soluk — basılınca
// "önce bakım modunu açın" uyarısı (backend'e gidilmez); min süre dolmadan "{n} DK SONRA".

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MAINTENANCE_PERIODS, type MaintenancePeriodInfo } from '@shared/types'
import { useMaintenanceModeTiming, useNowTick } from '@/hooks/useMaintenance'
import {
  computeMaintenanceStatus,
  maintenanceTierTitle,
  type MaintenanceSeverity,
} from '@/services/maintenanceStatus'
import {
  maintenanceErrorMessage,
  markMaintenancePeriodCompleted,
  refreshMaintenance,
  setMaintenanceModeOn,
  useMaintenanceStore,
} from '@/stores/maintenanceStore'
import { useLang, useT, type TVars } from '@/i18n'
import styles from './MaintenancePage.module.css'

// Durum hesabı (sonraki tarih, kalan gün, gecikme hafta kademesi) ortak yardımcıda:
// services/maintenanceStatus.ts — alt uyarı şeridi ve bakım uyarı penceresiyle aynı kural.
// Renk: vade öncesi 7 gün kala sarı (ön uyarı); vadesi geçen kart hafta kademesine göre
// 1. hafta yeşil / 2. hafta sarı / 3. hafta+ kırmızı.
type Severity = MaintenanceSeverity

function formatDateShort(iso: string | Date | null, locale: string): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function severityLabel(
  s: Severity,
  daysUntilNext: number | null,
  overdueDays: number,
  t: (source: string, vars?: TVars) => string,
): string {
  if (s === 'unknown') return t('HİÇ YAPILMADI')
  // Gecikme günü uyarı şeridi / bakım modu ekranıyla aynı kaynaktan (overdueDays) — floor(negatif) bir gün fazla gösterirdi
  if (s === 'overdue') return t('{n} GÜN GECİKME', { n: overdueDays })
  if (s === 'warn') return t('{n} GÜN KALDI', { n: String(daysUntilNext) })
  return t('{n} GÜN KALDI', { n: String(daysUntilNext) })
}

export default function MaintenancePage() {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  // Ortak bakım store'u (AppLayout 30 sn'de bir yeniler) — sayfa açılınca hemen tazelenir
  const state = useMaintenanceStore((s) => s.state)
  const storeError = useMaintenanceStore((s) => s.error)
  const [loading, setLoading] = useState(true)
  const [pendingKey, setPendingKey] = useState<string | null>(null)  // hangi buton işleniyor
  // İşlem sonucu / uyarı satırı (alert yerine) — 409 mesajları burada
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null)
  // Bakım modu açıkken kalan minimum süre için saniyelik sayaç
  const now = useNowTick(state?.isInMaintenanceMode === true)
  const timing = useMaintenanceModeTiming(now)
  // İlk yükleme hatası — state hiç gelmediyse gösterilir (sonraki 30 sn yenileme hataları son veriyi bozmaz)
  const error = !state ? storeError : null

  useEffect(() => {
    let cancelled = false
    refreshMaintenance().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 8000)
    return () => clearTimeout(id)
  }, [notice])

  const handleMarkCompleted = async (info: MaintenancePeriodInfo) => {
    if (pendingKey || !state) return
    if (!state.isInMaintenanceMode) {
      // Backend de 409 döner — istek atmadan uyar
      setNotice({ kind: 'warn', text: t('BAKIM YAPILDI demek için önce BAKIM MODUNU açın.') })
      return
    }
    setPendingKey(info.key)
    setNotice(null)
    try {
      await markMaintenancePeriodCompleted(info.key)
      setNotice({ kind: 'ok', text: t('{period} BAKIM TAMAMLANDI OLARAK KAYDEDİLDİ', { period: t(info.label).toLocaleUpperCase(locale) }) })
    } catch (err) {
      // 409: mod kapalı / minimum bakım süresi dolmadı — backend mesajı aynen
      setNotice({ kind: 'err', text: t('Bakım işaretlenemedi: {err}', { err: maintenanceErrorMessage(err) || t('bilinmeyen hata') }) })
    } finally {
      setPendingKey(null)
    }
  }

  const handleToggleMode = async () => {
    if (!state || pendingKey) return
    setPendingKey('mode')
    setNotice(null)
    try {
      await setMaintenanceModeOn(!state.isInMaintenanceMode)
    } catch (err) {
      setNotice({ kind: 'err', text: t('Bakım modu değiştirilemedi: {err}', { err: maintenanceErrorMessage(err) || t('bilinmeyen hata') }) })
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          ←
        </button>
        <h1 className={styles.title}>{t('BAKIM SÜRESİ')}</h1>
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.stateMsg}>{t('Yükleniyor…')}</div>}

        {error && !loading && (
          <div className={`${styles.stateMsg} ${styles.errorMsg}`}>
            {t('Hata: {err}', { err: error })}
          </div>
        )}

        {state && !loading && (
          <>
            {/* ── Bakım Modu toggle ─────────────────── */}
            <div className={`${styles.card} ${styles.modeCard} ${state.isInMaintenanceMode ? styles.modeOn : ''}`}>
              <div className={styles.modeInfo}>
                <span className={styles.modeLabel}>{t('BAKIM MODU')}</span>
                <span className={styles.modeValue}>
                  {state.isInMaintenanceMode ? t('AÇIK') : t('KAPALI')}
                </span>
                <span className={styles.modeHint}>
                  {state.isInMaintenanceMode
                    ? t('Servis/bakım devam ediyor — yeni büküm işi başlatılamaz.')
                    : t('Makine normal üretim modunda.')}
                </span>
              </div>
              <button
                className={`${styles.modeBtn} ${state.isInMaintenanceMode ? styles.modeBtnOff : styles.modeBtnOn}`}
                onClick={handleToggleMode}
                disabled={pendingKey !== null}
              >
                {state.isInMaintenanceMode ? t('KAPAT') : t('AÇ')}
              </button>
            </div>

            {!state.isInMaintenanceMode && (
              <div className={styles.notice} data-kind="warn">
                {t('BAKIM YAPILDI işaretlemek için önce BAKIM MODUNU açın. Her bakımın minimum süresi bakım modu açıldıktan sonra dolmalıdır.')}
              </div>
            )}
            {notice && (
              <div className={styles.notice} data-kind={notice.kind}>
                {notice.text}
              </div>
            )}

            {/* ── 5 periyot kartı ────────────────────── */}
            <div className={styles.periodGrid}>
              {MAINTENANCE_PERIODS.map((p) => {
                const st = computeMaintenanceStatus(p, state)
                const minMin = timing.minMinutes(p.key)
                const remaining = timing.remainingMinutes(p.key)
                // Soluk: mod kapalı veya minimum süre dolmadı (basılabilir — uyarı / backend mesajı gösterilir)
                const blocked = !state.isInMaintenanceMode || (remaining != null && remaining > 0)
                // Gecikmiş kart hafta kademesinin rengini alır (tier_reminder/warning/critical)
                const sevClass = st.tier ? styles[`tier_${st.tier}`] : styles[`sev_${st.severity}`]
                return (
                  <div
                    key={p.key}
                    className={`${styles.periodCard} ${sevClass ?? ''}`}
                  >
                    <div className={styles.periodHeader}>
                      <span className={styles.periodLabel}>{t(p.label)}</span>
                      <span className={styles.periodInterval}>{t('her {n} gün', { n: p.intervalDays })}</span>
                    </div>

                    <div className={styles.periodStatus}>
                      <span className={styles.periodStatusLabel}>{t('DURUM')}</span>
                      <span className={styles.periodStatusValue}>
                        {severityLabel(st.severity, st.daysUntilNext, st.overdueDays ?? 0, t)}
                      </span>
                      {st.tier && (
                        <span className={styles.periodTier}>
                          {t(maintenanceTierTitle(st.tier))}
                          {st.lockSoon && ` · ${t('BAKIM KİLİDİ YAKINDA')}`}
                        </span>
                      )}
                    </div>

                    <div className={styles.periodDates}>
                      <div className={styles.periodDateRow}>
                        <span>{t('SON YAPILDI:')}</span>
                        <b>{formatDateShort(st.lastAt, locale)}</b>
                      </div>
                      <div className={styles.periodDateRow}>
                        <span>{t('SONRAKİ:')}</span>
                        <b>{formatDateShort(st.nextAt, locale)}</b>
                      </div>
                      {minMin != null && (
                        <div className={styles.periodDateRow}>
                          <span>{t('MİN. BAKIM SÜRESİ:')}</span>
                          <b>{t('{n} DK', { n: minMin })}</b>
                        </div>
                      )}
                    </div>

                    <button
                      className={`${styles.markBtn} ${blocked ? styles.markBtnBlocked : ''}`}
                      onClick={() => handleMarkCompleted(p)}
                      disabled={pendingKey !== null}
                    >
                      {pendingKey === p.key
                        ? t('İŞARETLENİYOR…')
                        : remaining != null && remaining > 0
                          ? t('{n} DK SONRA', { n: remaining })
                          : `✓ ${t('BAKIM YAPILDI')}`}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* ── Bilgi notu ────────────────────────── */}
            <p className={styles.note}>
              {t('Yaklaşan bakımlar (7 gün kala) sarı işaretlenir. Geciken bakımlar: 1. hafta yeşil hatırlatma, 2. hafta sarı uyarı, 3. hafta kırmızı kritik.')}
              {' '}{t('Servis işlemi öncesi/sonrası')} <b>{t('Bakım Modu')}</b>{t("'nu açık tutun — modda geçen süre BAKIM kullanım süresine yazılır. (PDF s.8-12)")}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
