// 2026-09-22: Alt panel şeridinden açılan Hata Kayıtları modalı.
//   Kompakt liste görünümü (son N kayıt). Detay/filtre için Settings → Hata Raporları
//   sayfasına yönlendiren buton var. Şimdilik mock veri — ileride DataApi error log
//   endpoint'ine bağlanacak (backend'e dokunulmadı).

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ErrorLogsModal.module.css'

type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'

interface LogRow {
  id: number
  timestamp: string
  severity: Severity
  category: string
  message: string
}

const MOCK_LOGS: LogRow[] = [
  { id: 1, timestamp: '2026-09-22 09:22', severity: 'ERROR',    category: 'HİDROLİK', message: 'Hidrolik motor termal koruma tetiklendi' },
  { id: 2, timestamp: '2026-09-22 08:05', severity: 'WARNING',  category: 'SENSÖR',   message: 'SLPIS sensör ADC dalgalanma (>50 raw)' },
  { id: 3, timestamp: '2026-09-21 17:48', severity: 'CRITICAL', category: 'GÜVENLİK', message: 'Acil durdurma tetiklendi — Job #128 iptal' },
  { id: 4, timestamp: '2026-09-21 16:12', severity: 'ERROR',    category: 'MODBUS',   message: 'PLC read timeout 3× (bağlantı yeniden kuruldu)' },
  { id: 5, timestamp: '2026-09-21 14:33', severity: 'WARNING',  category: 'PIPELINE', message: 'Arc segment ölçüm tolerans dışı (0.24mm)' },
  { id: 6, timestamp: '2026-09-21 11:07', severity: 'INFO',     category: 'GENEL',    message: 'Gönye tamamlandı — L:3.75 R:3.75 U:0 L:10.51' },
  { id: 7, timestamp: '2026-09-20 15:20', severity: 'ERROR',    category: 'HİDROLİK', message: 'S1 basınç düştü (<10 bar / 3sn)' },
  { id: 8, timestamp: '2026-09-20 09:00', severity: 'INFO',     category: 'GENEL',    message: 'Makine açıldı — versiyon 2026.5.15' },
]

const SEV_LABEL: Record<Severity, string> = {
  CRITICAL: 'KRİTİK',
  ERROR: 'HATA',
  WARNING: 'UYARI',
  INFO: 'BİLGİ',
}

interface Props {
  onClose: () => void
}

export default function ErrorLogsModal({ onClose }: Props) {
  const navigate = useNavigate()

  //   ESC ile kapat + modal açıkken body scroll'ü kilitle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  //   Özet sayıları
  const counts = MOCK_LOGS.reduce(
    (acc, r) => {
      acc[r.severity]++
      return acc
    },
    { CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0 } as Record<Severity, number>,
  )

  function handleOpenFullPage() {
    onClose()
    navigate('/settings/error-reports')
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Hata Kayıtları"
      onClick={(e) => {
        //   Overlay'e tıklanınca kapat (içerik dışında)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>HATA KAYITLARI</h2>
            <div className={styles.subtitle}>Son {MOCK_LOGS.length} kayıt gösteriliyor</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Özet chip'ler */}
        <div className={styles.counters}>
          <span className={`${styles.chip} ${styles.chipCritical}`}>KRİTİK {counts.CRITICAL}</span>
          <span className={`${styles.chip} ${styles.chipError}`}>HATA {counts.ERROR}</span>
          <span className={`${styles.chip} ${styles.chipWarning}`}>UYARI {counts.WARNING}</span>
          <span className={`${styles.chip} ${styles.chipInfo}`}>BİLGİ {counts.INFO}</span>
        </div>

        {/* Liste */}
        <div className={styles.listWrap}>
          {MOCK_LOGS.length === 0 ? (
            <div className={styles.empty}>Kayıt yok</div>
          ) : (
            <ul className={styles.list}>
              {MOCK_LOGS.map((row) => (
                <li key={row.id} className={styles.row}>
                  <span className={`${styles.sev} ${styles['sev' + row.severity]}`}>
                    {SEV_LABEL[row.severity]}
                  </span>
                  <div className={styles.rowBody}>
                    <div className={styles.rowLine1}>
                      <span className={styles.category}>{row.category}</span>
                      <span className={styles.timestamp}>{row.timestamp}</span>
                    </div>
                    <div className={styles.message}>{row.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleOpenFullPage}
          >
            TÜM RAPORLAR →
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onClose}
          >
            KAPAT
          </button>
        </div>
      </div>
    </div>
  )
}
