// Ayarlar > Hata Raporları — tarih aralığı + kategori filtresi + log tablo.
// Backend: DataApi.errorLog listesi (henüz endpoint yok, mock).

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ErrorReportsPage.module.css'

type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'
type Category = 'SAFETY' | 'HYDRAULIC' | 'MODBUS' | 'PIPELINE' | 'SENSOR' | 'OTHER'

interface ErrorLogRow {
  id: number
  timestamp: string
  severity: Severity
  category: Category
  code: string
  message: string
  operator?: string
}

// Mock — gerçek liste DataApi.errorLog'dan gelecek
const MOCK_LOGS: ErrorLogRow[] = [
  { id: 1, timestamp: '2026-08-14 09:22', severity: 'ERROR',    category: 'HYDRAULIC', code: 'MOT-14', message: 'Hidrolik motor termal koruma (Faz 2)', operator: 'ahmet' },
  { id: 2, timestamp: '2026-08-14 08:05', severity: 'WARNING',  category: 'SENSOR',    code: 'SLPIS-4', message: 'SLPIS sensör ADC dalgalanma (>50 raw)', operator: 'mehmet' },
  { id: 3, timestamp: '2026-08-13 17:48', severity: 'CRITICAL', category: 'SAFETY',    code: 'EST-01', message: 'Acil durdurma tetiklendi — Job #128 iptal', operator: 'mehmet' },
  { id: 4, timestamp: '2026-08-13 16:12', severity: 'ERROR',    category: 'MODBUS',    code: 'MB-timeout', message: 'PLC read timeout 3× (bağlantı yeniden kuruldu)' },
  { id: 5, timestamp: '2026-08-13 14:33', severity: 'WARNING',  category: 'PIPELINE',  code: 'ARC-verify', message: 'Arc segment ölçüm tolerans dışı (0.24mm)', operator: 'ahmet' },
  { id: 6, timestamp: '2026-08-13 11:07', severity: 'INFO',     category: 'OTHER',     code: 'GONYE-OK', message: 'Gönye tamamlandı — L:3.75 R:3.75 U:0 L:10.51', operator: 'kadir' },
  { id: 7, timestamp: '2026-08-12 15:20', severity: 'ERROR',    category: 'HYDRAULIC', code: 'PRESS-1', message: 'S1 basınç düştü (<10 bar / 3sn)' },
  { id: 8, timestamp: '2026-08-12 09:00', severity: 'INFO',     category: 'OTHER',     code: 'STARTUP', message: 'Makine açıldı — versiyon 2026.5.15' },
]

const SEV_COLORS: Record<Severity, string> = {
  CRITICAL: '#7f1d1d', ERROR: '#dc2626', WARNING: '#f59e0b', INFO: '#3b82f6',
}

export default function ErrorReportsPage() {
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | Category>('ALL')
  const [dateFrom, setDateFrom] = useState('2026-08-12')
  const [dateTo, setDateTo] = useState('2026-08-14')

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter((r) => {
      if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false
      const d = r.timestamp.slice(0, 10)
      if (d < dateFrom || d > dateTo) return false
      return true
    })
  }, [severityFilter, categoryFilter, dateFrom, dateTo])

  const counts = useMemo(() => ({
    critical: MOCK_LOGS.filter((r) => r.severity === 'CRITICAL').length,
    error: MOCK_LOGS.filter((r) => r.severity === 'ERROR').length,
    warning: MOCK_LOGS.filter((r) => r.severity === 'WARNING').length,
    info: MOCK_LOGS.filter((r) => r.severity === 'INFO').length,
  }), [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>HATA RAPORLARI</h1>
        <button className={styles.exportBtn} onClick={() => alert('CSV dışa aktar (mock)')}>
          ↓ CSV DIŞA AKTAR
        </button>
      </div>

      <div className={styles.body}>
        {/* Özet kartlar */}
        <div className={styles.statsRow}>
          <SevStat label="KRİTİK"   count={counts.critical} color={SEV_COLORS.CRITICAL} />
          <SevStat label="HATA"     count={counts.error}    color={SEV_COLORS.ERROR} />
          <SevStat label="UYARI"    count={counts.warning}  color={SEV_COLORS.WARNING} />
          <SevStat label="BİLGİ"    count={counts.info}     color={SEV_COLORS.INFO} />
        </div>

        {/* Filtreler */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>FİLTRELER</div>
          <div className={styles.filterGrid}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>TARİH BAŞLANGIÇ</label>
              <input type="date" className={styles.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>TARİH BİTİŞ</label>
              <input type="date" className={styles.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>SEVİYE</label>
              <select className={styles.selectInput} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | Severity)}>
                <option value="ALL">HEPSİ</option>
                <option value="CRITICAL">KRİTİK</option>
                <option value="ERROR">HATA</option>
                <option value="WARNING">UYARI</option>
                <option value="INFO">BİLGİ</option>
              </select>
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>KATEGORİ</label>
              <select className={styles.selectInput} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | Category)}>
                <option value="ALL">HEPSİ</option>
                <option value="SAFETY">GÜVENLİK</option>
                <option value="HYDRAULIC">HİDROLİK</option>
                <option value="MODBUS">MODBUS</option>
                <option value="PIPELINE">PIPELINE</option>
                <option value="SENSOR">SENSÖR</option>
                <option value="OTHER">DİĞER</option>
              </select>
            </div>
          </div>
        </div>

        {/* Log tablo */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>KAYITLAR ({filtered.length})</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ZAMAN</th>
                <th>SEVİYE</th>
                <th>KATEGORİ</th>
                <th>KOD</th>
                <th>MESAJ</th>
                <th>OPERATÖR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>Filtreye uyan kayıt yok</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className={styles.tdMono}>{r.timestamp}</td>
                  <td>
                    <span className={styles.sevPill} style={{ background: SEV_COLORS[r.severity] }}>
                      {r.severity}
                    </span>
                  </td>
                  <td className={styles.tdCat}>{r.category}</td>
                  <td className={styles.tdMono}>{r.code}</td>
                  <td>{r.message}</td>
                  <td className={styles.tdOperator}>{r.operator ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SevStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={styles.sevCard} style={{ borderColor: color }}>
      <span className={styles.sevCardLabel}>{label}</span>
      <span className={styles.sevCardCount} style={{ color }}>{count}</span>
    </div>
  )
}
