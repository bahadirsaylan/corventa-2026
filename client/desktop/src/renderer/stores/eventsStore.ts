// /corventa hub'ından gelen MachineEvent'leri tutar.
// Son N event'i buffer'lar, eventType bazında son değeri cache'ler.

import { create } from 'zustand'

import type { MachineEvent, PartSensorPayload } from '@shared/types'

const MAX_BUFFER = 50

interface EventsStore {
  /** Son N event (chronological) — debug ve toast geçmişi için */
  recent: MachineEvent[]
  /** eventType → son değer (cache'in yansıması) */
  byType: Record<string, MachineEvent>
  push: (evt: MachineEvent) => void
  clear: () => void
}

export const useEventsStore = create<EventsStore>((set) => ({
  recent: [],
  byType: {},
  push: (evt) =>
    set((s) => ({
      recent: [...s.recent.slice(-(MAX_BUFFER - 1)), evt],
      byType: { ...s.byType, [evt.eventType]: evt },
    })),
  clear: () => set({ recent: [], byType: {} }),
}))

// Selector helpers
export function selectPartSensor(byType: Record<string, MachineEvent>): PartSensorPayload | null {
  const evt = byType['PartSensor']
  return evt ? (evt.payload as PartSensorPayload) : null
}
