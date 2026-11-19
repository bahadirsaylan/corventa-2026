// 2026-11-20 (kullanıcı): büküm bitip parça alınınca (TAHLİYE > PARÇAYI ALDIM) toplar bükümün yapıldığı stage
// konumuna geri döner — operatör hemen TEKRAR deyip yeni parçayı verince zaman kaybetmesin.
// Hareket arka planda başlar; sonraki büküm akışı stage adımından ÖNCE bu dönüşün bitmesini bekler
// (aynı anda iki stage komutu gitmesin — bendingOrchestrator awaitStageReturn).
// Backend stage geçişi önce üst topu gönyeye geri çeker, büküm sürerken stage değişimini reddeder.

import { useMachineStateStore } from '@/stores/machineStateStore'

let pending: Promise<void> | null = null

/** Koşullar uygunsa (gönye alınmış, cetveller geçerli, motor hazır, stage biliniyor) stage'e dönüşü başlatır. */
export function startStageReturn(): number | null {
  const s = useMachineStateStore.getState().state
  const stage = s.physicalInfo?.currentStage ?? 0
  const gonye = s.physicalInfo?.isGonyeCompleted === true
  const rulersOk = s.rulerStatus == null || s.rulerStatus.valid !== false
  const motorReady = s.hydraulicMotorState === 2
  if (!(stage > 0) || !gonye || !rulersOk || !motorReady || pending) return null
  pending = window.corventa.bending
    .applyStage({ targetStage: stage, speedPercent: 50 })
    .then(() => undefined)
    .catch((err) => {
      console.warn('[stage-return] stage konumuna dönülemedi', err)
    })
    .finally(() => {
      pending = null
    })
  return stage
}

/** Devam eden stage dönüşü varsa bitmesini bekler (hata yutulur — sonraki adım kendi stage komutunu verir). */
export async function awaitStageReturn(): Promise<void> {
  if (pending) await pending
}
