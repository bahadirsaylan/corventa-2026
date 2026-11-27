// İnternet erişim göstergesi (EXCEL 37) — alt panel uyarı şeridinde küçük ağ ikonu.
//   ÇEVRİMİÇİ yeşil · ÇEVRİMDIŞI kırmızı · henüz kontrol yok gri.
//   Dokununca küçük bilgi kutusu: durum, son kontrol saati, gecikme + ŞİMDİ KONTROL ET.
// Kaynak: main süreç ConnectivityService (30 sn'de bir Google generate_204). Sadece bilgi amaçlı;
// makine / büküm akışını etkilemez.

import { useEffect, useRef, useState } from 'react'
import { useInternetStore } from '@/stores/internetStore'
import { useLang, useT } from '@/i18n'
import { Icon, IconLabel } from '@/components/Icon'
import type { InternetStatus } from '@shared/types'
import styles from './InternetStatusChip.module.css'

/** Durum metni — chip, bilgi kutusu ve Big Data sayfası ortak kullanır */
export function internetStateText(status: InternetStatus, t: (s: string) => string): string {
  if (status.state === 'online') return t('ÇEVRİMİÇİ')
  if (status.state === 'offline') return t('ÇEVRİMDIŞI')
  return status.checking ? t('KONTROL EDİLİYOR…') : t('BİLİNMİYOR')
}

/** ISO zaman → saat (HH:mm:ss); yoksa "—" */
export function formatCheckTime(iso: string | null, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(locale, { hour12: false })
}

export default function InternetStatusChip() {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const status = useInternetStore((s) => s.status)
  const checkNow = useInternetStore((s) => s.checkNow)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Kutunun dışına dokununca kapan
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const stateText = internetStateText(status, t)

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.chip}
        data-state={status.state}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('İnternet bağlantısı: {s}', { s: stateText })}
        aria-expanded={open}
      >
        <Icon name={status.state === 'offline' ? 'offline' : 'signal'} size="md" />
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label={t('İNTERNET BAĞLANTISI')}>
          <div className={styles.popTitle}>{t('İNTERNET BAĞLANTISI')}</div>
          <dl className={styles.rows}>
            <dt>{t('DURUM')}</dt>
            <dd data-state={status.state}>{stateText}</dd>
            <dt>{t('SON KONTROL')}</dt>
            <dd>{formatCheckTime(status.lastCheckedAt, locale)}</dd>
            <dt>{t('GECİKME')}</dt>
            <dd>{status.latencyMs != null ? `${status.latencyMs} ms` : '—'}</dd>
            {status.state === 'offline' && (
              <>
                <dt>{t('SON ÇEVRİMİÇİ')}</dt>
                <dd>{formatCheckTime(status.lastOnlineAt, locale)}</dd>
              </>
            )}
          </dl>
          {status.simulated && (
            <div className={styles.note}>{t('DEMO MODU — kontrol yapılmıyor, çevrimiçi varsayılıyor')}</div>
          )}
          <button
            type="button"
            className={styles.checkBtn}
            onClick={() => void checkNow()}
            disabled={status.checking}
          >
            <IconLabel icon="reference" size="sm">
              {status.checking ? t('KONTROL EDİLİYOR…') : t('ŞİMDİ KONTROL ET')}
            </IconLabel>
          </button>
          <div className={styles.note}>
            {t('Her 30 saniyede bir Google sunucusuna bağlantı denenir. Makine çalışmasını etkilemez.')}
          </div>
        </div>
      )}
    </div>
  )
}
