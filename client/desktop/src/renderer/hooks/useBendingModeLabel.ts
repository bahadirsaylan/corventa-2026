// Otomatik büküm akışı (profil → yön → metot → ölçü → vals dizilimi) sayfa başlığı etiketi.
// Aynı ekranlar hem AI (ana ekran OTOMATİK BÜKÜM) hem Yarı Oto (Manuel > Yarı Oto) için kullanılır;
// başlık seçilen moda göre değişir. bendingMode null → AI gibi davranılır.

import { useT } from '@/i18n'
import { useBendingJobStore } from '@/store/bendingJobStore'

export function useBendingModeLabel(): string {
  const t = useT()
  const bendingMode = useBendingJobStore((s) => s.params.bendingMode)
  return bendingMode === 'semi' ? t('YARI OTOMATİK MOD') : t('YAPAY ZEKA MODU')
}
