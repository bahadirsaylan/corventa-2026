// Tip-güvenli selector hook'ları.
// Bileşen sadece ihtiyacı olan slice'ı dinler.
// NOT: Her SignalR StateUpdated (10 Hz) tamamen yeni nesne getirir. Nesne döndüren selector'lar
// (piston / sensors / safety) bu yüzden useShallow ile sarılı — alanlar değişmediyse önceki referans
// döner ve bileşen yeniden çizilmez. useMachineState ile nesne döndüren selector yazılırsa aynı
// sorun olur; primitive alan seçin.

import { useShallow } from 'zustand/react/shallow'
import { useMachineStateStore } from '@/stores/machineStateStore'
import type { MachineState, PistonState, SafetyState, SensorState } from '@shared/types'

export function useMachineState<T>(selector: (state: MachineState) => T): T {
  return useMachineStateStore((s) => selector(s.state))
}

export function usePiston(piston: 'rightPiston' | 'leftPiston' | 'upperPiston' | 'lowerPiston'): PistonState {
  return useMachineStateStore(useShallow((s) => s.state[piston]))
}

export function useSensors(): SensorState {
  return useMachineStateStore(useShallow((s) => s.state.sensors))
}

export function useSafety(): SafetyState {
  return useMachineStateStore(useShallow((s) => s.state.safety))
}

export function useHasFreshState(): boolean {
  return useMachineStateStore((s) => s.hasReceivedFirstUpdate)
}

export function useBendingProgress() {
  return useMachineStateStore((s) => s.bendingProgress)
}
