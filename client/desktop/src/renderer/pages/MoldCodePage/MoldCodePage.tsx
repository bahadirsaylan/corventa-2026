// Büküm akışı: ÖZEL KIVIRIM PROFİLLERİ → KALIP KODU (rota /bending/ai/mold-code) — BULUT_API_V2.md §2.4.
//   1. Kod ekran tuş takımıyla girilir (biçim maskesi + anlık uyarı), SORGULA → DataApi GET /api/molds/{code}
//   2. Bulunamadı / pasif / lisans iptal-süresi dolmuş → sebebiyle reddedilir; lisans gerekiyorsa LİSANS ANAHTARI
//   3. Kullanılabilir → onay: profileId + A/B/S kalıptan (ölçü ekranında kilitli), yön sayfası ATLANIR
//      (bendingDirection = NO_DIRECTION_DEFAULT, boş boru akışıyla aynı), doğrudan KIVIRIM METODU ekranı.
//      İş kaydına moldCode yazılır (jobPayloadMapper). Büküm algoritmasına dokunulmaz.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/PageHeader/PageHeader'
import StatusBar from '@/components/StatusBar/StatusBar'
import MoldCodeKeypad from '@/components/MoldLookup/MoldCodeKeypad'
import MoldResultCard from '@/components/MoldLookup/MoldResultCard'
import { moldUsability, useMoldLookup } from '@/components/MoldLookup/useMoldLookup'
import { moldProfileToBendingProfile } from '@/constants/moldProfiles'
import { NO_DIRECTION_DEFAULT } from '@/constants/profileDirections'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import { useT } from '@/i18n'
import { useBendingJobStore } from '@/store/bendingJobStore'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import styles from './MoldCodePage.module.css'

export default function MoldCodePage() {
  const navigate = useNavigate()
  const t = useT()
  const modeLabel = useBendingModeLabel()
  const setParams = useBendingJobStore((s) => s.setParams)
  // Geri dönüldüyse seçili kalıp kodu ile açılır ve yeniden sorgulanır (lisans durumu değişmiş olabilir)
  const storedCode = useBendingJobStore((s) => s.params.moldCode)
  const lookup = useMoldLookup(storedCode ?? '')

  useEffect(() => {
    if (storedCode) void lookup.lookup(storedCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = lookup.status === 'found' ? lookup.result : null
  const profileId = result ? moldProfileToBendingProfile(result.mold.profileType) : null
  const canContinue = !!result && !!profileId && moldUsability(result) === 'ok'

  function handleConfirm() {
    if (!result || !profileId || !canContinue) return
    const m = result.mold
    setParams({
      profileId,
      // Kalıpta boru alt tipi (dikişli / etli) sorulmaz — sadece kayıt alanı, hesaba girmez
      profileSubType: null,
      moldCode: m.code,
      mold: m,
      // Yön seçimi atlanır — yön seçimi olmayan profillerle (boş boru) aynı varsayılan (sadece kayıt)
      bendingDirection: NO_DIRECTION_DEFAULT,
    })
    navigate('/bending/ai/method')
  }

  return (
    <div className={styles.page}>
      <PageHeader icon={artificialIntelligenceIcon} iconAlt="Artificial Intelligence" label={modeLabel} />
      <h2 className={styles.title}>{t('KALIP KODUNU GİRİNİZ')}</h2>

      <div className={styles.content}>
        <div className={styles.left}>
          <MoldCodeKeypad
            value={lookup.code}
            onChange={lookup.setCode}
            onSubmit={() => void lookup.lookup()}
            formatError={lookup.formatError}
            busy={lookup.status === 'searching'}
          />
        </div>
        <div className={styles.right}>
          <MoldResultCard state={lookup} mode="flow" />
        </div>
      </div>

      <StatusBar
        backTo="/bending/ai"
        confirmDisabled={!canContinue}
        onConfirm={handleConfirm}
        hint={canContinue ? t('Onaylayınca yön seçimi atlanır, kıvırım metodu seçilir') : undefined}
      />
    </div>
  )
}
