import { selectPartSensor, useEventsStore } from '@/stores/eventsStore'
import type { PartSensorPayload } from '@shared/types'

/**
 * Parça varlık sensörü durumunu döner — DataApi /corventa hub'ından gelen son PartSensor event'i.
 * Backend yokken null döner; UI bunu "henüz veri yok" olarak gösterebilir.
 */
export function usePartSensor(): PartSensorPayload | null {
  return useEventsStore((s) => selectPartSensor(s.byType))
}
