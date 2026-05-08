// Machine state + connection status + Manuel mode kontrolleri.

import { ipcMain } from 'electron'

import { childLogger } from '@main/lib/logger'
import { connectionManager } from '@main/services/ConnectionManager'
import { engineApi } from '@main/services/engine-api/EngineApiClient'
import { Ipc } from '@shared'
import type {
  PistonJogRequest,
  PistonPositionRequest,
  PistonPressureRequest,
  PneumaticRequest,
  RotationDistanceRequest,
  RotationJogRequest,
  RotationPositionRequest,
} from '@shared/types'

const log = childLogger('ipc:machine')

export function registerMachineHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.GetConnectionStatus, () => {
    return connectionManager.getStatus()
  })

  ipcMain.handle(Ipc.IpcInvoke.GetMachineState, () => {
    return connectionManager.getLatestState()
  })

  // ---- Manuel control ----
  ipcMain.handle(Ipc.IpcInvoke.PistonJog, async (_evt, req: PistonJogRequest) => {
    log.info('piston jog', req)
    return engineApi.pistonJog(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.PistonPosition, async (_evt, req: PistonPositionRequest) => {
    log.info('piston position', req)
    return engineApi.pistonPosition(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.PistonPressure, async (_evt, req: PistonPressureRequest) => {
    log.info('piston pressure', req)
    return engineApi.pistonPressure(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.PistonStop, async (_evt, piston: string) => {
    log.info('piston stop', { piston })
    return engineApi.pistonStop(piston)
  })

  ipcMain.handle(Ipc.IpcInvoke.RotationJog, async (_evt, req: RotationJogRequest) => {
    log.info('rotation jog', req)
    return engineApi.rotationJog(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.RotationPosition, async (_evt, req: RotationPositionRequest) => {
    return engineApi.rotationPosition(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.RotationDistance, async (_evt, req: RotationDistanceRequest) => {
    return engineApi.rotationDistance(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.RotationStop, async () => {
    log.info('rotation stop')
    return engineApi.rotationStop()
  })

  ipcMain.handle(Ipc.IpcInvoke.PneumaticControl, async (_evt, req: PneumaticRequest) => {
    log.info('pneumatic control', req)
    return engineApi.pneumaticControl(req)
  })
  ipcMain.handle(Ipc.IpcInvoke.PneumaticStop, async (_evt, side: string) => {
    return engineApi.pneumaticStop(side)
  })

  ipcMain.handle(Ipc.IpcInvoke.EmergencyStop, async () => {
    log.warn('EMERGENCY STOP triggered from UI')
    return engineApi.emergencyStop()
  })

  ipcMain.handle(Ipc.IpcInvoke.SetMachineMode, async (_evt, mode: number) => {
    log.info('set machine mode', { mode })
    return engineApi.setMode(mode)
  })

  ipcMain.handle(Ipc.IpcInvoke.SendMachineCommand, async (_evt, command: unknown) => {
    // Generic fallback — gelecekteki yeni komutlar için
    log.warn('Generic SendMachineCommand not implemented', { command })
    throw new Error('Use specific command channels (PistonJog, RotationJog, etc.)')
  })
}
