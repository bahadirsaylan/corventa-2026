// Backend MachineState (Core/Models/MachineState.cs) yansıması.
// SignalR /machineHub "StateUpdated" event'i bu şekli gönderir.
// Backend C# pascalCase property'lerini default JSON serializer camelCase'e çevirir.

import type { ErrorCode, MachineMode } from './enums'

export interface MachineState {
  // System status
  mode: MachineMode
  hydraulicMotorState: number // 0=OFF, 1=Starting, 2=Ready
  fanActive: boolean
  alarmActive: boolean
  systemReady: boolean
  safetyBits: number
  errorCode: ErrorCode

  // Pistons
  rightPiston: PistonState
  leftPiston: PistonState
  upperPiston: PistonState
  lowerPiston: PistonState

  // Rotation
  rotation: RotationState

  // Sensors
  sensors: SensorState

  // Pneumatics
  rightPneumatic: PneumaticState
  leftPneumatic: PneumaticState

  // Safety (decoded)
  safety: SafetyState

  // Springback
  springback: SpringbackState

  // SLPIS sensor
  slpisSensorRaw: number
  slpisSensorMm: number
  slpisSensorEffectiveMm: number
  slpisSensorZeroed: boolean

  // Physical state info
  physicalInfo: PhysicalStateInfo

  timestamp: string // ISO-8601 UTC
}

export interface PistonState {
  encoderRaw: number
  positionMm: number
  inPosition: boolean
  moving: boolean
  physicalPositionMm: number
  gonyeOffsetMm: number
  stageOffsetMm: number
  safeBackwardMm: number
  safeForwardMm: number
}

export interface RotationState {
  encoderRaw: number
  activeDirection: number // -1=CCW, 0=Stop, 1=CW
  positionMm: number
  inPosition: boolean
}

export interface SensorState {
  s1PressureBar: number
  s2PressureBar: number
  s1FlowCms: number
  s2FlowCms: number
  oilTempC: number
  oilHumidityPercent: number
  oilLevelPercent: number
}

export interface PneumaticState {
  encoderPosition: number
  activeDirection: number // -1=Back, 0=Stop, 1=Forward
  extended: boolean
  retracted: boolean
}

export interface SafetyState {
  emergencyStopOK: boolean
  motorThermalOK: boolean
  fanThermalOK: boolean
  phaseSequenceOK: boolean
  leftPartSensor: boolean
  rightPartSensor: boolean
  contaminationK1: boolean
  contaminationK2: boolean
  contaminationK3: boolean
}

export interface SpringbackState {
  state: number // 0=Idle .. 99=Error
  detectedPositionMm: number
  pneumaticStartMm: number
  pneumaticEndMm: number
  detectionType: number
  minValueMm: number
  errorCode: number
  isMeasuring: boolean
  isComplete: boolean
  hasError: boolean
}

export interface PhysicalStateInfo {
  isGonyeCompleted: boolean
  currentStage: number
  currentStageName: string | null
}

// Boş initial state — connection kurulmadan önce store'a default olarak konur.
// UI null check yerine bu default'la render eder.
export function emptyMachineState(): MachineState {
  const piston = (): PistonState => ({
    encoderRaw: 0,
    positionMm: 0,
    inPosition: false,
    moving: false,
    physicalPositionMm: 0,
    gonyeOffsetMm: 0,
    stageOffsetMm: 0,
    safeBackwardMm: 0,
    safeForwardMm: 0,
  })
  const pneumatic = (): PneumaticState => ({
    encoderPosition: 0,
    activeDirection: 0,
    extended: false,
    retracted: false,
  })
  return {
    mode: 0,
    hydraulicMotorState: 0,
    fanActive: false,
    alarmActive: false,
    systemReady: false,
    safetyBits: 0,
    errorCode: 0,
    rightPiston: piston(),
    leftPiston: piston(),
    upperPiston: piston(),
    lowerPiston: piston(),
    rotation: {
      encoderRaw: 0,
      activeDirection: 0,
      positionMm: 0,
      inPosition: false,
    },
    sensors: {
      s1PressureBar: 0,
      s2PressureBar: 0,
      s1FlowCms: 0,
      s2FlowCms: 0,
      oilTempC: 0,
      oilHumidityPercent: 0,
      oilLevelPercent: 0,
    },
    rightPneumatic: pneumatic(),
    leftPneumatic: pneumatic(),
    safety: {
      emergencyStopOK: false,
      motorThermalOK: false,
      fanThermalOK: false,
      phaseSequenceOK: false,
      leftPartSensor: false,
      rightPartSensor: false,
      contaminationK1: false,
      contaminationK2: false,
      contaminationK3: false,
    },
    springback: {
      state: 0,
      detectedPositionMm: 0,
      pneumaticStartMm: 0,
      pneumaticEndMm: 0,
      detectionType: 0,
      minValueMm: 0,
      errorCode: 0,
      isMeasuring: false,
      isComplete: false,
      hasError: false,
    },
    slpisSensorRaw: 0,
    slpisSensorMm: 0,
    slpisSensorEffectiveMm: 0,
    slpisSensorZeroed: false,
    physicalInfo: {
      isGonyeCompleted: false,
      currentStage: 0,
      currentStageName: null,
    },
    timestamp: new Date(0).toISOString(),
  }
}
