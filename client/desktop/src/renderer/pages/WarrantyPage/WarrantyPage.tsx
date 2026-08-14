// SEKIL: Ayarlar > Garanti Süresi (PDF s.15)
// DataApi'den MachineIdentity çeker; 4 kategori × 750 gün tablosu ve garanti-dışı haller listesi
// PDF kılavuzu içeriğinden.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MachineIdentity } from '@shared/types'
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
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
  const [identity, setIdentity] = useState<MachineIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.corventa.settings
      .getIdentity()
      .then((data) => { if (!cancelled) setIdentity(data) })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Garanti bilgisi alınamadı')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">
          ←
        </button>
        <h1 className={styles.title}>GARANTİ SÜRESİ</h1>
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.stateMsg}>Yükleniyor…</div>}

        {error && !loading && (
          <div className={`${styles.stateMsg} ${styles.errorMsg}`}>
            Hata: {error}
          </div>
        )}

        {identity && !loading && <WarrantyContent identity={identity} />}
      </div>
    </div>
  )
}

function WarrantyContent({ identity }: { identity: MachineIdentity }) {
  const remaining = daysRemaining(identity.warrantyEndDate)
  const total = daysBetween(identity.warrantyStartDate, identity.warrantyEndDate)
  const percent = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0
  const isExpired = remaining === 0
  const isLow = !isExpired && remaining < 30

  return (
    <>
      {/* ── Kalan garanti + info ─────────────────── */}
      <div className={styles.card}>
        <div className={styles.statusBlock}>
          <span className={styles.statusLabel}>KALAN GARANTİ</span>
          <div
            className={`${styles.statusValue} ${
              isExpired ? styles.expired : isLow ? styles.lowWarn : ''
            }`}
          >
            {isExpired ? 'SÜRESİ DOLDU' : `${remaining} GÜN`}
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
          <InfoRow label="MÜŞTERİ" value={identity.customerName} />
          <InfoRow label="SERİ NO" value={identity.serialNo} />
          <InfoRow label="SAHİPLİK" value={identity.ownershipType} />
          <InfoRow label="GARANTİ BAŞLANGIÇ" value={formatDate(identity.warrantyStartDate)} />
          <InfoRow label="GARANTİ BİTİŞ" value={formatDate(identity.warrantyEndDate)} />
          <InfoRow label="TOPLAM GARANTİ" value={`${total} gün`} />
        </div>
      </div>

      {/* ── 4 kategori × 750 gün tablosu ─────────── */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>KAPSANAN ÜNİTELER (PDF s.15)</div>
        <div className={styles.categoryGrid}>
          {WARRANTY_CATEGORIES.map((cat) => (
            <div key={cat.key} className={styles.categoryTile}>
              <span className={styles.categoryLabel}>{cat.label}</span>
              <span className={styles.categoryDays}>{cat.days} GÜN</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Garanti dışı haller ──────────────────── */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>GARANTİ KAPSAMI DIŞINDA</div>
        <ul className={styles.exclusionList}>
          {EXCLUSIONS.map((item) => (
            <li key={item} className={styles.exclusionItem}>
              <span className={styles.exclusionBullet}>✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.note}>
        Garanti süresi içinde oluşan donanım arızaları ücretsiz olarak giderilir.
        Detaylı bilgi için Servis menüsünden talep oluşturabilirsiniz.
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
