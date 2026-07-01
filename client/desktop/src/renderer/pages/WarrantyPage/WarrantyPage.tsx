import { useNavigate } from 'react-router-dom'
import styles from './WarrantyPage.module.css'

// Şimdilik mock — gelecekte DataApi'den çekilecek.
const WARRANTY_INFO = {
  startDate: '2026-01-15',
  endDate: '2028-01-15',
  serialNo: 'CORVENTA-MIDI-2026-0042',
  customerName: 'SERSOVİS A.Ş.',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function daysRemaining(endIso: string): number {
  const end = new Date(endIso).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((end - now) / (1000 * 60 * 60 * 24)))
}

function totalDays(startIso: string, endIso: string): number {
  return Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60 * 24))
}

export default function WarrantyPage() {
  const navigate = useNavigate()
  const remaining = daysRemaining(WARRANTY_INFO.endDate)
  const total = totalDays(WARRANTY_INFO.startDate, WARRANTY_INFO.endDate)
  const percent = Math.max(0, Math.min(100, (remaining / total) * 100))
  const isExpired = remaining === 0
  const isLow = remaining < 30

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">
          ←
        </button>
        <h1 className={styles.title}>GARANTİ SÜRESİ</h1>
      </div>

      <div className={styles.body}>
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
            <InfoRow label="MÜŞTERİ" value={WARRANTY_INFO.customerName} />
            <InfoRow label="SERİ NO" value={WARRANTY_INFO.serialNo} />
            <InfoRow label="GARANTİ BAŞLANGIÇ" value={formatDate(WARRANTY_INFO.startDate)} />
            <InfoRow label="GARANTİ BİTİŞ" value={formatDate(WARRANTY_INFO.endDate)} />
            <InfoRow label="TOPLAM GARANTİ" value={`${total} gün`} />
          </div>
        </div>

        <p className={styles.note}>
          Garanti süresi içinde oluşan donanım arızaları ücretsiz olarak giderilir.
          Detaylı bilgi için Servis menüsünden talep oluşturabilirsiniz.
        </p>
      </div>
    </div>
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
