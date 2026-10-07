// Backend C# enum'larının TypeScript yansıması.
// Sayısal değerler birebir backend ile eşleşir.

export const MachineMode = {
  Manual: 0,
  SemiAuto: 1,
  Auto: 2,
  Setup: 3,
} as const
export type MachineMode = (typeof MachineMode)[keyof typeof MachineMode]

export const PistonId = {
  Right: 0,
  Left: 1,
  Upper: 2,
  Lower: 3,
} as const
export type PistonId = (typeof PistonId)[keyof typeof PistonId]

export const BendingJobStatus = {
  Created: 0,
  Calculating: 1,
  Ready: 2,
  Running: 3,
  Completed: 4,
  Failed: 5,
  Cancelled: 6,
} as const
export type BendingJobStatus = (typeof BendingJobStatus)[keyof typeof BendingJobStatus]

export const ProfileType = {
  Square: 0,
  Rectangular: 1,
  Round: 2,
  Angle: 3,
  Channel: 4,
  TProfile: 5,
  IProfile: 6,
  Flat: 7,
  Custom: 99,
} as const
export type ProfileType = (typeof ProfileType)[keyof typeof ProfileType]

export const BendingDirection = {
  Inward: 0,
  Outward: 1,
  Other: 2,
} as const
export type BendingDirection = (typeof BendingDirection)[keyof typeof BendingDirection]

export const BendingMethod = {
  FullCircle: 0,
  Arc: 1,
  Serpantin: 2,
  Sivama: 3,
} as const
export type BendingMethod = (typeof BendingMethod)[keyof typeof BendingMethod]

export const ErrorCode = {
  NoError: 0,
  EmergencyStop: 1,
  MotorThermal: 2,
  FanThermal: 3,
  PhaseSequence: 4,
  SystemNotReady: 11,
  ValveNotOpen: 12,
  CommunicationError: 13,
  MotorNotReady: 14,
  MovementTimeout: 20,
  StallDetected: 21,
  ExtraValveTimeout: 22,
  OilTempHigh: 31,
  OilLevelLow: 32,
  OilContaminated: 33,
  NoPartDetected: 41,
  PartMisaligned: 42,
  RotationDirectionConflict: 99,
} as const
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
