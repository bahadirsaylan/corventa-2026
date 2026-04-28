import BendingBall from './BendingBall'
import styles from './BendingBallsPanel.module.css'

// Static mock data — will be replaced by real-time Engine API data
const balls = {
  top:    { id: 'top',    value: 120.2, active: true  },
  left:   { id: 'left',  value: 90.7,  active: true  },
  right:  { id: 'right', value: 95.1,  active: true  },
  bottom: { id: 'bottom', value: 80.4, active: false },
}

const bendingStats = {
  bendingSpeed: 10,
  currentRow: 11,
  currentX: 90.7,
  prevRow: 10,
  prevY: 95.1,
  nextRow: 12,
  nextY: 97.8,
  estimatedFinish: '5dk. 29sn.',
  statusText: 'GEOMETRİSEL KIVRIM DEVAM EDİYOR',
}

export default function BendingBallsPanel() {
  return (
    <div className={styles.panel}>

      {/* ── Header row ─────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerLabel}>PRESSURE</span>
          <span className={styles.headerValue}>200</span>
          <span className={styles.headerUnit}>BAR</span>
        </div>

        <div className={styles.headerCenter}>
          {/* AI chip icon — SVG inline */}
          <svg className={styles.aiIcon} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="16" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="3"/>
            <rect x="24" y="24" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.5"/>
            <line x1="32" y1="4" x2="32" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <line x1="32" y1="48" x2="32" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <line x1="4" y1="32" x2="16" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <line x1="48" y1="32" x2="60" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <line x1="20" y1="4" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="44" y1="4" x2="44" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="20" y1="48" x2="20" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="44" y1="48" x2="44" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="44" x2="16" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="20" x2="60" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="44" x2="60" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className={styles.aiLabel}>ARTIFICIAL INTELLIGENCE MODE</span>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.headerLabel}>TOLERANCE</span>
          <span className={styles.headerValue}>0.1</span>
          <span className={styles.headerUnit}>mm</span>
        </div>
      </div>

      {/* ── Ball grid ──────────────────────────────── */}
      <div className={styles.ballGrid}>

        {/* Left arrow + ball */}
        <div className={styles.colLeft}>
          <div className={styles.arrowLeft}>
            <svg viewBox="0 0 80 80" fill="none">
              <circle cx="12" cy="40" r="8" stroke="#999" strokeWidth="3"/>
              <path d="M20 40 Q50 10 68 40" stroke="#f5d76e" strokeWidth="14" fill="none" strokeLinecap="round"/>
              <polygon points="58,28 72,36 64,50" fill="var(--color-primary)"/>
            </svg>
          </div>
          <BendingBall {...balls.left} />
        </div>

        {/* Center column — top ball + arch label + bottom ball */}
        <div className={styles.colCenter}>
          <BendingBall {...balls.top} />
          <div className={styles.archLabel}>R 1500</div>
          <BendingBall {...balls.bottom} />
        </div>

        {/* Right arrow + ball */}
        <div className={styles.colRight}>
          <div className={styles.arrowRight}>
            <svg viewBox="0 0 80 80" fill="none">
              <circle cx="68" cy="40" r="8" stroke="#999" strokeWidth="3"/>
              <path d="M60 40 Q30 10 12 40" stroke="#f5d76e" strokeWidth="14" fill="none" strokeLinecap="round"/>
              <polygon points="22,28 8,36 16,50" fill="var(--color-primary)"/>
            </svg>
          </div>
          <BendingBall {...balls.right} />
        </div>

      </div>

      {/* ── Stats footer ───────────────────────────── */}
      <div className={styles.statsBar}>

        <div className={styles.statsCol}>
          <p className={styles.speedText}>
            KIVRIM HIZI{' '}
            <span className={styles.speedValue}>{bendingStats.bendingSpeed}</span>{' '}
            METRE / DAKİKA
          </p>
        </div>

        <div className={`${styles.statsCol} ${styles.statsColCenter}`}>
          <p className={styles.posSmall}>
            {bendingStats.prevRow}&nbsp;&nbsp;&nbsp;Y : {bendingStats.prevY.toFixed(1)}
          </p>
          <p className={styles.posCurrent}>
            {bendingStats.currentRow}&nbsp;
            <span className={styles.posX}>X : {bendingStats.currentX.toFixed(1)}</span>
          </p>
          <p className={styles.posSmall}>
            {bendingStats.nextRow}&nbsp;&nbsp;&nbsp;Y : {bendingStats.nextY.toFixed(1)}
          </p>
        </div>

        <div className={styles.statsCol}>
          <p className={styles.finishLabel}>
            TAHMİNİ BİTİŞ SÜRESİ{' '}
            <span className={styles.finishValue}>{bendingStats.estimatedFinish}</span>
          </p>
          <p className={styles.statusText}>{bendingStats.statusText}</p>
        </div>

      </div>
    </div>
  )
}
