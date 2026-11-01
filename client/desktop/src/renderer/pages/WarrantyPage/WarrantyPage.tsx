// SEKIL: Ayarlar > Garanti Süresi (PDF s.15)
// DataApi'den MachineIdentity çeker; 4 kategori × 750 gün tablosu ve garanti-dışı haller listesi
// PDF kılavuzu içeriğinden.
// Bulut v2 (BULUT_API_V2.md §1 madde 44): GET /api/cloud/config → warranty varsa (üretici varsayılanı ya da
// makineye özel) kategori × gün + başlangıç tarihi buradan gösterilir; yoksa yukarıdaki yerel tablo aynen.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CloudWarranty, MachineIdentity } from '@shared/types'
import { useCloudConfig } from '@/stores/cloudConfigStore'
import { Icon } from '@/components/Icon'
import { useLang, useT } from '@/i18n'
import styles from './WarrantyPage.module.css'

interface WarrantyCategory {
  key: string
  label: string
  days: number
}

// PDF s.15: dört ünitenin garanti süresi eşit — hepsi 750 gün.
const WARRANTY_CATEGORIES: WarrantyCategory[] = [
  { key: 'mechanical', label: 'MEKANİK ÜNİTE',   days: 750 },
  { key: 'hydraulic',  label: 'HİDROLİK ÜNİTE',  days: 750 },
  { key: 'electronic', label: 'ELEKTRONİK ÜNİTE', days: 750 },
  { key: 'cnc',        label: 'CNC ÜNİTE',       days: 750 },
]

// PDF s.15: garanti kapsamı DIŞINDA kalan durumlar.
const EXCLUSIONS: string[] = [
  'Kullanım hatasından kaynaklanan arızalar',
  'Aksatılan/atlanan periyodik bakımların yol açtığı hasarlar',
  'Orijinal olmayan yedek parça kullanımı',
  'Makine çalışırken üzerinde kaynak yapılması',
]

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.floor(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60 * 24),
  )
}

function daysRemaining(endIso: string): number {
  const end = new Date(endIso).getTime()
  return Math.max(0, Math.floor((end - Date.now()) / (1000 * 60 * 60 * 24)))
}

export default function WarrantyPage() {
  const navigate = useNavigate()
  const t = useT()
  const [identity, setIdentity] = useState<MachineIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cloud = useCloudConfig()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.corventa.settings
      .getIdentity()
      .then((data) => { if (!cancelled) setIdentity(data) })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? t('Garanti bilgisi alınamadı'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('GARANTİ SÜRESİ')}</h1>
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.stateMsg}>{t('Yükleniyor…')}</div>}

        {error && !loading && (
          <div className={`${styles.stateMsg} ${styles.errorMsg}`}>
            {t('Hata: {err}', { err: error })}
          </div>
        )}

        {identity && !loading && (
          <WarrantyContent
            identity={identity}
            cloud={cloud?.warranty && cloud.warranty.categories?.length ? cloud.warranty : null}
          />
        )}
      </div>
    </div>
  )
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()
}

function WarrantyContent({ identity, cloud }: { identity: MachineIdentity; cloud: CloudWarranty | null }) {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const remaining = daysRemaining(identity.warrantyEndDate)
  const total = daysBetween(identity.warrantyStartDate, identity.warrantyEndDate)
  const percent = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0
  const isExpired = remaining === 0
  const isLow = !isExpired && remaining < 30

  return (
    <>
      {/* ── Kalan garanti + info ─────────────────── */}
      <div className={`${styles.card} ${styles.statusCard}`}>
        <div className={styles.statusBlock}>
          <span className={styles.statusLabel}>{t('KALAN GARANTİ')}</span>
          <div
            className={`${styles.statusValue} ${
              isExpired ? styles.expired : isLow ? styles.lowWarn : ''
            }`}
          >
            {isExpired ? t('SÜRESİ DOLDU') : t('{n} GÜN', { n: remaining })}
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${
                isExpired ? styles.expired : isLow ? styles.lowWarn : ''
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.infoGrid}>
          <InfoRow label={t('MÜŞTERİ')} value={identity.customerName} />
          <InfoRow label={t('SERİ NO')} value={identity.serialNo} />
          <InfoRow label={t('SAHİPLİK')} value={t(identity.ownershipType)} />
          <InfoRow label={t('GARANTİ BAŞLANGIÇ')} value={formatDate(identity.warrantyStartDate, locale)} />
          <InfoRow label={t('GARANTİ BİTİŞ')} value={formatDate(identity.warrantyEndDate, locale)} />
          <InfoRow label={t('TOPLAM GARANTİ')} value={t('{n} gün', { n: total })} />
        </div>
      </div>

      {/* ── Bulut garanti politikası: kategori × gün + başlangıç (bitiş/kalan kategori başına) ── */}
      {cloud && (
        <div className={`${styles.card} ${styles.catCard}`}>
          <div className={styles.sectionTitle}>
            {t('KAPSANAN ÜNİTELER')}
            <span className={styles.cloudTag}>
              {cloud.isMachineSpecific ? t('BULUT · MAKİNEYE ÖZEL') : t('BULUT · ÜRETİCİ VARSAYILANI')}
            </span>
          </div>
          <div className={styles.cloudStart}>
            {t('GARANTİ BAŞLANGIÇ')}: <strong>{formatDate(cloud.startDate ?? identity.warrantyStartDate, locale)}</strong>
          </div>
          <div className={styles.categoryGrid}>
            {cloud.categories.map((cat) => {
              const end = addDays(cloud.startDate ?? identity.warrantyStartDate, cat.days)
              const left = daysRemaining(end)
              return (
                <div key={cat.key} className={styles.categoryTile}>
                  <span className={styles.categoryLabel}>{t(cat.label)}</span>
                  <span className={styles.categoryDays}>{t('{n} GÜN', { n: cat.days })}</span>
                  <span className={`${styles.categoryEnd} ${left === 0 ? styles.expired : ''}`}>
                    {left === 0 ? t('SÜRESİ DOLDU') : t('{date} · {n} gün kaldı', { date: formatDate(end, locale), n: left })}
                  </span>
                </div>
              )
            })}
          </div>
          {cloud.notes && <div className={styles.cloudNote}>{cloud.notes}</div>}
        </div>
      )}

      {/* ── 4 kategori × 750 gün tablosu (bulut politikası yoksa) ─────────── */}
      {!cloud && (
      <div className={`${styles.card} ${styles.catCard}`}>
        <div className={styles.sectionTitle}>{t('KAPSANAN ÜNİTELER (PDF s.15)')}</div>
        <div className={styles.categoryGrid}>
          {WARRANTY_CATEGORIES.map((cat) => (
            <div key={cat.key} className={styles.categoryTile}>
              <span className={styles.categoryLabel}>{t(cat.label)}</span>
              <span className={styles.categoryDays}>{t('{n} GÜN', { n: cat.days })}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ── Garanti dışı haller ──────────────────── */}
      <div className={`${styles.card} ${styles.exclCard}`}>
        <div className={styles.sectionTitle}>{t('GARANTİ KAPSAMI DIŞINDA')}</div>
        <ul className={styles.exclusionList}>
          {(cloud?.exclusions?.length ? cloud.exclusions : EXCLUSIONS).map((item) => (
            <li key={item} className={styles.exclusionItem}>
              <span className={styles.exclusionBullet}><Icon name="failure" size="md" /></span>
              <span>{t(item)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.note}>
        {t('Garanti süresi içinde oluşan donanım arızaları ücretsiz olarak giderilir. Detaylı bilgi için Servis menüsünden talep oluşturabilirsiniz.')}
      </p>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}
