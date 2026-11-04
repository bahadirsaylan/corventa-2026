// Backend bağlantı durumu — UI'da ConnectionBanner buradan beslenir.

import { create } from 'zustand'

import type { ConnectionState, ConnectionStatus } from '@shared/types'

interface ConnectionStore {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
  /** Watchdog: state son güncellemeden bu yana kaç ms geçti */
  staleMs: number
  setStaleMs: (ms: number) => void
}

const INITIAL_STATUS: ConnectionStatus = {
  engineHttp: 'disconnected',
  machineHub: 'disconnected',
  dataApiHttp: 'disconnected',
  corventaHub: 'disconnected',
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: INITIAL_STATUS,
  setStatus: (status) => set({ status }),
  staleMs: Number.POSITIVE_INFINITY,
  setStaleMs: (staleMs) => set({ staleMs }),
}))

export function isFullyConnected(status: ConnectionStatus): boolean {
  return (
    status.engineHttp === 'connected' &&
    status.machineHub === 'connected' &&
    status.dataApiHttp === 'connected' &&
    status.corventaHub === 'connected'
  )
}

export function worstState(status: ConnectionStatus): ConnectionState {
  const states = [
    status.engineHttp,
    status.machineHub,
    status.dataApiHttp,
    status.corventaHub,
  ]
  if (states.includes('error')) return 'error'
  if (states.includes('disconnected')) return 'disconnected'
  if (states.includes('reconnecting')) return 'reconnecting'
  if (states.includes('connecting')) return 'connecting'
  return 'connected'
}
