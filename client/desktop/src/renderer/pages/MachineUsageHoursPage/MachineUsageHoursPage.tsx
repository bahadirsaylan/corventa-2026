// Ayarlar > Kullanma Süreleri — motor/pompa/fan/vals saat sayaçları + bakım geri sayımı.
// Backend: DataApi.machineHours (henüz endpoint yok, mock).

import { useNavigate } from 'react-router-dom'
import styles from './MachineUsageHoursPage.module.css'

interface HourCounter {
  key: string
  label: string
  desc: string
  hours: number
  serviceInterval: number // saat cinsinden bakım aralığı
  lastService?: string
}

const COUNTERS: HourCounter[] = [
  { key: 'motor',    label: 'HİDROLİK MOTOR',   desc: 'Ana pompa motoru toplam çalışma süresi',    hours: 1247,  serviceInterval: 2000, lastService: '2026-06-15' },
  { key: 'pump',     label: 'HİDROLİK POMPA',    desc: 'Pompa yağ pompalama süresi',                hours: 1247,  serviceInterval: 4000, lastService: '2026-01-10' },
  { key: 'fan',      label: 'SOĞUTMA FANI',      desc: 'Yağ soğutma fanı süresi',                   hours: 892,   serviceInterval: 5000, lastService: '2026-01-10' },
  { key: 'valveS1',  label: 'S1 VALFI',          desc: 'Üst/alt piston hattı valfi (döngü)',        hours: 486,   serviceInterval: 3000 },
  { key: 'valveS2',  label: 'S2 VALFI',          desc: 'Sağ/sol piston hattı valfi (döngü)',        hours: 512,   serviceInterval: 3000 },
  { key: 'rollers',  label: 'VALS TOPLARI',      desc: 'Toplam kıvrım işlem süresi',                hours: 984,   serviceInterval: 8000 },
  { key: 'rotation', label: 'ROTASYON MOTORU',   desc: 'Parça besleme rotasyon motoru',             hours: 1102,  serviceInterval: 5000 },
  { key: 'panel',    label: 'CNC PANEL',         desc: 'Makine güç açık süresi (kontrol panosu)',   hours: 2145,  serviceInterval: 10000, lastService: '2026-01-10' },
]

const TOTAL_UP_HOURS = 2145 // panel === total up
const INSTALL_DATE = '2025-11-04'

export default function MachineUsageHoursPage() {
  const navigate = useNavigate()

  const totalDays = Math.floor(
    (Date.now() - new Date(INSTALL_DATE).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>KULLANMA SÜRELERİ</h1>
      </div>

      <div className={styles.body}>
        {/* Overall summary */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>MAKİNE GENEL İSTATİSTİK</div>
          <div className={styles.summaryGrid}>
            <BigStat label="MAKİNE YAŞI"   value={`${totalDays}`} unit="GÜN" color="#2a2a2a" />
            <BigStat label="TOPLAM AÇIKKALMA" value={`${TOTAL_UP_HOURS.toLocaleString('tr-TR')}`} unit="SAAT" color="#1a6fd4" />
            <BigStat label="KURULUM"       value={new Date(INSTALL_DATE).toLocaleDateString('tr-TR')} color="#16a34a" small />
            <BigStat label="AKTİF OPERATÖR" value="3" color="#7c3aed" />
          </div>
        </div>

        {/* Counter grid */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>SAAT SAYAÇLARI</div>
          <div className={styles.counterList}>
            {COUNTERS.map((c) => {
              const remaining = c.serviceInterval - (c.hours % c.serviceInterval)
              const pct = (remaining / c.serviceInterval) * 100
              const isLow = pct < 20
              return (
                <div key={c.key} className={styles.counterRow}>
                  <div className={styles.counterInfo}>
                    <span className={styles.counterLabel}>{c.label}</span>
                    <span className={styles.counterDesc}>{c.desc}</span>
                  </div>
                  <div className={styles.counterHours}>
                    <span className={styles.counterHoursValue}>{c.hours.toLocaleString('tr-TR')}</span>
                    <span className={styles.counterHoursUnit}>saat</span>
                  </div>
                  <div className={styles.serviceCol}>
                    <div className={styles.serviceLabel}>SONRAKI BAKIM</div>
                    <div className={styles.progressWrap}>
                      <div
                        className={`${styles.progressFill} ${isLow ? styles.progressLow : ''}`}
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                    <div className={`${styles.serviceRemaining} ${isLow ? styles.textLow : ''}`}>
                      {remaining} saat kaldı
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className={styles.note}>
          Saat sayaçları makine açıldığı ilk andan itibaren, PLC tick counter'ından okunur.
          Bakım geri sayımı sıfırlanmadan geçen saatler kümülatif tutulur.
        </p>
      </div>
    </div>
  )
}

function BigStat({
  label, value, unit, color, small = false,
}: { label: string; value: string; unit?: string; color: string; small?: boolean }) {
  return (
    <div className={styles.bigStat}>
      <span className={styles.bigStatLabel}>{label}</span>
      <div className={styles.bigStatValueRow}>
        <span
          className={styles.bigStatValue}
          style={{ color, fontSize: small ? '20px' : '32px' }}
        >
          {value}
        </span>
        {unit && <span className={styles.bigStatUnit}>{unit}</span>}
      </div>
    </div>
  )
}
