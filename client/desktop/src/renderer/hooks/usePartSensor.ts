import { useShallow } from 'zustand/react/shallow'
import { selectPartSensor, useEventsStore } from '@/stores/eventsStore'
import type { PartSensorPayload } from '@shared/types'

/**
 * Parça varlık sensörü durumunu döner — DataApi /corventa hub'ından gelen son PartSensor event'i.
 * Backend yokken null döner; UI bunu "henüz veri yok" olarak gösterebilir.
 */
export function usePartSensor(): PartSensorPayload | null {
  // Shallow — her /corventa event'i (1 sn) payload'ı yeni nesne getirir; değer aynıysa yeniden çizim yok
  return useEventsStore(useShallow((s) => selectPartSensor(s.byType)))
}
