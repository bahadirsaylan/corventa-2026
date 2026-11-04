import {
  isFullyConnected,
  useConnectionStore,
  worstState,
} from '@/stores/connectionStore'
import type { ConnectionState, ConnectionStatus } from '@shared/types'

export function useConnectionStatus(): ConnectionStatus {
  return useConnectionStore((s) => s.status)
}

export function useIsBackendOnline(): boolean {
  return useConnectionStore((s) => isFullyConnected(s.status))
}

export function useOverallConnectionState(): ConnectionState {
  return useConnectionStore((s) => worstState(s.status))
}

export function useStaleMs(): number {
  return useConnectionStore((s) => s.staleMs)
}
