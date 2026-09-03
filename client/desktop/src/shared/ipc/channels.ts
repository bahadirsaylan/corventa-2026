// IPC kanal isimleri — main + preload + renderer'da bu sabitleri kullan.
// Magic string yok; rename refactor güvenli.

// invoke (renderer → main, request/response)
export const IpcInvoke = {
  // Connection / state
  GetConnectionStatus: 'connection:get-status',
  GetMachineState: 'machine:get-state',

  // Engine API — bending pipeline
  BendingCalculate: 'bending:calculate',
  BendingPreview: 'bending:preview',
  RecommendStage: 'preparation:recommend-stage',
  ApplyStage: 'preparation:apply-stage',
  StartBendingJob: 'bending-job:start',
  CancelBendingJob: 'bending-job:cancel',
  ConfirmSideSupport: 'bending-job:confirm-side-support',
  MeasurementRetryAction: 'bending-job:measurement-retry-action',
  CancelMeasurementRetry: 'bending-job:cancel-measurement-retry',

  // DataApi
  CreateBendingJob: 'data:create-bending-job',
  GetActiveBendingJob: 'data:get-active-bending-job',
  GetBendingJob: 'data:get-bending-job',
  AddArcSegment: 'data:add-arc-segment',
  // AI RECIPE FAZ 4B UI (2026-09-04) — dairesel bukumun onceden eslesme kontrolu (read-only)
  FindSimilarBendingJob: 'data:find-similar-bending-job',

  // Machine commands — Manuel mode kontrolleri
  PistonJog: 'piston:jog',
  PistonPosition: 'piston:position',
  PistonPressure: 'piston:pressure',
  PistonStop: 'piston:stop',
  RotationJog: 'rotation:jog',
  RotationPosition: 'rotation:position',
  RotationDistance: 'rotation:distance',
  RotationStop: 'rotation:stop',
  PneumaticControl: 'pneumatic:control',
  PneumaticStop: 'pneumatic:stop',
  SideSupportControl: 'side-support:control',
  EmergencyStop: 'machine:emergency-stop',
  SetMachineMode: 'machine:set-mode',
  SendMachineCommand: 'machine:send-command',

  // DataApi — Service modülü (Soru/Öneri/Şikayet + Servis Talepleri/Raporları)
  ServiceListTickets: 'service:list-tickets',
  ServiceGetTicket: 'service:get-ticket',
  ServiceCreateTicket: 'service:create-ticket',
  ServiceUpdateTicketStatus: 'service:update-ticket-status',

  ServiceListRequests: 'service:list-requests',
  ServiceGetRequest: 'service:get-request',
  ServiceCreateRequest: 'service:create-request',
  ServiceUpdateRequest: 'service:update-request',
  ServiceStartRequest: 'service:start-request',
  ServiceCompleteRequest: 'service:complete-request',
  ServiceConfirmRequest: 'service:confirm-request',
  ServiceRateRequest: 'service:rate-request',
  ServiceListReports: 'service:list-reports',

  // DataApi — Settings (Ayarlar sayfaları)
  SettingsGetIdentity: 'settings:get-identity',
  SettingsUpdateIdentity: 'settings:update-identity',
  SettingsGetMaintenance: 'settings:get-maintenance',
  SettingsMarkMaintenanceCompleted: 'settings:mark-maintenance-completed',
  SettingsSetMaintenanceMode: 'settings:set-maintenance-mode',

  // System / utilities
  OpenUserGuide: 'system:open-user-guide',
} as const

// send (main → renderer, push)
export const IpcEvent = {
  StateUpdated: 'machine:state-updated',
  BendingProgress: 'machine:bending-progress',
  EventReceived: 'corventa:event-received',
  ConnectionStatusChanged: 'connection:status-changed',
} as const

export type IpcInvokeChannel = (typeof IpcInvoke)[keyof typeof IpcInvoke]
export type IpcEventChannel = (typeof IpcEvent)[keyof typeof IpcEvent]
