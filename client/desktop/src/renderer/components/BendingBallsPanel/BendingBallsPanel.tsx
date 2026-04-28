import BendingBall from './BendingBall'
import styles from './BendingBallsPanel.module.css'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'

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
          <img src={artificialIntelligenceIcon} alt="Artificial Intelligence" className={styles.aiIcon} width={80} height={80} />
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
