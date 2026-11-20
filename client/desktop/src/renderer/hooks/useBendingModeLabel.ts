// Otomatik büküm akışı (profil → yön → metot → ölçü → vals dizilimi) sayfa başlığı etiketi.
// Aynı ekranlar hem AI (ana ekran OTOMATİK BÜKÜM) hem Yarı Oto (Manuel > Yarı Oto) için kullanılır;
// başlık seçilen moda göre değişir. bendingMode null → AI gibi davranılır.

import { useT } from '@/i18n'
import { IS_STANDARD } from '@shared/edition'
import { useBendingJobStore } from '@/store/bendingJobStore'

export function useBendingModeLabel(): string {
  const t = useT()
  const bendingMode = useBendingJobStore((s) => s.params.bendingMode)
  // STANDART SÜRÜM (2026-11-17): yapay zeka / yarı oto ayrımı yok — otomatik büküm akışı tek mod
  if (IS_STANDARD) return t('OTOMATİK MOD')
  return bendingMode === 'semi' ? t('YARI OTOMATİK MOD') : t('YAPAY ZEKA MODU')
}
