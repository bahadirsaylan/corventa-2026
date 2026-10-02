// "Otomatik büküm şu an aktif mi?" — tek merkezi kaynak.
//
// Neden ayrı store: BendingProgress push'u tek başına güvenilir değil. Backend bazı
// metotlarda (Arc/Serpantin/Sıvama) başarılı bitişte progress'i temizlemiyor ve son
// mesajı yayınlamaya devam ediyor; tersine, backend çökerse job DB'de Running kalabiliyor.
// İkisini birlikte değerlendiriyoruz:
//   aktif = DataApi'de Running job var  VE  (son 5 sn içinde progress push geldi
//                                             VEYA job'u ilk göreli 15 sn olmadı)
// İkinci koşuldaki 15 sn, StartJob'un ilk progress push'undan önceki kısa boşluğu kapatır.

import { create } from 'zustand'

import { useMachineStateStore } from './machineStateStore'

const POLL_JOB_MS = 2000
const TICK_MS = 1000
const PROGRESS_FRESH_MS = 5000
const START_GRACE_MS = 15000

interface BendingActivityStore {
  active: boolean
  runningJobId: number | null
}

export const useBendingActivityStore = create<BendingActivityStore>(() => ({
  active: false,
  runningJobId: null,
}))

let pollerStarted = false

/** AppLayout'ta bir kez çağrılır. Dönen fonksiyon poller'ı durdurur. */
export function startBendingActivityPoller(): () => void {
  if (pollerStarted) return () => {}
  pollerStarted = true

  let alive = true
  let runningJobId: number | null = null
  let detectedAt = 0
  let lastJobPoll = 0

  async function pollJob(): Promise<void> {
    try {
      const job = await window.corventa.bending.getActiveJob()
      if (!alive) return
      const id = job ? job.id : null
      if (id !== runningJobId) {
        runningJobId = id
        detectedAt = id != null ? Date.now() : 0
      }
    } catch {
      // DataApi'ye ulaşılamadı — son bilinen değeri koru, tazelik kontrolü yine kapı tutar.
    }
  }

  function evaluate(): void {
    const now = Date.now()
    const progressAt = useMachineStateStore.getState().bendingProgressAt
    const progressFresh = now - progressAt < PROGRESS_FRESH_MS
    const inStartGrace = runningJobId != null && now - detectedAt < START_GRACE_MS
    const active = runningJobId != null && (progressFresh || inStartGrace)

    const cur = useBendingActivityStore.getState()
    if (cur.active !== active || cur.runningJobId !== runningJobId) {
      useBendingActivityStore.setState({ active, runningJobId })
    }
  }

  async function tick(): Promise<void> {
    if (Date.now() - lastJobPoll >= POLL_JOB_MS) {
      lastJobPoll = Date.now()
      await pollJob()
    }
    if (alive) evaluate()
  }

  void tick()
  const timer = setInterval(() => { void tick() }, TICK_MS)

  return () => {
    alive = false
    pollerStarted = false
    clearInterval(timer)
  }
}

export function useBendingActive(): boolean {
  return useBendingActivityStore((s) => s.active)
}
