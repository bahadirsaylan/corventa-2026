// Ayarlar > KALIP KODU SORGULA (rota /settings/mold-code) — BULUT_API_V2.md §2.4 adım 4.
// Kod → kalıp bilgisi + lisans durumu; lisans gerekiyorsa buradan da etkinleştirilir (OPERATOR+, anahtarla).
// Kütüphaneden gelinirse (?code=…&from=library) kod otomatik sorgulanır, geri → kütüphane.

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import MoldCodeKeypad from '@/components/MoldLookup/MoldCodeKeypad'
import MoldResultCard from '@/components/MoldLookup/MoldResultCard'
import { useMoldLookup } from '@/components/MoldLookup/useMoldLookup'
import { useT } from '@/i18n'
import styles from './MoldPages.module.css'

export default function MoldQueryPage() {
  const navigate = useNavigate()
  const t = useT()
  const [params] = useSearchParams()
  const initial = params.get('code') ?? ''
  const fromLibrary = params.get('from') === 'library'
  const lookup = useMoldLookup(initial)

  useEffect(() => {
    if (initial) void lookup.lookup(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(fromLibrary ? '/settings/mold-library' : '/settings')}
          aria-label={t('Geri')}
        >
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('KALIP KODU SORGULA')}</h1>
        <button type="button" className={styles.headerLink} onClick={() => navigate('/settings/mold-library')}>
          {t('KALIP KÜTÜPHANESİ')}
        </button>
      </div>

      <div className={styles.queryBody}>
        <div className={styles.queryLeft}>
          <MoldCodeKeypad
            value={lookup.code}
            onChange={lookup.setCode}
            onSubmit={() => void lookup.lookup()}
            formatError={lookup.formatError}
            busy={lookup.status === 'searching'}
          />
        </div>
        <div className={styles.queryRight}>
          <MoldResultCard state={lookup} mode="settings" />
        </div>
      </div>
    </div>
  )
}
