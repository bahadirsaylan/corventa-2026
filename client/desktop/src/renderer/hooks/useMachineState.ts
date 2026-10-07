// Tip-güvenli selector hook'ları.
// Bileşen sadece ihtiyacı olan slice'ı dinler — gereksiz re-render olmaz.

import { useMachineStateStore } from '@/stores/machineStateStore'
import type { MachineState, PistonState, SafetyState, SensorState } from '@shared/types'

export function useMachineState<T>(selector: (state: MachineState) => T): T {
  return useMachineStateStore((s) => selector(s.state))
}

export function usePiston(piston: 'rightPiston' | 'leftPiston' | 'upperPiston' | 'lowerPiston'): PistonState {
  return useMachineStateStore((s) => s.state[piston])
}

export function useSensors(): SensorState {
  return useMachineStateStore((s) => s.state.sensors)
}

export function useSafety(): SafetyState {
  return useMachineStateStore((s) => s.state.safety)
}

export function useHasFreshState(): boolean {
  return useMachineStateStore((s) => s.hasReceivedFirstUpdate)
}

export function useBendingProgress() {
  return useMachineStateStore((s) => s.bendingProgress)
}
