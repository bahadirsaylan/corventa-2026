// SignalR /machineHub'tan gelen tam MachineState'i tutar.
// Backend kapalıyken default empty state ile render edilir, UI null check yapmaz.

import { create } from 'zustand'

import { emptyMachineState, type BendingProgress, type MachineState } from '@shared/types'

interface MachineStateStore {
  state: MachineState
  bendingProgress: BendingProgress | null
  /** Son BendingProgress push'unun alındığı an (ms). Backend progress'i temizleyince
   *  push durur; bu değer eskir. "Büküm aktif" tespiti tazeliğe bakar. */
  bendingProgressAt: number
  /** UI'ın "veri var mı?" check'i için — ilk push gelene kadar false */
  hasReceivedFirstUpdate: boolean

  setState: (state: MachineState) => void
  setBendingProgress: (progress: BendingProgress) => void
  reset: () => void
}

export const useMachineStateStore = create<MachineStateStore>((set) => ({
  state: emptyMachineState(),
  bendingProgress: null,
  bendingProgressAt: 0,
  hasReceivedFirstUpdate: false,

  setState: (state) =>
    set({
      state,
      hasReceivedFirstUpdate: true,
    }),
  setBendingProgress: (bendingProgress) => set({ bendingProgress, bendingProgressAt: Date.now() }),
  reset: () =>
    set({
      state: emptyMachineState(),
      bendingProgress: null,
      bendingProgressAt: 0,
      hasReceivedFirstUpdate: false,
    }),
}))
