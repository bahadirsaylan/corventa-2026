// Renderer açılınca bir kez çalışır — preload'u IPC event'lerine subscribe edip stores'a bağlar.
// App.tsx içinde useEffect'le mount sırasında çağrılır.

import { useConnectionStore } from '@/stores/connectionStore'
import { useEventsStore } from '@/stores/eventsStore'
import { useMachineStateStore } from '@/stores/machineStateStore'

let initialized = false
const cleanupFns: Array<() => void> = []

export function subscribeToBackend(): () => void {
  if (initialized) {
    return () => {}
  }
  initialized = true

  // Watchdog freshness — UI tarafinda gercek event'in geldigi zamana gore tutulur.
  // ConnectionStatus.lastStateUpdateAt sadece baglanti durumu degisince push edildigi
  // icin tek basina watchdog kaynagi olarak kullanilamaz.
  let lastStateReceivedAt: number | null = null

  // Initial dump — preload bridge ready, stores'a son state ve status'ü çek
  void window.corventa.machine
    .getState()
    .then((state) => {
      useMachineStateStore.getState().setState(state)
      // emptyMachineState() default ISO 1970-01-01 dondurur — gercek state geldi mi
      // anlamak icin timestamp epoch'tan farkli mi kontrol et
      if (state.timestamp && new Date(state.timestamp).getTime() > 0) {
        lastStateReceivedAt = Date.now()
      }
    })
    .catch(() => {
      // ignore — backend kapalı olabilir; ilk SignalR push'a kadar empty state kullanılır
    })

  void window.corventa.machine
    .getConnectionStatus()
    .then((status) => useConnectionStore.getState().setStatus(status))
    .catch(() => {})

  // Push subscriptions
  cleanupFns.push(
    window.corventa.events.onStateUpdated((state) => {
      useMachineStateStore.getState().setState(state)
      lastStateReceivedAt = Date.now()
    }),
  )

  cleanupFns.push(
    window.corventa.events.onBendingProgress((progress) => {
      useMachineStateStore.getState().setBendingProgress(progress)
    }),
  )

  cleanupFns.push(
    window.corventa.events.onMachineEvent((evt) => {
      useEventsStore.getState().push(evt)
    }),
  )

  cleanupFns.push(
    window.corventa.events.onConnectionStatusChanged((status) => {
      useConnectionStore.getState().setStatus(status)
    }),
  )

  // Watchdog — state freshness (her saniye onStateUpdated'tan gelen son zamani kullanir)
  const watchdogTimer = setInterval(() => {
    if (lastStateReceivedAt === null) {
      useConnectionStore.getState().setStaleMs(Number.POSITIVE_INFINITY)
      return
    }
    const ms = Date.now() - lastStateReceivedAt
    useConnectionStore.getState().setStaleMs(ms)
  }, 1_000)

  cleanupFns.push(() => clearInterval(watchdogTimer))

  return () => {
    initialized = false
    cleanupFns.splice(0).forEach((fn) => fn())
  }
}
