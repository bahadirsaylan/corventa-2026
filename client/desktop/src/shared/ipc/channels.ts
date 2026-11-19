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
  BendingArcValidatePlan: 'bending:arc-validate-plan',
  RecommendStage: 'preparation:recommend-stage',
  ApplyStage: 'preparation:apply-stage',
  ExecuteGonye: 'preparation:execute-gonye',
  // Tahliye (SEKIL-18): geri sayım sonrası üst top geri + rotasyon; durdur = devam eden tahliyeyi keser
  UnloadPart: 'preparation:unload-part',
  StopUnload: 'preparation:stop-unload',
  // Yağ ısıtma programı (Admin Ayarları > TEST) — gönye + 4 top/rotasyon ileri-geri, hedef sıcaklığa kadar
  OilHeatingStart: 'oil-heating:start',
  OilHeatingStop: 'oil-heating:stop',
  OilHeatingStatus: 'oil-heating:status',
  // Basınç düşüş testi (Admin Ayarları > TEST) — seçilen yan top ileri, basınç düşüşü kuralı izlenir
  PressureDropTestStart: 'pressure-drop-test:start',
  PressureDropTestStop: 'pressure-drop-test:stop',
  PressureDropTestStatus: 'pressure-drop-test:status',
  PressureDropTestLogs: 'pressure-drop-test:logs',
  PressureDropTestLog: 'pressure-drop-test:log',
  // Radyus (GT2) sensörü sıfırla / temizle / PLC encoder reset (Admin Ayarları > ÖLÇÜM & SENSÖR)
  RadiusSensorAction: 'radius-sensor:action',
  StartBendingJob: 'bending-job:start',
  CancelBendingJob: 'bending-job:cancel',
  // 2026-11-01 — acil stop kesintisi: devam durumu / DEVAM ET / MANUEL TAHLİYE (bırak)
  GetResumeStatus: 'bending-job:resume-status',
  ResumeBendingJob: 'bending-job:resume',
  AbandonBendingJob: 'bending-job:abandon',
  ConfirmSideSupport: 'bending-job:confirm-side-support',
  MeasurementRetryAction: 'bending-job:measurement-retry-action',
  CancelMeasurementRetry: 'bending-job:cancel-measurement-retry',
  // STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU: parça sıkılıyken elle düzeltme pasosu (Bending API)
  ManualCorrectStart: 'bending-job:manual-correct-start',
  ManualCorrectStatus: 'bending-job:manual-correct-status',
  ManualCorrectStop: 'bending-job:manual-correct-stop',

  // DataApi
  CreateBendingJob: 'data:create-bending-job',
  GetActiveBendingJob: 'data:get-active-bending-job',
  GetBendingJob: 'data:get-bending-job',
  AddArcSegment: 'data:add-arc-segment',
  // AI RECIPE FAZ 4B UI (2026-09-04) — dairesel bukumun onceden eslesme kontrolu (read-only)
  FindSimilarBendingJob: 'data:find-similar-bending-job',
  // AI ÖĞRENME KURALLARI (2026-11-19) — eşleşme kriterleri / toleranslar (DataApi /api/ai-recipe-rules) + deneme (similar?explain=true)
  AiRecipeRulesGet: 'data:ai-recipe-rules-get',
  AiRecipeRulesSave: 'data:ai-recipe-rules-save',
  AiRecipeExplain: 'data:ai-recipe-explain',
  // BÜKÜM GEÇMİŞİ (Ayarlar > Büküm Geçmişi) — iş listesi + iş logları + log dışa aktarma (kayıt penceresi)
  ListBendingJobs: 'data:list-bending-jobs',
  GetBendingLogs: 'data:get-bending-logs',
  ExportBendingLogs: 'bending-history:export-logs',

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
  SetHydraulicMotor: 'machine:set-hydraulic-motor',
  SetFan: 'machine:set-fan', // MAKİNE DEĞERLERİ (2026-11-19) — POST /api/machine/fan
  SetAlarm: 'machine:set-alarm', // MAKİNE DEĞERLERİ (2026-11-19) — POST /api/machine/alarm
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
  // DataApi — Hata anı snapshot'ları (EXCEL 26, Ayarlar > Hata Raporları)
  ErrorSnapshotList: 'error-snapshot:list',
  ErrorSnapshotGet: 'error-snapshot:get',
  // DataApi — UYARI KAYITLARI (2026-11-19): POST OPERATOR+, liste / özet SUPERVISOR+ (DataApi [RequireRole])
  AlertAckCreate: 'alert-ack:create',
  AlertAckList: 'alert-ack:list',
  AlertAckSummary: 'alert-ack:summary',
  // Sıkıştırma telemetrisi (2026-11-04)
  ClampTelemetryList: 'clamp-telemetry:list',
  ClampTelemetryGet: 'clamp-telemetry:get',
  // 2026-11-05 — sadece demo: makineden alınan sıkıştırma CSV'lerini içe aktar
  ClampTelemetryImportCsv: 'clamp-telemetry:import-csv',

  // DataApi — Settings (Ayarlar sayfaları)
  SettingsGetIdentity: 'settings:get-identity',
  SettingsUpdateIdentity: 'settings:update-identity',
  SettingsGetMaintenance: 'settings:get-maintenance',
  SettingsMarkMaintenanceCompleted: 'settings:mark-maintenance-completed',
  SettingsSetMaintenanceMode: 'settings:set-maintenance-mode',
  // Bakım modu kuralları — hatırlatmada DEVAM ET + min süre / hatırlatma / otomatik kapanma (PUT ADMIN+)
  SettingsContinueMaintenance: 'settings:continue-maintenance',
  SettingsGetMaintenanceRules: 'settings:get-maintenance-rules',
  SettingsUpdateMaintenanceRules: 'settings:update-maintenance-rules',
  SettingsGetUserPreference: 'settings:get-user-preference',
  SettingsPutUserPreference: 'settings:put-user-preference',
  SettingsGetStages: 'settings:get-stages',
  // Bending API — makine ayarları (Operatör / Admin ayar ekranları). Kayıt sonrası backend orchestrator'ı yeniler.
  SettingsGetMachine: 'settings:get-machine',
  SettingsUpdateMachine: 'settings:update-machine',
  SettingsGetGonye: 'settings:get-gonye',
  SettingsUpdateGonye: 'settings:update-gonye',
  SettingsUpdateStage: 'settings:update-stage',
  SettingsGetAllStages: 'settings:get-all-stages',
  SettingsCreateStage: 'settings:create-stage',

  // DataApi — Sertifika sorgulama
  CertificateGetByCode: 'certificate:get-by-code',

  // DataApi — Müşteri değişikliği (satış / takas / hibe, e-posta OTP onaylı)
  CustomerChangeRequest: 'customer-change:request',
  CustomerChangeConfirm: 'customer-change:confirm',

  // DataApi — Kullanım süreleri (usage-time)
  UsageGetSummary: 'usage:get-summary',
  // DataApi — Kıvrım adetleri raporu (GET /api/reports/bending-count)
  UsageGetBendingCountReport: 'usage:get-bending-count-report',

  // DataApi — Rol sistemi (giriş / ilk kurulum / kullanıcı yönetimi). Token main süreçte kalır.
  AuthGetSetupStatus: 'auth:get-setup-status',
  AuthSetup: 'auth:setup',
  AuthLogin: 'auth:login',
  AuthLogout: 'auth:logout',
  AuthCompleteSetup: 'auth:complete-setup', // EXCEL 40 — tek seferlik kurulum kullanıcısı
  AuthGetCurrent: 'auth:get-current',
  UsersList: 'users:list',
  UsersCreate: 'users:create',
  UsersUpdate: 'users:update',
  UsersDeactivate: 'users:deactivate',

  // DataApi — Usta öğrenme programı / makro (EXCEL 28). Silme SERVICEMAN+ (DataApi [RequireRole]).
  MacroList: 'macro:list',
  MacroGet: 'macro:get',
  MacroCreate: 'macro:create',
  MacroUpdate: 'macro:update',
  MacroDelete: 'macro:delete',

  // DataApi — STANDART SÜRÜM kayıtlı bükümler (2026-11-17). Yazma OPERATOR+, silme SUPERVISOR+ (DataApi [RequireRole]).
  SavedBendList: 'saved-bend:list',
  SavedBendGet: 'saved-bend:get',
  SavedBendCreate: 'saved-bend:create',
  SavedBendUpdate: 'saved-bend:update',
  SavedBendRan: 'saved-bend:ran',
  SavedBendDelete: 'saved-bend:delete',

  // DataApi — Bulut bağlantısı (BULUT_API.md §4) + güncelleme kurulumu (§5, main setup'ı başlatıp kapanır)
  CloudGetStatus: 'cloud:get-status',
  CloudActivate: 'cloud:activate',
  CloudSyncNow: 'cloud:sync-now',
  CloudDownloadUpdate: 'cloud:download-update',
  CloudSetShare: 'cloud:set-share',
  CloudDeactivate: 'cloud:deactivate',
  CloudGetInstallBlockers: 'cloud:get-install-blockers',
  CloudInstallUpdate: 'cloud:install-update',

  // DataApi — Bulut v2 (BULUT_API_V2.md §6): kalıp kütüphanesi + lisans, yönetilen veriler, checklist sonucu
  MoldList: 'mold:list',
  MoldGet: 'mold:get',
  MoldActivate: 'mold:activate',
  CloudGetConfig: 'cloud:get-config',
  ChecklistSubmitResult: 'checklist:submit-result',
  // 2026-11-16 — checklist geçmişi (GET /api/checklist/results)
  ChecklistListResults: 'checklist:list-results',

  // System / utilities
  OpenUserGuide: 'system:open-user-guide',
  ReadUserGuide: 'system:read-user-guide',
  SystemIsDemo: 'system:is-demo',
  // 2026-11-05 — sadece demo pencere modu: ekran boyutu (in / out / reset / get) → yüzde
  DemoWindowZoom: 'demo:window-zoom',
  // İnternet erişimi (EXCEL 37) — son durum / şimdi kontrol et
  SystemGetInternetStatus: 'system:get-internet-status',
  SystemCheckInternetNow: 'system:check-internet-now',
} as const

// send (main → renderer, push)
export const IpcEvent = {
  StateUpdated: 'machine:state-updated',
  BendingProgress: 'machine:bending-progress',
  EventReceived: 'corventa:event-received',
  ConnectionStatusChanged: 'connection:status-changed',
  // İnternet erişim durumu değişti / yeni kontrol tamamlandı (EXCEL 37)
  InternetStatusChanged: 'system:internet-status-changed',
} as const

export type IpcInvokeChannel = (typeof IpcInvoke)[keyof typeof IpcInvoke]
export type IpcEventChannel = (typeof IpcEvent)[keyof typeof IpcEvent]
