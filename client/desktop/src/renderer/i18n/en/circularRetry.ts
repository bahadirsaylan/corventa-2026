// 2026-11-27 — dairesel bükümde ölçüm hatasında TEKRAR ÖLÇ
const en: Record<string, string> = {
  'Geri esneme sensörü ölçüm yapamadı.': 'The springback sensor could not measure.',
  'Parçayı ve sensörü kontrol edin, sonra <b>TEKRAR ÖLÇ</b> ile yeniden ölçün.': 'Check the part and the sensor, then measure again with <b>MEASURE AGAIN</b>.',
  'BÜKÜMÜ BİTİR': 'FINISH BENDING',
  'TEKRAR ÖLÇ': 'MEASURE AGAIN',
  'DAİRESEL — ÖLÇÜM HATASINDA': 'CIRCULAR — ON MEASUREMENT ERROR',
  'TEKRAR ÖLÇ SOR': 'ASK TO MEASURE AGAIN',
  'TEKRAR ÖLÇ SOR: geri esneme sensörü ölçemezse büküm bitmez, operatöre TEKRAR ÖLÇ / BÜKÜMÜ BİTİR sorulur (en fazla 5 kez). BÜKÜMÜ BİTİR: eski davranış.':
    'ASK TO MEASURE AGAIN: if the springback sensor cannot measure, bending does not end; the operator is asked MEASURE AGAIN / FINISH BENDING (up to 5 times). FINISH BENDING: previous behaviour.',
}

export default en
