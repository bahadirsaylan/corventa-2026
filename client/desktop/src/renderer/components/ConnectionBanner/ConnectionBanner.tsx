// Backend bağlantısı kopuk veya watchdog stale ise üstte sürekli görünen şerit.
// Tasarım dili: kırmızı vurgu + uyarı tonu, mevcut Corventa palette'iyle.

import type { ReactElement } from 'react'

import { useOverallConnectionState } from '@/hooks/useConnectionStatus'
import { useConnectionStore } from '@/stores/connectionStore'
import { useT } from '@/i18n'
import styles from './ConnectionBanner.module.css'

const STALE_THRESHOLD_MS = 5_000

export default function ConnectionBanner(): ReactElement | null {
  const overall = useOverallConnectionState()
  // Watchdog staleMs'i her saniye farklı değerle yazar; banner sadece eşik/saniye değişince çizilsin.
  // 0 = taze (< eşik), sonsuz = henüz state gelmedi, aksi halde bayat geçen saniye.
  const staleSec = useConnectionStore((s) =>
    !Number.isFinite(s.staleMs) ? Number.POSITIVE_INFINITY
      : s.staleMs < STALE_THRESHOLD_MS ? 0
        : Math.floor(s.staleMs / 1000))
  const t = useT()

  // Bağlantı tam ve veri taze → banner yok
  if (overall === 'connected' && staleSec === 0) {
    return null
  }

  let label = ''
  let variant: 'warn' | 'error' = 'warn'

  if (overall === 'connecting') {
    label = t('MAKİNEYE BAĞLANILIYOR…')
  } else if (overall === 'reconnecting') {
    label = t('BAĞLANTI YENİDEN KURULUYOR…')
  } else if (overall === 'disconnected' || overall === 'error') {
    label = t('MAKİNEYE BAĞLANILAMIYOR')
    variant = 'error'
  } else if (Number.isFinite(staleSec) && staleSec > 0) {
    const sec = staleSec
    label = t('VERİ AKMIYOR — {sec}sn ÖNCESİNE AİT DURUM GÖSTERİLİYOR', { sec })
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
