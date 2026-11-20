// Ölçü ekranlarının alt şeridinde (StatusBar hint) kalıp bilgisi — BULUT_API_V2.md §2.4.
// Kalıp seçili değilse null (şerit eskisi gibi). Önerilen adım SADECE gösterilir, G alanına yazılmaz.

import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { useMoldLock } from '@/constants/profileFields'
import { useT } from '@/i18n'

export function useMoldHint(): ReactNode | null {
  const t = useT()
  const lock = useMoldLock()
  if (!lock.locked || !lock.moldCode) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Icon name="lock" size={16} />
      <span>
        {t('KALIP')} <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{lock.moldCode}</strong>
        {' · '}
        {t('A / B / S KALIPTAN — DEĞİŞTİRİLEMEZ')}
      </span>
      {lock.suggestedStepMm != null && (
        <span style={{ color: '#15803d' }}>{t('ÖNERİLEN ADIM (G): {n} mm', { n: lock.suggestedStepMm })}</span>
      )}
    </span>
  )
}
