// Backend bağlantısı kopuk veya watchdog stale ise üstte sürekli görünen şerit.
// Tasarım dili: kırmızı vurgu + uyarı tonu, mevcut Corventa palette'iyle.

import type { ReactElement } from 'react'

import { useStaleMs, useOverallConnectionState } from '@/hooks/useConnectionStatus'
import styles from './ConnectionBanner.module.css'

const STALE_THRESHOLD_MS = 5_000

export default function ConnectionBanner(): ReactElement | null {
  const overall = useOverallConnectionState()
  const staleMs = useStaleMs()

  // Bağlantı tam ve veri taze → banner yok
  if (overall === 'connected' && Number.isFinite(staleMs) && staleMs < STALE_THRESHOLD_MS) {
    return null
  }

  let label = ''
  let variant: 'warn' | 'error' = 'warn'

  if (overall === 'connecting') {
    label = 'MAKİNEYE BAĞLANILIYOR…'
  } else if (overall === 'reconnecting') {
    label = 'BAĞLANTI YENİDEN KURULUYOR…'
  } else if (overall === 'disconnected' || overall === 'error') {
    label = 'MAKİNEYE BAĞLANILAMIYOR'
    variant = 'error'
  } else if (Number.isFinite(staleMs) && staleMs >= STALE_THRESHOLD_MS) {
    const sec = Math.floor(staleMs / 1000)
    label = `VERİ AKMIYOR — ${sec}sn ÖNCESİNE AİT DURUM GÖSTERİLİYOR`
    variant = 'error'
  }

  if (!label) return null

  return (
    <div className={`${styles.banner} ${variant === 'error' ? styles.error : styles.warn}`}>
      <span className={styles.dot} />
      <span className={styles.label}>{label}</span>
    </div>
  )
}
