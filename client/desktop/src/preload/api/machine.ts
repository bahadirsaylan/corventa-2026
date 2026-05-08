// window.corventa.machine.* — renderer'dan main'e machine state + manuel kontrol.

import { ipcRenderer } from 'electron'

import {
  Ipc,
  type ConnectionStatus,
  type MachineState,
  type PistonJogRequest,
  type PistonPositionRequest,
  type PistonPressureRequest,
  type PneumaticRequest,
  type RotationDistanceRequest,
  type RotationJogRequest,
  type RotationPositionRequest,
} from '@shared'

export const machineApi = {
  getState: (): Promise<MachineState> => ipcRenderer.invoke(Ipc.IpcInvoke.GetMachineState),
  getConnectionStatus: (): Promise<ConnectionStatus> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.GetConnectionStatus),

  // Manuel piston
  pistonJog: (req: PistonJogRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PistonJog, req),
  pistonPosition: (req: PistonPositionRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PistonPosition, req),
  pistonPressure: (req: PistonPressureRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PistonPressure, req),
  pistonStop: (piston: string): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PistonStop, piston),

  // Manuel rotation
  rotationJog: (req: RotationJogRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RotationJog, req),
  rotationPosition: (req: RotationPositionRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RotationPosition, req),
  rotationDistance: (req: RotationDistanceRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.RotationDistance, req),
  rotationStop: (): Promise<unknown> => ipcRenderer.invoke(Ipc.IpcInvoke.RotationStop),

  // Manuel pneumatic
  pneumaticControl: (req: PneumaticRequest): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PneumaticControl, req),
  pneumaticStop: (side: string): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.PneumaticStop, side),

  emergencyStop: (): Promise<unknown> => ipcRenderer.invoke(Ipc.IpcInvoke.EmergencyStop),

  setMode: (mode: number): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SetMachineMode, mode),

  sendCommand: (command: unknown): Promise<unknown> =>
    ipcRenderer.invoke(Ipc.IpcInvoke.SendMachineCommand, command),
}

export type MachineApi = typeof machineApi
