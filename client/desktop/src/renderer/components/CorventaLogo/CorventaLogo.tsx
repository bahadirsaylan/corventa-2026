import styles from './CorventaLogo.module.css'
import { IS_STANDARD } from '@shared/edition'

interface CorventaLogoProps {
  size?: 'full' | 'compact' | 'dashboard'
}

/**
 * The Corventa logo grid:
 *   C  O  R
 *   A  •  V
 *   T  N  E
 * followed by a red "ARTIFICIAL INTELLIGENCE BENDING MACHINE" banner.
 */
export default function CorventaLogo({ size = 'full' }: CorventaLogoProps) {
  return (
    <div className={`${styles.wrapper} ${styles[size]}`}>
      <div className={styles.card}>
        <div className={styles.grid}>
          <span className={styles.letter}>C</span>
          <span className={styles.letter}>O</span>
          <span className={styles.letter}>R</span>

          <span className={styles.letter}>A</span>
          <span className={styles.dot} />
          <span className={styles.letter}>V</span>

          <span className={styles.letter}>T</span>
          <span className={styles.letter}>N</span>
          <span className={styles.letter}>E</span>
        </div>
        <div className={styles.banner}>
          {/* STANDART SÜRÜM (2026-11-17): yapay zeka ibaresi yok */}
          {IS_STANDARD ? (
            <>CNC&nbsp;&nbsp;PROFILE&nbsp;&nbsp;BENDING&nbsp;&nbsp;MACHINE</>
          ) : (
            <>ARTIFICIAL&nbsp;&nbsp;INTELLIGENCE&nbsp;&nbsp;BENDING&nbsp;&nbsp;MACHINE</>
          )}
        </div>
      </div>
    </div>
  )
}
