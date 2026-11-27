// 2026-11-20 (kullanıcı): büküm bitip parça alınınca (TAHLİYE > PARÇAYI ALDIM) toplar bükümün yapıldığı stage
// konumuna geri döner — operatör hemen TEKRAR deyip yeni parçayı verince zaman kaybetmesin.
// Hareket arka planda başlar; sonraki büküm akışı stage adımından ÖNCE bu dönüşün bitmesini bekler
// (aynı anda iki stage komutu gitmesin — bendingOrchestrator awaitStageReturn).
// Backend stage geçişi önce üst topu gönyeye geri çeker, büküm sürerken stage değişimini reddeder.

import { useMachineStateStore } from '@/stores/machineStateStore'

let pending: Promise<void> | null = null

/** Stage hareketi için koşullar (gönye alınmış, cetveller geçerli, motor hazır). */
export function stageMoveAllowed(): boolean {
  const s = useMachineStateStore.getState().state
  const gonye = s.physicalInfo?.isGonyeCompleted === true
  const rulersOk = s.rulerStatus == null || s.rulerStatus.valid !== false
  const motorReady = s.hydraulicMotorState === 2
  return gonye && rulersOk && motorReady
}

/** Tahliye sonrası dönülecek stage (bükümün yapıldığı stage) — koşullar uygun değilse null. */
export function returnStageCandidate(): number | null {
  const stage = useMachineStateStore.getState().state.physicalInfo?.currentStage ?? 0
  if (!(stage > 0) || !stageMoveAllowed() || pending) return null
  return stage
}

/** Stage hareketini arka planda başlatır (ekran değişse de sürer); hata fırlatır → çağıran gösterebilir.
 *  Sonraki büküm akışı awaitStageReturn ile bitmesini bekler. */
export function startStageMove(stage: number): Promise<void> {
  if (pending) return pending
  const p = window.corventa.bending
    .applyStage({ targetStage: stage, speedPercent: 50 })
    .then(() => undefined)
  pending = p.catch(() => undefined).finally(() => {
    pending = null
  })
  return p
}

/** Stage'e dönüşü arka planda başlatır (geri sayım çağıran tarafta — StageMoveCountdown). */
export function startStageReturn(stage: number): void {
  if (pending) return
  pending = window.corventa.bending
    .applyStage({ targetStage: stage, speedPercent: 50 })
    .then(() => undefined)
    .catch((err) => {
      console.warn('[stage-return] stage konumuna dönülemedi', err)
    })
    .finally(() => {
      pending = null
    })
}

/** Devam eden stage dönüşü varsa bitmesini bekler (hata yutulur — sonraki adım kendi stage komutunu verir). */
export async function awaitStageReturn(): Promise<void> {
  if (pending) await pending
}
