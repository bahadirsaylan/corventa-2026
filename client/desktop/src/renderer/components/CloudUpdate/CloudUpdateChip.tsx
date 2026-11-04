// "GÜNCELLEME VAR" rozeti — alt panel şeridinde, internet ikonunun yanında (BULUT_API.md §5).
// Bulut durumu uygulama genelinde 60 sn'de bir yoklanır; yeni sürüm yoksa hiçbir şey çizilmez.
// Dokununca Ayarlar > Bulut Bağlantısı (indir / kur orada).

import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import { IconLabel } from '@/components/Icon'
import { useCloudStatusPolling, useCloudStore } from '@/stores/cloudStore'
import styles from './CloudUpdateChip.module.css'

const APP_POLL_MS = 60_000

export default function CloudUpdateChip() {
  const t = useT()
  const navigate = useNavigate()
  useCloudStatusPolling(APP_POLL_MS)
  const update = useCloudStore((s) => s.status?.update ?? null)
  if (!update) return null

  return (
    <button
      type="button"
      className={styles.chip}
      data-ready={update.downloaded ? 'true' : undefined}
      onClick={() => navigate('/settings/big-data')}
      title={t('Yeni sürüm: {v}', { v: update.version })}
    >
      <IconLabel icon="download">{update.downloaded ? t('GÜNCELLEME HAZIR') : t('GÜNCELLEME VAR')}</IconLabel>
    </button>
  )
}
