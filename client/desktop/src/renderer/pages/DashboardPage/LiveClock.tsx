import { useState, useEffect } from 'react'
import styles from './LiveClock.module.css'

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MONTHS = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
                'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']

interface LiveClockProps {
  dateOnly?: boolean
}

export default function LiveClock({ dateOnly = false }: LiveClockProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (dateOnly) {
    return (
      <div className={styles.date}>
        <span className={styles.dateDay}>{now.getDate()} {MONTHS[now.getMonth()]}</span>
        <span className={styles.dateYear}>{now.getFullYear()}</span>
      </div>
    )
  }

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const dayName = DAYS[now.getDay()]

  return (
    <div className={styles.clock}>
      <div className={styles.time}>
        {hh}:{mm}<span className={styles.seconds}>:{ss}</span>
      </div>
      <div className={styles.dayName}>{dayName}</div>
    </div>
  )
}
