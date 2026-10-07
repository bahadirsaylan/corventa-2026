using CncBendingMachine.Application.Commands.Bending;
using CncBendingMachine.Application.Commands.Preparation;
using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models.DataApi;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Büküm iş kaydı yönetimi — sensor-triggered orchestration.
/// </summary>
/// <remarks>
/// UI ORCHESTRATION (yeni akış — 6 adım):
///
///   1. POST /api/bending/calculate              (Bending API)  → piston pozisyonu
///   2. POST /api/bending/geometric/preview      (Bending API)  → toplam paso sayısı
///   3. GET  /api/preparation/recommend-stage    (Bending API)  → uygun stage (profileA'ya göre)
///   4. POST /api/bending-jobs                   (DataApi 5002, DİREKT) → BendingJob, Ready
///   5. POST /api/preparation/stage              (Bending API)  → seçilen stage'e geç
///   6a. UI SignalR /machineHub bağlanır, MachineState.Safety.Left/RightPartSensor izler
///   6b. Sensör aktif olunca → POST /api/bending-job/{id}/start (Bending API)
///       Pipeline: Clamp → Zero → Bend → AutoCorrect (4 adım, otomatik)
///
/// BU CONTROLLER'IN ENDPOINT'LERİ (Bending API tarafı):
///   POST /api/bending-job             [DEPRECATED] CreateJob — UI artık DataApi'ye direkt yazıyor (Step 4)
///   POST /api/bending-job/{id}/start  Job'u başlat (Step 6b) — pipeline arka planda çalışır
///   POST /api/bending-job/{id}/stop   Çalışan job'u durdur
///   GET  /api/bending-job/{id}        Durumu çek (veya SignalR canlı)
///   GET  /api/bending-job/{id}/logs   Bending log'ları (kategori/error filtreli)
///   GET  /api/bending-job             Liste (status filtreli)
///   DELETE /api/bending-job/{id}      Sil (Running olmayan)
///
/// SignalR event'leri (MachineStateHub):
///   StateUpdated      — MachineState (her 100ms)
///   BendingProgress   — { jobId, completedPasos, totalPasos, percentComplete, message } (aktif job varken)
/// </remarks>
[ApiController]
[Route("api/bending-job")]
public class BendingJobController : ControllerBase
{
    private readonly ILogger<BendingJobController> _logger;
    private readonly ISender _mediator;
    private readonly IDataApiClient _dataApi;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly BendingProgressService _bendingProgress;
    private readonly BendingLogService _bendingLog;

    public BendingJobController(
        ILogger<BendingJobController> logger,
        ISender mediator,
        IDataApiClient dataApi,
        IServiceScopeFactory scopeFactory,
        BendingProgressService bendingProgress,
        BendingLogService bendingLog)
    {
        _logger = logger;
        _mediator = mediator;
        _dataApi = dataApi;
        _scopeFactory = scopeFactory;
        _bendingProgress = bendingProgress;
        _bendingLog = bendingLog;
    }

    // ============================================================
    // 1. KAYIT OLUŞTUR
    // ============================================================

    /// <summary>
    /// [DEPRECATED] Yeni büküm kaydı oluştur — calculation + DataApi save tek adımda.
    /// </summary>
    /// <remarks>
    /// DEPRECATED: UI artık DataApi'ye direkt yazıyor. Yeni akış:
    ///   1. UI → POST /api/bending/calculate (Bending API, port 5000)        → piston pozisyonu
    ///   2. UI → POST /api/bending/geometric/preview (Bending API, port 5000) → toplam paso sayısı
    ///   3. UI → POST /api/bending-jobs (DataApi, port 5002, DİREKT)          → tam BendingJob (Ready)
    ///
    /// Bu endpoint geriye uyum için tutuldu — gerekmediği zaman silinecek.
    /// Çağrıldığında log warning üretir.
    /// </remarks>
    [Obsolete("UI artik DataApi'ye direkt yazmali (POST /api/bending-jobs, port 5002). Bu endpoint geriye uyum icin tutuldu, sonra silinecek.")]
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromBody] CreateBendingJobRequest request)
    {
        _logger.LogWarning("[DEPRECATED] POST /api/bending-job endpoint cagrildi — UI artik DataApi'ye direkt yazmali (POST /api/bending-jobs port 5002). Bu endpoint sonra silinecek.");
        try
        {
        // Makine ayarlarını DataApi'den oku (lazy-create — null donmez)
        var settings = await _dataApi.GetMachineSettingsAsync();

        // Piston pozisyonunu hesapla (makine parametreleri ayarlardan gelir)
        var calcResult = await _mediator.Send(new CalculateBendingCommand
        {
            BallDiameter = settings.DefaultBallDiameterMm,
            Thickness = request.ProfileA,
            CenterDistance = settings.DefaultCenterDistanceMm,
            TargetBendingDiameter = request.TargetDiameterMm,
            XA1 = settings.DefaultXA1,
            YA1 = settings.DefaultYA1,
            Theta = settings.DefaultThetaDeg
        });

        if (calcResult == null || calcResult.PistonPosition <= 0)
        {
            return BadRequest(new { Success = false, Error = "Büküm hesaplaması başarısız. Parametreleri kontrol edin." });
        }

        // Paso planını önizle (toplam paso sayısını bul)
        var preview = await _mediator.Send(new PreviewGeometricBendingCommand
        {
            TargetPositionMm = calcResult.PistonPosition,
            PartLengthMm = request.PartLengthMm,
            SafetyMarginMm = settings.DefaultSafetyMarginMm,
            StepDistanceMm = request.StepDistanceMm,
            FirstStepDistanceMm = request.FirstStepDistanceMm,
            ActiveSensorSide = settings.DefaultActiveSensorSide
        });

        var job = new BendingJob
        {
            Status = BendingJobStatus.Ready,

            // Profil (UI'dan gelir)
            ProfileType = request.ProfileType,
            Direction = request.Direction ?? BendingDirection.Inward,
            Method = request.Method,
            ProfileA = request.ProfileA,
            ProfileB = request.ProfileB,
            ProfileS = request.ProfileS,
            TargetDiameterMm = request.TargetDiameterMm,
            ProfileH = request.ProfileH,
            ProfileG = request.ProfileG,

            // Parça (UI'dan gelir)
            PartLengthMm = request.PartLengthMm,
            StepDistanceMm = request.StepDistanceMm,
            FirstStepDistanceMm = request.FirstStepDistanceMm,
            // Boşluk alma HER ZAMAN mesafe-bazlı (DB default: 0.2mm). User override varsa onu kullan.
            SlackDistanceMm = request.SlackDistanceMm ?? settings.DefaultSlackDistanceMm,

            // Ayarlardan gelen değerler (o anki ayar snapshot'ı kaydedilir)
            ActiveSensorSide = settings.DefaultActiveSensorSide,
            ValsCode = settings.DefaultValsCode,
            SafetyMarginMm = settings.DefaultSafetyMarginMm,
            ZeroResetDistanceMm = settings.ZeroResetDistanceMm,
            PistonSpeedPercent = settings.DefaultPistonSpeedPercent,
            RotationSpeedPercent = settings.DefaultRotationSpeedPercent,
            SlackPressureBar = settings.DefaultSlackPressureBar,
            ClampPressureBar = request.ClampPressureBar ?? settings.DefaultClampPressureBar,
            ToleranceMm = settings.DefaultToleranceMm,
            BallDiameterMm = settings.DefaultBallDiameterMm,
            CenterDistanceMm = settings.DefaultCenterDistanceMm,
            ThetaDeg = settings.DefaultThetaDeg,
            XA1 = settings.DefaultXA1,
            YA1 = settings.DefaultYA1,

            // Kullanıcı
            OperatorName = request.OperatorName,
            Notes = request.Notes,

            // Hesaplanan
            CalculatedPistonPositionMm = calcResult.PistonPosition,
            TotalPasos = preview?.TotalPasos ?? 0
        };

        var created = await _dataApi.CreateBendingJobAsync(job);

        _logger.LogInformation("BendingJob #{Id} oluşturuldu: {Profile} Ø{Diameter}mm → Piston {Pos:F2}mm, {Pasos} paso",
            created.Id, created.ProfileType, created.TargetDiameterMm, calcResult.PistonPosition, created.TotalPasos);

        return CreatedAtAction(nameof(GetJob), new { id = created.Id }, MapToDto(created));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateJob hatası");
            return StatusCode(500, new { Success = false, Error = ex.Message });
        }
    }

    // ============================================================
    // 2. BÜKÜM BAŞLAT
    // ============================================================

    /// <summary>
    /// Büküm iş kaydını başlat — Clamp → Zero → Bending → AutoCorrect pipeline'ı çalıştırır.
    /// </summary>
    /// <remarks>
    /// ÖN KOŞULLAR (UI tarafından bu endpoint çağrılmadan ÖNCE yapılmalı):
    ///   1. Job kaydı DataApi'ye yazılmış olmalı (POST /api/bending-jobs) ve durumu Ready olmalı
    ///   2. Uygun stage seçilmiş olmalı (POST /api/preparation/stage)
    ///   3. Parça varlık sensörü aktif olmalı — UI SignalR'dan
    ///      MachineState.Safety.LeftPartSensor / RightPartSensor izler ve sensör görünce start çağırır
    ///
    /// Güvenlik: ADIM 1 (Clamp) içinde WaitForPartSensor=true zaten sensör kontrolü yapar
    /// (race condition koruması — UI çağrı yaptığı an ile Clamp arasında parça çekilirse Clamp bekler).
    ///
    /// Pipeline arka planda çalışır, ilerleme SignalR (BendingProgress event'i) ile push edilir.
    /// </remarks>
    [HttpPost("{id}/start")]
    public async Task<IActionResult> StartJob(int id)
    {
        var job = await _dataApi.GetBendingJobAsync(id);
        if (job == null)
            return NotFound(new { Success = false, Error = $"Job #{id} bulunamadı" });

        if (job.Status != BendingJobStatus.Ready)
            return BadRequest(new { Success = false, Error = $"Job #{id} başlatılamaz. Durum: {job.Status}" });

        // Başka çalışan job var mı kontrol et
        var runningJob = await _dataApi.GetActiveBendingJobAsync();
        if (runningJob != null)
            return BadRequest(new { Success = false, Error = $"Zaten çalışan bir büküm var: Job #{runningJob.Id}" });

        if (job.CalculatedPistonPositionMm == null || job.CalculatedPistonPositionMm <= 0)
            return BadRequest(new { Success = false, Error = "Piston pozisyonu hesaplanmamış" });

        // Status guncelle (DataApi PATCH)
        var startedAt = DateTime.UtcNow;
        await _dataApi.UpdateBendingJobAsync(id, new BendingJobUpdate
        {
            Status = BendingJobStatus.Running,
            StartedAt = startedAt
        });
        // Local copy'i de gunceller (background task'ta kullanilacak)
        job.Status = BendingJobStatus.Running;
        job.StartedAt = startedAt;

        _logger.LogInformation("BendingJob #{Id} başlatılıyor...", id);

        // Bükümü arka planda çalıştır
        var jobId = job.Id;
        var progressService = _bendingProgress;

        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
            var dataApi = scope.ServiceProvider.GetRequiredService<IDataApiClient>();

            // Periyodik DB güncelleme task'i (2 saniyede bir) — DataApi'ye HTTP PATCH
            using var progressCts = new CancellationTokenSource();
            var progressTask = Task.Run(async () =>
            {
                while (!progressCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(2000, progressCts.Token);
                        var bp = progressService.Get(jobId);
                        if (bp != null)
                        {
                            // DataApi'de partial update — Status check sunucu tarafinda gerekmez
                            // (job.Running degilken UpdatePartial yine yazar; tek riski:
                            //  Cancel/Failed sonrasi gecicen 1-2 sn de hala progress yazar.
                            //  Mevcut davranisla ayni — Status sonrasi nihai update onu duzeltir.)
                            await dataApi.UpdateBendingJobAsync(jobId, new BendingJobUpdate
                            {
                                CompletedPasos = bp.CompletedPasos,
                                TotalPasos = bp.TotalPasos
                            }, progressCts.Token);
                        }
                    }
                    catch (OperationCanceledException) { break; }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Progress DB update minor error (non-critical)");
                    }
                }
            }, progressCts.Token);

            try
            {
                // KONTRAT: UI bu endpoint'i çağırmadan önce şunları yapmış olmalı:
                //   1. Uygun stage'e geçiş (POST /api/preparation/stage)
                //   2. SignalR'dan parça varlık sensörünün aktif olduğunu gözlemleme
                // ADIM 1 (Clamp) WaitForPartSensor=true ile sensörü tekrar kontrol eder (race condition koruması).
                var orchestrator = scope.ServiceProvider.GetRequiredService<CncBendingMachine.Core.Interfaces.IMachineOrchestrator>();

                // ============================================================
                // ADIM 1: PARÇA SIKIŞTIR (Clamp)
                // ============================================================
                progressService.Update(jobId, 0, 0, "Parça sıkıştırılıyor...");
                _logger.LogInformation("BendingJob #{Id} ADIM 1: Parça sıkıştırma (Clamp)", jobId);

                var clampResult = await mediator.Send(new ClampPartCommand
                {
                    PressureBar = job.ClampPressureBar,
                    SpeedPercent = 30,
                    WaitForPartSensor = true,
                    SensorSide = job.ActiveSensorSide
                });

                if (!clampResult.Success)
                {
                    _bendingLog.LogError(jobId, "Pneumatic", $"Sıkıştırma hatası: {clampResult.ErrorMessage}");
                    await StopMachineAndFailJob(mediator, dataApi, jobId, $"Sıkıştırma hatası: {clampResult.ErrorMessage}");
                    return;
                }
                _bendingLog.LogPneumatic(jobId, "Parça sıkıştırıldı", job.ClampPressureBar);

                // ============================================================
                // ADIM 2: PARÇA SIFIRLA (Zero)
                // ============================================================
                progressService.Update(jobId, 0, 0, "Parça sıfırlanıyor...");
                _logger.LogInformation("BendingJob #{Id} ADIM 2: Parça sıfırlama (Zero)", jobId);

                var zeroResult = await mediator.Send(new ZeroPartCommand
                {
                    SensorSide = job.ActiveSensorSide,
                    ResetDistanceMm = job.ZeroResetDistanceMm,
                    SafetyDistanceMm = job.SafetyMarginMm,
                    FastSpeedPercent = 80,
                    SlowSpeedPercent = 10,
                    PositionSpeedPercent = 50
                });

                if (!zeroResult.Success)
                {
                    _bendingLog.LogError(jobId, "Rotation", $"Sıfırlama hatası: {zeroResult.ErrorMessage}");
                    await StopMachineAndFailJob(mediator, dataApi, jobId, $"Sıfırlama hatası: {zeroResult.ErrorMessage}");
                    return;
                }
                _bendingLog.LogRotation(jobId, "Parça sıfırlandı");

                // ============================================================
                // ADIM 3: BÜKÜM (Geometric Bending)
                // ============================================================
                progressService.Update(jobId, 0, 0, "Büküm başlıyor...");
                _logger.LogInformation("BendingJob #{Id} ADIM 3: Büküm başlatılıyor", jobId);

                var bendResult = await mediator.Send(new ExecuteGeometricBendingCommand
                {
                    JobId = jobId,
                    TargetPositionMm = job.CalculatedPistonPositionMm!.Value,
                    PartLengthMm = job.PartLengthMm,
                    SafetyMarginMm = job.SafetyMarginMm,
                    StepDistanceMm = job.StepDistanceMm,
                    FirstStepDistanceMm = job.FirstStepDistanceMm,
                    ActiveSensorSide = job.ActiveSensorSide,
                    PistonSpeedPercent = job.PistonSpeedPercent,
                    RotationSpeedPercent = job.RotationSpeedPercent,
                    SlackDistanceMm = job.SlackDistanceMm,
                    SlackPressureBar = job.SlackPressureBar
                });

                if (!bendResult.Success)
                {
                    _bendingLog.LogError(jobId, "General", $"Büküm hatası: {bendResult.ErrorMessage}");
                    await StopMachineAndFailJob(mediator, dataApi, jobId, $"Büküm hatası: {bendResult.ErrorMessage}", bendResult.CompletedPasos);
                    return;
                }
                _bendingLog.Log(jobId, "General", $"Büküm tamamlandı: {bendResult.CompletedPasos} paso");
                _logger.LogInformation("BendingJob #{Id} ADIM 3 tamamlandı: {Pasos} paso", jobId, bendResult.CompletedPasos);

                // ============================================================
                // ADIM 4: GERİ ESNEME ÖLÇÜM + DÜZELTME (Auto-Correct)
                // ============================================================
                progressService.Update(jobId, bendResult.CompletedPasos, bendResult.CompletedPasos, "Geri esneme düzeltmesi başlıyor...");
                _logger.LogInformation("BendingJob #{Id} ADIM 4: Geri esneme auto-correct", jobId);

                // DataApi'den SLPIS sensör parametrelerini oku
                var slpisSettings = await dataApi.GetMachineSettingsAsync();

                // Büküm sonunda parçanın hangi tarafta kaldığını rotasyon pozisyonundan belirle
                // farPosition'ın yarısından büyükse sağda, küçükse solda
                var stateAfterBend = await orchestrator.GetStateAsync();
                double rotPosMm = stateAfterBend.Rotation.PositionMm;
                int farPos = (int)(job.PartLengthMm - (job.SafetyMarginMm * 2));
                string partSideAfterBend = rotPosMm > (farPos / 2.0) ? "right" : "left";
                _logger.LogInformation("BendingJob #{Id} Büküm sonrası parça tarafı: {Side} (rotasyon: {Rot:F0}mm, orta: {Mid}mm)",
                    jobId, partSideAfterBend, rotPosMm, farPos / 2.0);

                // SLPIS sensörü SAĞ vals topunda — ölçüm her zaman sağda yapılmalı.
                // Parça sol tarafta kaldıysa: Right geri çek → rotasyon sağa → Right eşitle
                if (partSideAfterBend == "left")
                {
                    double finalTargetPos = job.CalculatedPistonPositionMm!.Value;
                    int pistonSpeed = job.PistonSpeedPercent;
                    int rotSpeed = job.RotationSpeedPercent;
                    const int pistonTimeoutMs = 60000;

                    _logger.LogInformation("BendingJob #{Id} Parça solda — SLPIS öncesi: Right geri → rotasyon {RotTarget}mm → Right eşitle {Eq:F2}mm", jobId, farPos, finalTargetPos);
                    _bendingLog.LogRotation(jobId, $"SLPIS öncesi: Right safe backward → rotasyon → Right eşitle ({finalTargetPos:F2}mm)");

                    // 1) Right → safe backward limit (en geri)
                    double rightSafeLimit = orchestrator.GetSafeBackwardLimit(PistonId.Right);
                    _logger.LogInformation("  Right → {Limit:F2}mm (safe backward)", rightSafeLimit);
                    var rightBackRes = await orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Right, rightSafeLimit, pistonSpeed);
                    if (!rightBackRes.Success)
                    {
                        await StopMachineAndFailJob(mediator, dataApi, jobId, $"SLPIS öncesi Right geri çekme hatası: {rightBackRes.Message}");
                        return;
                    }
                    var rightBackWait = await orchestrator.WaitForPistonInPositionAsync(PistonId.Right, CancellationToken.None, pistonTimeoutMs);
                    if (!rightBackWait.Success)
                    {
                        await StopMachineAndFailJob(mediator, dataApi, jobId, "SLPIS öncesi Right safe backward'a ulaşamadı");
                        return;
                    }

                    // 2) Rotasyon → farPos (sağa)
                    _logger.LogInformation("  Rotasyon → {Target}mm", farPos);
                    var rotRes = await orchestrator.ExecuteRotationMoveToPositionAsync(farPos, rotSpeed);
                    if (!rotRes.Success)
                    {
                        await StopMachineAndFailJob(mediator, dataApi, jobId, $"SLPIS öncesi rotasyon hatası: {rotRes.Message}");
                        return;
                    }

                    var rotWaitStart = DateTime.UtcNow;
                    while (true)
                    {
                        var st = await orchestrator.GetStateAsync();
                        if (st.Rotation.InPosition && st.Rotation.ActiveDirection == 0)
                        {
                            _logger.LogInformation("  Rotasyon tamamlandı: {Rot:F2}mm", st.Rotation.PositionMm);
                            break;
                        }
                        if ((DateTime.UtcNow - rotWaitStart).TotalSeconds > 180)
                        {
                            await StopMachineAndFailJob(mediator, dataApi, jobId, "SLPIS öncesi rotasyon zaman aşımı (180s)");
                            return;
                        }
                        await Task.Delay(100);
                    }

                    // 3) Right → targetPosition (Left ile eşitle)
                    _logger.LogInformation("  Right → {Target:F2}mm (Left ile eşitle)", finalTargetPos);
                    var rightEqRes = await orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Right, finalTargetPos, pistonSpeed);
                    if (!rightEqRes.Success)
                    {
                        await StopMachineAndFailJob(mediator, dataApi, jobId, $"SLPIS öncesi Right eşitleme hatası: {rightEqRes.Message}");
                        return;
                    }
                    var rightEqWait = await orchestrator.WaitForPistonInPositionAsync(PistonId.Right, CancellationToken.None, pistonTimeoutMs);
                    if (!rightEqWait.Success)
                    {
                        await StopMachineAndFailJob(mediator, dataApi, jobId, "SLPIS öncesi Right eşitleme hedefine ulaşamadı");
                        return;
                    }

                    _bendingLog.LogRotation(jobId, $"SLPIS öncesi tamamlandı: parça sağa alındı, Right=Left={finalTargetPos:F2}mm");
                    partSideAfterBend = "right";
                }

                var autoCorrectResult = await mediator.Send(new SpringbackAutoCorrectCommand
                {
                    JobId = jobId,
                    TargetDiameterMm = job.TargetDiameterMm,
                    PartSide = partSideAfterBend,
                    PartLengthMm = job.PartLengthMm,
                    SafetyMarginMm = job.SafetyMarginMm,
                    SlackPressureBar = job.SlackPressureBar,
                    SlackDistanceMm = job.SlackDistanceMm,
                    ClampPressureBar = job.ClampPressureBar,
                    MaxIterations = 20,
                    ToleranceMm = job.ToleranceMm,
                    MovementSpeedPercent = job.PistonSpeedPercent,
                    RotationSpeedPercent = job.RotationSpeedPercent,
                    PartWidthMm = job.ProfileB,
                    SlpisZeroOffsetMm = slpisSettings?.SlpisZeroOffsetMm ?? 0,
                    SlpisLMm = slpisSettings?.SlpisLMm ?? 70.0,
                    SlpisRulmanCapMm = slpisSettings?.SlpisRulmanCapMm ?? 35.0,
                    MachineParams = new AutoCorrectMachineParams
                    {
                        BallDiameterMm = job.BallDiameterMm,
                        ThicknessMm = job.ProfileA,
                        CenterDistanceMm = job.CenterDistanceMm,
                        ThetaDeg = job.ThetaDeg,
                        XA1 = job.XA1,
                        YA1 = job.YA1
                    }
                });

                // ============================================================
                // SONUÇ: DataApi GÜNCELLE (partial PATCH)
                // ============================================================
                progressCts.Cancel();
                try { await progressTask; } catch { /* ignore */ }

                var completedAt = DateTime.UtcNow;
                var durationSeconds = (completedAt - job.StartedAt!.Value).TotalSeconds;

                var finalUpdate = new BendingJobUpdate
                {
                    CompletedAt = completedAt,
                    DurationSeconds = durationSeconds,
                    CompletedPasos = bendResult.CompletedPasos,
                    TotalPasos = bendResult.TotalPasos,
                    Status = BendingJobStatus.Completed
                };

                if (autoCorrectResult.Success)
                {
                    _bendingLog.LogSpringback(jobId, $"Auto-correct tamamlandı: {autoCorrectResult.FinalMeasuredDiameterMm:F1}mm",
                        autoCorrectResult.FinalMeasuredDiameterMm, job.TargetDiameterMm);
                    finalUpdate.MeasuredDiameterMm = autoCorrectResult.FinalMeasuredDiameterMm;
                    _logger.LogInformation("BendingJob #{Id} TAMAMLANDI: Büküm {Pasos} paso, Ölçülen çap: {Diameter:F1}mm, Süre: {Duration:F1}sn",
                        jobId, bendResult.CompletedPasos, autoCorrectResult.FinalMeasuredDiameterMm, durationSeconds);
                }
                else
                {
                    // Büküm başarılı ama geri esneme düzeltmesi başarısız
                    // Yine de completed olarak işaretle, hata mesajını kaydet
                    finalUpdate.ErrorMessage = $"Geri esneme düzeltmesi: {autoCorrectResult.Error}";
                    _logger.LogWarning("BendingJob #{Id} büküm OK ama auto-correct başarısız: {Error}",
                        jobId, autoCorrectResult.Error);
                }

                await dataApi.UpdateBendingJobAsync(jobId, finalUpdate);
            }
            catch (Exception ex)
            {
                progressCts.Cancel();
                try { await progressTask; } catch { /* ignore */ }

                // Makineyi durdur, sonra DB güncelle
                await StopMachineAndFailJob(mediator, dataApi, jobId, ex.Message);
                _logger.LogError(ex, "BendingJob #{Id} HATA", jobId);
            }
        });

        return Ok(new { Success = true, Message = $"Job #{id} başlatıldı", JobId = id });
    }

    // ============================================================
    // 3. BÜKÜM DURDUR
    // ============================================================

    /// <summary>
    /// Çalışan büküm işini durdur
    /// </summary>
    [HttpPost("{id}/stop")]
    public async Task<IActionResult> StopJob(int id)
    {
        var job = await _dataApi.GetBendingJobAsync(id);
        if (job == null)
            return NotFound(new { Success = false, Error = $"Job #{id} bulunamadı" });

        if (job.Status != BendingJobStatus.Running)
            return BadRequest(new { Success = false, Error = $"Job #{id} çalışmıyor. Durum: {job.Status}" });

        // Mevcut stop mekanizmasını kullan
        var stopped = await _mediator.Send(new StopBendingCommand());

        var completedAt = DateTime.UtcNow;
        var update = new BendingJobUpdate
        {
            Status = BendingJobStatus.Cancelled,
            CompletedAt = completedAt,
            ErrorMessage = "Kullanıcı tarafından durduruldu"
        };
        if (job.StartedAt != null)
            update.DurationSeconds = (completedAt - job.StartedAt.Value).TotalSeconds;

        await _dataApi.UpdateBendingJobAsync(id, update);

        _logger.LogWarning("BendingJob #{Id} DURDURULDU", id);

        return Ok(new { Success = true, Message = $"Job #{id} durduruldu" });
    }

    // ============================================================
    // 4. BÜKÜM LOGLARI
    // ============================================================

    /// <summary>
    /// Büküm loglarını getir — piston, rotasyon, valf, sıkıştırma, geri esneme vs.
    /// </summary>
    [HttpGet("{id}/logs")]
    public async Task<IActionResult> GetJobLogs(
        int id,
        [FromQuery] string? category = null,
        [FromQuery] bool? errorsOnly = null,
        [FromQuery] int limit = 500)
    {
        var job = await _dataApi.GetBendingJobAsync(id);
        if (job == null)
            return NotFound(new { Success = false, Error = $"Job #{id} bulunamadı" });

        var logs = await _dataApi.QueryBendingLogsAsync(id, category, errorsOnly, limit);

        var projected = logs.Select(l => new
        {
            l.Id,
            l.Timestamp,
            l.Category,
            l.Message,
            l.Value1,
            l.Value2,
            l.Value3,
            l.ValueLabels,
            l.IsError
        }).ToList();

        return Ok(new { JobId = id, Count = projected.Count, Logs = projected });
    }

    // ============================================================
    // 5. KAYIT SORGULA
    // ============================================================

    /// <summary>
    /// Büküm kaydını getir (durum, parametreler, sonuç dahil)
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetJob(int id)
    {
        var job = await _dataApi.GetBendingJobAsync(id);
        if (job == null)
            return NotFound(new { Success = false, Error = $"Job #{id} bulunamadı" });

        return Ok(MapToDto(job));
    }

    // ============================================================
    // 5. LİSTE
    // ============================================================

    /// <summary>
    /// Büküm kayıtlarını listele (en yeniden en eskiye)
    /// </summary>
    /// <param name="status">Filtre: 0=Created, 2=Ready, 3=Running, 4=Completed, 5=Failed, 6=Cancelled</param>
    /// <param name="limit">Kaç kayıt (varsayılan: 50)</param>
    [HttpGet]
    public async Task<IActionResult> ListJobs([FromQuery] BendingJobStatus? status = null, [FromQuery] int limit = 50)
    {
        var jobs = await _dataApi.ListBendingJobsAsync(status, limit);
        return Ok(jobs.Select(MapToDto));
    }

    // ============================================================
    // 6. KAYIT SİL
    // ============================================================

    /// <summary>
    /// Büküm kaydını sil (sadece Running olmayan kayıtlar silinebilir)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteJob(int id)
    {
        var job = await _dataApi.GetBendingJobAsync(id);
        if (job == null)
            return NotFound(new { Success = false, Error = $"Job #{id} bulunamadı" });

        if (job.Status == BendingJobStatus.Running)
            return BadRequest(new { Success = false, Error = "Çalışan iş silinemez. Önce durdurun." });

        await _dataApi.DeleteBendingJobAsync(id);
        _logger.LogInformation("BendingJob #{Id} silindi", id);

        return Ok(new { Success = true, Message = $"Job #{id} silindi" });
    }

    // ============================================================
    // DTO MAPPING
    // ============================================================

    private static BendingJobDto MapToDto(BendingJob job) => new()
    {
        Id = job.Id,
        Status = job.Status.ToString(),
        StatusCode = (int)job.Status,
        CreatedAt = job.CreatedAt,
        StartedAt = job.StartedAt,
        CompletedAt = job.CompletedAt,
        DurationSeconds = job.DurationSeconds,

        // Profil
        ProfileType = job.ProfileType.ToString(),
        Direction = job.Direction.ToString(),
        Method = job.Method.ToString(),
        ProfileA = job.ProfileA,
        ProfileB = job.ProfileB,
        ProfileS = job.ProfileS,
        TargetDiameterMm = job.TargetDiameterMm,
        ProfileH = job.ProfileH,
        ProfileG = job.ProfileG,

        // Parça
        PartLengthMm = job.PartLengthMm,
        StepDistanceMm = job.StepDistanceMm,
        ActiveSensorSide = job.ActiveSensorSide,
        ValsCode = job.ValsCode,
        ToleranceMm = job.ToleranceMm,

        // Hesaplanan
        CalculatedPistonPositionMm = job.CalculatedPistonPositionMm,
        TotalPasos = job.TotalPasos,
        CompletedPasos = job.CompletedPasos,
        CurrentPaso = job.CurrentPaso,

        // Sonuçlar
        MeasuredDiameterMm = job.MeasuredDiameterMm,
        FinalLeftPositionMm = job.FinalLeftPositionMm,
        FinalRightPositionMm = job.FinalRightPositionMm,

        // Hata
        ErrorMessage = job.ErrorMessage,
        FailedAtPaso = job.FailedAtPaso,

        // Kullanıcı
        OperatorName = job.OperatorName,
        Notes = job.Notes
    };

    /// <summary>
    /// Pipeline adımlarında hata olunca ÖNCe makineyi durdur, SONRA DataApi'yi güncelle
    /// </summary>
    private async Task StopMachineAndFailJob(ISender mediator, IDataApiClient dataApi, int jobId, string error, int completedPasos = 0)
    {
        // 1. ÖNCELİKLE makineyi durdur (springback + pistonlar + rotasyon)
        try
        {
            _logger.LogWarning("BendingJob #{Id} hata — makine durduruluyor...", jobId);
            await mediator.Send(new StopBendingCommand());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BendingJob #{Id} makine durdurma sırasında hata", jobId);
        }

        // 2. DataApi guncelle (StartedAt'i okumak icin onceden cek — Duration icin)
        await FailJob(dataApi, jobId, error, completedPasos);
    }

    /// <summary>
    /// Pipeline adımlarında hata olunca DataApi'yi güncelle (makine durdurma YOK)
    /// </summary>
    private async Task FailJob(IDataApiClient dataApi, int jobId, string error, int completedPasos = 0)
    {
        var existing = await dataApi.GetBendingJobAsync(jobId);
        if (existing != null)
        {
            var completedAt = DateTime.UtcNow;
            var update = new BendingJobUpdate
            {
                Status = BendingJobStatus.Failed,
                ErrorMessage = error,
                CompletedPasos = completedPasos,
                CompletedAt = completedAt
            };
            if (existing.StartedAt != null)
                update.DurationSeconds = (completedAt - existing.StartedAt.Value).TotalSeconds;

            await dataApi.UpdateBendingJobAsync(jobId, update);
        }
        _logger.LogWarning("BendingJob #{Id} BAŞARISIZ: {Error}", jobId, error);
    }
}

// ============================================================
// REQUEST / RESPONSE DTO'LAR
// ============================================================

/// <summary>
/// Büküm kaydı oluşturma isteği
/// Electron UI bu formatı gönderir
/// </summary>
/// <summary>
/// Büküm kaydı oluşturma isteği — UI sadece profil bilgisi ve parça ölçüleri gönderir.
/// Makine parametreleri (hız, tolerans, sensör tarafı, vals kodu vs.) DB ayarlarından otomatik okunur.
/// </summary>
public class CreateBendingJobRequest
{
    // --- Profil Seçimi (ŞEKİL-8, ŞEKİL-9, ŞEKİL-10) ---

    /// <summary>Profil tipi: 0=Square, 1=Rectangular, 2=Round, 3=Angle, 4=Channel, 5=TProfile, 6=IProfile, 7=Flat, 99=Custom</summary>
    public ProfileType ProfileType { get; set; }

    /// <summary>Büküm yönü - SADECE Spiral (serpantin) kıvrımda kullanılır. Diğer metodlarda gönderilmez.</summary>
    public BendingDirection? Direction { get; set; }

    /// <summary>Büküm metodu: 0=FullCircle, 1=Arc (yay), 2=Spiral, 3=Sivama</summary>
    public BendingMethod Method { get; set; } = BendingMethod.FullCircle;

    // --- Profil Ölçüleri (ŞEKİL-11) ---

    /// <summary>A: Profil yüksekliği (mm) - ZORUNLU</summary>
    public double ProfileA { get; set; }

    /// <summary>B: Profil genişliği (mm) - ZORUNLU</summary>
    public double ProfileB { get; set; }

    /// <summary>S: Et kalınlığı (mm) - ZORUNLU</summary>
    public double ProfileS { get; set; }

    /// <summary>R: Hedef büküm çapı Ø (mm) - ZORUNLU</summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>H: Opsiyonel parametre (mm)</summary>
    public double? ProfileH { get; set; }

    /// <summary>G: Opsiyonel parametre (mm)</summary>
    public double? ProfileG { get; set; }

    // --- Parça ---

    /// <summary>Parça uzunluğu (mm) - ZORUNLU</summary>
    public double PartLengthMm { get; set; }

    /// <summary>Paso adım mesafesi (mm) - ZORUNLU, operatör belirler</summary>
    public double StepDistanceMm { get; set; } = 30;

    /// <summary>İlk paso mesafesi (mm) - opsiyonel, profil mukavemetini kırmak için</summary>
    public double? FirstStepDistanceMm { get; set; }

    /// <summary>Boşluk alma mesafesi (mm) - opsiyonel</summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>Parça sıkıştırma basıncı (bar) - opsiyonel, override. Null ise DB default (DefaultClampPressureBar) kullanılır.</summary>
    public int? ClampPressureBar { get; set; }

    // --- Kullanıcı Bilgisi ---

    /// <summary>Operatör adı - opsiyonel</summary>
    public string? OperatorName { get; set; }

    /// <summary>Notlar - opsiyonel</summary>
    public string? Notes { get; set; }
}

// Aşağıdaki parametreler UI'dan GELMEZ, DB ayarlarından (MachineSettings) otomatik okunur:
// - activeSensorSide      → settings.DefaultActiveSensorSide
// - valsCode              → settings.DefaultValsCode
// - pistonSpeedPercent    → settings.DefaultPistonSpeedPercent
// - rotationSpeedPercent  → settings.DefaultRotationSpeedPercent
// - toleranceMm           → settings.DefaultToleranceMm
// - safetyMarginMm        → settings.DefaultSafetyMarginMm
// - slackPressureBar      → settings.DefaultSlackPressureBar
// - ballDiameterMm        → settings.DefaultBallDiameterMm
// - centerDistanceMm      → settings.DefaultCenterDistanceMm
// - thetaDeg              → settings.DefaultThetaDeg
// - xA1                   → settings.DefaultXA1
// - yA1                   → settings.DefaultYA1

/// <summary>
/// Büküm kaydı yanıtı - tüm bilgileri içerir
/// </summary>
public class BendingJobDto
{
    public int Id { get; set; }
    public string Status { get; set; } = "";
    public int StatusCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double? DurationSeconds { get; set; }

    // Profil
    public string ProfileType { get; set; } = "";
    public string Direction { get; set; } = "";
    public string Method { get; set; } = "";
    public double ProfileA { get; set; }
    public double ProfileB { get; set; }
    public double ProfileS { get; set; }
    public double TargetDiameterMm { get; set; }
    public double? ProfileH { get; set; }
    public double? ProfileG { get; set; }

    // Parça
    public double PartLengthMm { get; set; }
    public double StepDistanceMm { get; set; }
    public string ActiveSensorSide { get; set; } = "";
    public string? ValsCode { get; set; }
    public double ToleranceMm { get; set; }

    // Hesaplanan
    public double? CalculatedPistonPositionMm { get; set; }
    public int TotalPasos { get; set; }
    public int CompletedPasos { get; set; }
    public int? CurrentPaso { get; set; }

    // Sonuçlar
    public double? MeasuredDiameterMm { get; set; }
    public double? FinalLeftPositionMm { get; set; }
    public double? FinalRightPositionMm { get; set; }

    // Hata
    public string? ErrorMessage { get; set; }
    public int? FailedAtPaso { get; set; }

    // Kullanıcı
    public string? OperatorName { get; set; }
    public string? Notes { get; set; }
}
