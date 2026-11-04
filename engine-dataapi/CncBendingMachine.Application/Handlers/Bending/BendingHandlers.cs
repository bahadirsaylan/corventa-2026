using CncBendingMachine.Application.Commands.Bending;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using MediatR;
using Microsoft.Extensions.Logging;

// NOT: BendingProgressService sadece raporlama amaçlıdır.
// Büküm algoritmasını ETKİLEMEZ — belleğe yazar, SignalR/REST okur.

namespace CncBendingMachine.Application.Handlers.Bending;

/// <summary>
/// Handler for CalculateBendingCommand
/// </summary>
public class CalculateBendingHandler : IRequestHandler<CalculateBendingCommand, BendingCalculationResult>
{
    private readonly IBendingCalculator _calculator;

    public CalculateBendingHandler(IBendingCalculator calculator)
    {
        _calculator = calculator;
    }

    public Task<BendingCalculationResult> Handle(CalculateBendingCommand request, CancellationToken cancellationToken)
    {
        var input = request.ToInput();
        var result = _calculator.Calculate(input);
        return Task.FromResult(result);
    }
}

/// <summary>
/// Handler for CalculateDiameterFromPositionCommand
/// </summary>
public class CalculateDiameterFromPositionHandler : IRequestHandler<CalculateDiameterFromPositionCommand, double?>
{
    private readonly IBendingCalculator _calculator;

    public CalculateDiameterFromPositionHandler(IBendingCalculator calculator)
    {
        _calculator = calculator;
    }

    public Task<double?> Handle(CalculateDiameterFromPositionCommand request, CancellationToken cancellationToken)
    {
        var baseInput = request.ToBaseInput();
        var result = _calculator.CalculateDiameterFromPosition(request.PistonPosition, baseInput);
        return Task.FromResult(result);
    }
}

// ============================================================
// GEOMETRIC BENDING HANDLERS
// ============================================================

/// <summary>
/// Handler for PreviewGeometricBendingCommand
/// Generates paso steps without executing them
/// </summary>
public class PreviewGeometricBendingHandler : IRequestHandler<PreviewGeometricBendingCommand, GeometricBendingResult>
{
    private readonly IBendingCalculator _calculator;
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<PreviewGeometricBendingHandler> _logger;

    public PreviewGeometricBendingHandler(
        IBendingCalculator calculator,
        IMachineOrchestrator orchestrator,
        ILogger<PreviewGeometricBendingHandler> logger)
    {
        _calculator = calculator;
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public Task<GeometricBendingResult> Handle(PreviewGeometricBendingCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Previewing geometric bending: Target={Target}mm, PartLength={Length}mm, Step={Step}mm",
            request.TargetPositionMm, request.PartLengthMm, request.StepDistanceMm);

        // Get safe backward limits from orchestrator
        double leftSafeBackward = _orchestrator.GetSafeBackwardLimit(PistonId.Left);
        double rightSafeBackward = _orchestrator.GetSafeBackwardLimit(PistonId.Right);

        var pasoParams = new PasoGenerationParams
        {
            TargetPositionMm = request.TargetPositionMm,
            PartLengthMm = request.PartLengthMm,
            SafetyMarginMm = request.SafetyMarginMm,
            StepDistanceMm = request.StepDistanceMm,
            FirstStepDistanceMm = request.FirstStepDistanceMm,
            StartingSide = request.ActiveSensorSide,
            LeftSafeBackwardMm = leftSafeBackward,
            RightSafeBackwardMm = rightSafeBackward
        };

        var pasoSteps = _calculator.GeneratePasoSteps(pasoParams);

        _logger.LogInformation("Generated {Count} paso steps for preview (FirstStep={FirstStep}mm)",
            pasoSteps.Count, request.FirstStepDistanceMm ?? request.StepDistanceMm);

        foreach (var paso in pasoSteps)
        {
            _logger.LogDebug(paso.GetDescription());
        }

        var result = new GeometricBendingResult
        {
            Success = true,
            TotalPasos = pasoSteps.Count,
            CompletedPasos = 0,
            PasoSteps = pasoSteps
        };

        return Task.FromResult(result);
    }
}

/// <summary>
/// Handler for ExecuteGeometricBendingCommand
/// Executes all paso steps sequentially
/// </summary>
public class ExecuteGeometricBendingHandler : IRequestHandler<ExecuteGeometricBendingCommand, GeometricBendingResult>
{
    private readonly IBendingCalculator _calculator;
    private readonly IMachineOrchestrator _orchestrator;
    private readonly BendingProgressService _progress;
    private readonly ILogger<ExecuteGeometricBendingHandler> _logger;

    // Cancellation support for stopping mid-bending
    private static CancellationTokenSource? _bendingCts;
    public static CancellationTokenSource? BendingCancellationSource => _bendingCts;

    private const int PollingIntervalMs = 10;  // 10ms polling interval for faster response
    private const int MaxPistonWaitMs = 60000;  // 60 seconds max for piston movement
    private const int MaxRotationWaitMs = 180000;  // 180 seconds max for rotation
    private const int SlackSpeedPercent = 30;  // 3V sabit hız (30% = 3V / 10V)
    private const int StartupPressureIgnoreMs = 50;  // C# polling delay (PLC has 200ms internal delay)
    private const int PressureTolerance = 1;  // Bar tolerance for pressure check

    // Adaptive first paso parameters
    private const int AdaptiveJogSpeedPercent = 20;  // %20 hız = 2V (10V max)
    private const double EncoderStopTolerance = 0.1;  // 0.1mm encoder değişim toleransı
    private const double PistonCheckDistanceMm = 10.0;  // Son 10mm piston hareketi kontrol

    private readonly BendingLogService _log;

    public ExecuteGeometricBendingHandler(
        IBendingCalculator calculator,
        IMachineOrchestrator orchestrator,
        BendingProgressService progress,
        BendingLogService log,
        ILogger<ExecuteGeometricBendingHandler> logger)
    {
        _calculator = calculator;
        _orchestrator = orchestrator;
        _progress = progress;
        _log = log;
        _logger = logger;
    }

    public async Task<GeometricBendingResult> Handle(ExecuteGeometricBendingCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting geometric bending: Target={Target}mm, PartLength={Length}mm, Step={Step}mm",
            request.TargetPositionMm, request.PartLengthMm, request.StepDistanceMm);

        // Create linked cancellation token
        _bendingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var linkedToken = _bendingCts.Token;

        try
        {
            // Validate prerequisites
            var state = await _orchestrator.GetStateAsync();

            if (!_orchestrator.PhysicalState.IsGonyeCompleted)
            {
                return GeometricBendingResult.Fail("Önce Gönye işlemi yapılmalı!");
            }

            if (state.HydraulicMotorState != 2)  // 2 = Ready
            {
                return GeometricBendingResult.Fail("Hidrolik motor hazır değil!");
            }

            // Get safe backward limits
            double leftSafeBackward = _orchestrator.GetSafeBackwardLimit(PistonId.Left);
            double rightSafeBackward = _orchestrator.GetSafeBackwardLimit(PistonId.Right);

            _logger.LogInformation("Safe backward limits: Left={Left}mm, Right={Right}mm", leftSafeBackward, rightSafeBackward);

            // Generate paso steps
            var pasoParams = new PasoGenerationParams
            {
                TargetPositionMm = request.TargetPositionMm,
                PartLengthMm = request.PartLengthMm,
                SafetyMarginMm = request.SafetyMarginMm,
                StepDistanceMm = request.StepDistanceMm,
                FirstStepDistanceMm = request.FirstStepDistanceMm,
                StartingSide = request.ActiveSensorSide,
                LeftSafeBackwardMm = leftSafeBackward,
                RightSafeBackwardMm = rightSafeBackward
            };

            var pasoSteps = _calculator.GeneratePasoSteps(pasoParams);

            _logger.LogInformation("Generated {Count} paso steps (FirstStep={FirstStep}mm)",
                pasoSteps.Count, request.FirstStepDistanceMm ?? request.StepDistanceMm);

            // Absolute rotation targets (fixed positions)
            int homePosition = 0;  // Sol taraf
            int farPosition = (int)(request.PartLengthMm - (request.SafetyMarginMm * 2));  // Sağ taraf

            _logger.LogInformation("Absolute rotation targets: Home={Home}mm, Far={Far}mm", homePosition, farPosition);

            // Execute each paso
            int completedPasos = 0;
            int totalPasos = pasoSteps.Count + 2; // +1 repeat paso, +1 üçgen destek
            _progress.Update(request.JobId, 0, totalPasos, "Büküm başlıyor...");
            _log.Log(request.JobId, "General", $"Büküm başlıyor: {totalPasos} paso, hedef={request.TargetPositionMm}mm, step={request.StepDistanceMm}mm");

            // Track actual positions after each paso (for dynamic target calculation)
            double lastLeftPosition = 0;
            double lastRightPosition = 0;
            string lastExecutedActiveSide = "Left"; // Track last EXECUTED paso's side

            // Contact offset - detected in first paso (encoder stop position = bending start point)
            double contactOffset = 0;
            double effectiveTargetPosition = request.TargetPositionMm; // Will be updated after first paso

            foreach (var paso in pasoSteps)
            {
                linkedToken.ThrowIfCancellationRequested();

                _logger.LogInformation("=== Executing {Description} ===", paso.GetDescription());

                // Step 1: Move pistons
                // First paso uses ADAPTIVE method (encoder-based stop detection)
                // Other pasos use NORMAL method (position-based)
                if (paso.PasoNumber == 1)
                {
                    // ADAPTIVE FIRST PASO
                    var adaptiveResult = await ExecuteAdaptiveFirstPasoMovementAsync(
                        paso, request.TargetPositionMm, request.StepDistanceMm,
                        request.SlackDistanceMm, request.SlackPressureBar, linkedToken);

                    if (!adaptiveResult.Success)
                    {
                        return GeometricBendingResult.Fail($"Adaptive paso 1 hatası: {adaptiveResult.Error}", completedPasos);
                    }

                    // Hedef ABSOLUTE piston pozisyonu — contact offset EKLENMEZ.
                    // Piston temastan (contactOffset) hedefe kadar step-by-step gider, hedefi asla asmaz.
                    // Encoder donmeye devam etse bile hedef pozisyonunda durulur.
                    contactOffset = adaptiveResult.ContactOffset;
                    effectiveTargetPosition = request.TargetPositionMm;

                    _logger.LogInformation("🎯 TEMAS OFSETİ TESPİT EDİLDİ: {Offset:F2}mm", contactOffset);
                    _logger.LogInformation("🎯 ABSOLUTE HEDEF: {Target:F2}mm (temas-hedef arasi {Diff:F2}mm adim adim bukulecek)",
                        effectiveTargetPosition, effectiveTargetPosition - contactOffset);

                    linkedToken.ThrowIfCancellationRequested();

                    // Step 2: Execute rotation
                    int rotationTarget = paso.ActiveSide == "Left" ? farPosition : homePosition;
                    var rotationResult = await ExecuteAbsoluteRotationAsync(rotationTarget, request.RotationSpeedPercent, linkedToken);
                    if (!rotationResult.Success)
                    {
                        return GeometricBendingResult.Fail($"Paso 1 rotasyon hatası: {rotationResult.Error}", completedPasos);
                    }

                    completedPasos++;
                    _progress.Update(request.JobId, completedPasos, totalPasos, $"Paso 1 tamamlandı (adaptif temas)");
                    _log.LogPiston(request.JobId, $"Paso 1 tamamlandı (temas ofseti: {contactOffset:F2}mm)", contactOffset);
                    lastExecutedActiveSide = paso.ActiveSide;
                    _logger.LogInformation("Paso 1 completed ({Completed}/{Total})", completedPasos, pasoSteps.Count);

                    // CRITICAL: Read and store actual positions after adaptive paso 1
                    var stateAfterPaso1 = await _orchestrator.GetStateAsync();
                    lastLeftPosition = stateAfterPaso1.LeftPiston.PositionMm;
                    lastRightPosition = stateAfterPaso1.RightPiston.PositionMm;

                    _logger.LogInformation("Paso 1 sonrası gerçek pozisyonlar: Left={Left:F2}mm, Right={Right:F2}mm",
                        lastLeftPosition, lastRightPosition);

                    PistonId activePiston = paso.ActiveSide == "Left" ? PistonId.Left : PistonId.Right;
                    double actualPosition = activePiston == PistonId.Left ? lastLeftPosition : lastRightPosition;

                    // Check against EFFECTIVE target (user target + contact offset)
                    if (actualPosition >= effectiveTargetPosition - 0.5)
                    {
                        _logger.LogInformation("✅ İLK PASO EFEKTİF HEDEFE ULAŞTI! ({Pos:F2}mm >= {Target:F2}mm)",
                            actualPosition, effectiveTargetPosition);
                        _logger.LogInformation("Sadece REPEAT paso (simetri) yapılacak, diğer paso'lar atlanıyor.");

                        // Execute only REPEAT paso for symmetry
                        // If first paso was Left active (rotation went to farPosition/right),
                        // repeat paso uses Right piston and rotation must return to homePosition/left
                        PistonId otherPiston = paso.ActiveSide == "Left" ? PistonId.Right : PistonId.Left;
                        int repeatRotationTarget = paso.ActiveSide == "Left" ? homePosition : farPosition;

                        var repeatResult = await ExecuteRepeatPasoWithTriangleSupportAsync(
                            activePiston: otherPiston,
                            passivePiston: activePiston,
                            targetPosition: effectiveTargetPosition,
                            rotationTarget: repeatRotationTarget,
                            slackDistanceMm: request.SlackDistanceMm,
                            slackPressureBar: request.SlackPressureBar,
                            speedPercent: request.PistonSpeedPercent,
                            rotationSpeedPercent: request.RotationSpeedPercent,
                            linkedToken);

                        if (!repeatResult.Success)
                        {
                            return GeometricBendingResult.Fail($"Repeat paso hatası: {repeatResult.Error}", completedPasos);
                        }

                        completedPasos += 2; // repeat + triangle support
                        _progress.Update(request.JobId, completedPasos, completedPasos, "Büküm tamamlandı!");
                        _log.Log(request.JobId, "General", $"Geometrik büküm tamamlandı: {completedPasos} paso");
                        _logger.LogInformation("GEOMETRİK BÜKÜM TAMAMLANDI! ({Total} paso)", completedPasos);
                        _progress.Clear(request.JobId);
                        return GeometricBendingResult.Ok(pasoSteps.Take(2).ToList());
                    }

                    _logger.LogInformation("İlk paso henüz efektif hedefe ulaşmadı ({Pos:F2}mm < {Target:F2}mm), normal paso'lara devam ediliyor...",
                        actualPosition, effectiveTargetPosition);
                    continue; // Skip to next paso in foreach
                }
                else
                {
                    // NORMAL PASO (position-based) - DYNAMIC target calculation based on actual positions
                    PistonId activePiston = paso.ActiveSide == "Left" ? PistonId.Left : PistonId.Right;
                    PistonId passivePiston = paso.ActiveSide == "Left" ? PistonId.Right : PistonId.Left;

                    // Calculate ACTUAL targets based on previous paso's ACTIVE piston position
                    // Since pasos alternate Left-Right-Left-Right, previous active is the OPPOSITE piston
                    // Paso 1: Left active (75.95mm) → Paso 2: Right active, use Left's position (75.95mm)
                    // Paso 2: Right active (95.95mm) → Paso 3: Left active, use Right's position (95.95mm)
                    double previousActivePos = activePiston == PistonId.Left ? lastRightPosition : lastLeftPosition;

                    // Active piston: previous position + step distance (capped at EFFECTIVE target)
                    double dynamicActiveTarget = Math.Min(previousActivePos + request.StepDistanceMm, effectiveTargetPosition);

                    // Pasif piston her zaman safe backward limit'e (güvenlik payı dahil)
                    double dynamicPassiveTarget = _orchestrator.GetSafeBackwardLimit(passivePiston);

                    _logger.LogInformation("Paso {Num} DİNAMİK hedefler: Active({Side})={PrevActive:F2}+{Step}={ActiveTarget:F2}mm (Efektif hedef: {EffTarget:F2}mm), Passive={PassiveTarget:F2}mm",
                        paso.PasoNumber, paso.ActiveSide, previousActivePos, request.StepDistanceMm, dynamicActiveTarget, effectiveTargetPosition, dynamicPassiveTarget);

                    // Execute with dynamic targets
                    var pistonResult = await ExecuteDynamicPasoMovementAsync(
                        activePiston, passivePiston,
                        dynamicActiveTarget, dynamicPassiveTarget,
                        request.PistonSpeedPercent, request.SlackDistanceMm, request.SlackPressureBar, linkedToken);

                    if (!pistonResult.Success)
                    {
                        return GeometricBendingResult.Fail($"Paso {paso.PasoNumber} piston hatası: {pistonResult.Error}", completedPasos);
                    }

                    linkedToken.ThrowIfCancellationRequested();

                    // Step 2: Execute rotation
                    int rotationTarget = paso.ActiveSide == "Left" ? farPosition : homePosition;
                    var rotationResult = await ExecuteAbsoluteRotationAsync(rotationTarget, request.RotationSpeedPercent, linkedToken);
                    if (!rotationResult.Success)
                    {
                        return GeometricBendingResult.Fail($"Paso {paso.PasoNumber} rotasyon hatası: {rotationResult.Error}", completedPasos);
                    }

                    completedPasos++;
                    _progress.Update(request.JobId, completedPasos, totalPasos, $"Paso {paso.PasoNumber} tamamlandı");
                    lastExecutedActiveSide = paso.ActiveSide;

                    // Update actual positions after this paso
                    var stateAfterPaso = await _orchestrator.GetStateAsync();
                    lastLeftPosition = stateAfterPaso.LeftPiston.PositionMm;
                    lastRightPosition = stateAfterPaso.RightPiston.PositionMm;
                    _log.LogPiston(request.JobId, $"Paso {paso.PasoNumber} tamamlandı: L={lastLeftPosition:F2}mm R={lastRightPosition:F2}mm",
                        paso.ActiveSide == "Left" ? lastLeftPosition : lastRightPosition, request.PistonSpeedPercent);

                    _logger.LogInformation("Paso {Number} completed ({Completed}/{Total}) - Actual: Left={Left:F2}mm, Right={Right:F2}mm",
                        paso.PasoNumber, completedPasos, pasoSteps.Count, lastLeftPosition, lastRightPosition);

                    // CHECK: Did we reach effective target?
                    double currentActivePos = paso.ActiveSide == "Left" ? lastLeftPosition : lastRightPosition;
                    if (currentActivePos >= effectiveTargetPosition - 0.5)
                    {
                        _logger.LogInformation("✅ EFEKTİF HEDEFE ULAŞILDI! ({Pos:F2}mm >= {Target:F2}mm)",
                            currentActivePos, effectiveTargetPosition);
                        break; // Exit foreach loop
                    }
                }
            }

            // CONTINUE with dynamic pasos if we haven't reached effective target yet
            // (pre-generated pasos may not be enough after contact offset is applied)
            // CRITICAL: Use last EXECUTED paso's side, NOT last pre-generated step!
            string lastActiveSide = lastExecutedActiveSide;
            double lastActivePos = lastActiveSide == "Left" ? lastLeftPosition : lastRightPosition;
            int dynamicPasoNumber = pasoSteps.Count;

            while (lastActivePos < effectiveTargetPosition - 0.5)
            {
                linkedToken.ThrowIfCancellationRequested();
                dynamicPasoNumber++;

                // Alternate sides
                string currentActiveSide = lastActiveSide == "Left" ? "Right" : "Left";
                PistonId activePiston = currentActiveSide == "Left" ? PistonId.Left : PistonId.Right;
                PistonId passivePiston = currentActiveSide == "Left" ? PistonId.Right : PistonId.Left;

                // Calculate dynamic targets
                double previousActivePos = activePiston == PistonId.Left ? lastRightPosition : lastLeftPosition;
                double dynamicActiveTarget = Math.Min(previousActivePos + request.StepDistanceMm, effectiveTargetPosition);
                // Pasif piston her zaman safe backward limit'e (güvenlik payı dahil)
                double dynamicPassiveTarget = _orchestrator.GetSafeBackwardLimit(passivePiston);

                _logger.LogInformation("=== DİNAMİK PASO {Num}: {Side} aktif ===", dynamicPasoNumber, currentActiveSide);
                _logger.LogInformation("DİNAMİK hedefler: Active({Side})={PrevActive:F2}+{Step}={ActiveTarget:F2}mm, Passive={PassiveTarget:F2}mm",
                    currentActiveSide, previousActivePos, request.StepDistanceMm, dynamicActiveTarget, dynamicPassiveTarget);

                // Execute dynamic paso
                var pistonResult = await ExecuteDynamicPasoMovementAsync(
                    activePiston, passivePiston,
                    dynamicActiveTarget, dynamicPassiveTarget,
                    request.PistonSpeedPercent, request.SlackDistanceMm, request.SlackPressureBar, linkedToken);

                if (!pistonResult.Success)
                {
                    return GeometricBendingResult.Fail($"Dinamik paso {dynamicPasoNumber} piston hatası: {pistonResult.Error}", completedPasos);
                }

                linkedToken.ThrowIfCancellationRequested();

                // Execute rotation
                int rotationTarget = currentActiveSide == "Left" ? farPosition : homePosition;
                var rotationResult = await ExecuteAbsoluteRotationAsync(rotationTarget, request.RotationSpeedPercent, linkedToken);
                if (!rotationResult.Success)
                {
                    return GeometricBendingResult.Fail($"Dinamik paso {dynamicPasoNumber} rotasyon hatası: {rotationResult.Error}", completedPasos);
                }

                completedPasos++;
                totalPasos = Math.Max(totalPasos, completedPasos + 1); // dinamik paso'lar total'i artırabilir
                _progress.Update(request.JobId, completedPasos, totalPasos, $"Dinamik paso {dynamicPasoNumber} tamamlandı");

                // Update positions
                var stateAfterDynamic = await _orchestrator.GetStateAsync();
                lastLeftPosition = stateAfterDynamic.LeftPiston.PositionMm;
                lastRightPosition = stateAfterDynamic.RightPiston.PositionMm;
                lastActiveSide = currentActiveSide;
                lastActivePos = currentActiveSide == "Left" ? lastLeftPosition : lastRightPosition;

                _logger.LogInformation("Dinamik Paso {Number} completed - Actual: Left={Left:F2}mm, Right={Right:F2}mm",
                    dynamicPasoNumber, lastLeftPosition, lastRightPosition);

                // Safety check - max 20 pasos
                if (dynamicPasoNumber > 20)
                {
                    _logger.LogWarning("Maksimum paso sayısına ulaşıldı (20), büküm durduruluyor");
                    break;
                }
            }

            // FINAL REPEAT PASO: Symmetry on the other piston
            // After reaching effective target, do one more paso on the opposite piston
            linkedToken.ThrowIfCancellationRequested();

            string finalActiveSide = lastActiveSide == "Left" ? "Right" : "Left";
            PistonId finalActivePiston = finalActiveSide == "Left" ? PistonId.Left : PistonId.Right;
            PistonId finalPassivePiston = finalActiveSide == "Left" ? PistonId.Right : PistonId.Left;
            int finalRotationTarget = finalActiveSide == "Left" ? farPosition : homePosition;

            _logger.LogInformation("=== FINAL REPEAT PASO (Simetri): {Side} aktif → {Target:F2}mm ===",
                finalActiveSide, effectiveTargetPosition);

            var finalRepeatResult = await ExecuteRepeatPasoWithTriangleSupportAsync(
                activePiston: finalActivePiston,
                passivePiston: finalPassivePiston,
                targetPosition: effectiveTargetPosition,
                rotationTarget: finalRotationTarget,
                slackDistanceMm: request.SlackDistanceMm,
                slackPressureBar: request.SlackPressureBar,
                speedPercent: request.PistonSpeedPercent,
                rotationSpeedPercent: request.RotationSpeedPercent,
                linkedToken);

            if (!finalRepeatResult.Success)
            {
                return GeometricBendingResult.Fail($"Final repeat paso hatası: {finalRepeatResult.Error}", completedPasos);
            }

            completedPasos += 2; // repeat + triangle support
            _progress.Update(request.JobId, completedPasos, completedPasos, "Büküm tamamlandı!");
            _logger.LogInformation("✅ GEOMETRİK BÜKÜM TAMAMLANDI! {Total} paso executed, Efektif hedef: {Target:F2}mm",
                completedPasos, effectiveTargetPosition);

            _progress.Clear(request.JobId);
            return GeometricBendingResult.Ok(pasoSteps);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Geometric bending cancelled");
            _progress.Update(request.JobId, 0, 0, "İptal edildi");
            _progress.Clear(request.JobId);
            await EmergencyStopAllAsync();
            return GeometricBendingResult.Fail("Büküm işlemi iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Geometric bending failed");
            _progress.Update(request.JobId, 0, 0, $"Hata: {ex.Message}");
            _progress.Clear(request.JobId);
            await EmergencyStopAllAsync();
            return GeometricBendingResult.Fail($"Büküm hatası: {ex.Message}");
        }
        finally
        {
            _bendingCts?.Dispose();
            _bendingCts = null;
        }
    }

    /// <summary>
    /// Execute piston movements for a paso (sequential: lower pressure, passive backward, active forward)
    /// </summary>
    private async Task<OrchestratorResult> ExecutePasoMovementAsync(PasoStep paso, int speedPercent, double? slackDistanceMm, int slackPressureBar, CancellationToken ct)
    {
        // Determine which piston is which
        PistonId activePiston = paso.ActiveSide == "Left" ? PistonId.Left : PistonId.Right;
        PistonId passivePiston = paso.ActiveSide == "Left" ? PistonId.Right : PistonId.Left;

        _logger.LogDebug("Moving pistons: Active ({Active})→{ActiveTarget}mm, Passive ({Passive})→{PassiveTarget}mm",
            activePiston, paso.ActivePistonTargetMm, passivePiston, paso.PassivePistonTargetMm);

        // Step 0: Upper piston boşluk alma
        // IMPORTANT: Stop first to reset bAtPressure/bInPosition latch in PLC
        _logger.LogDebug("Stopping upper piston to reset latch...");
        await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
        await Task.Delay(200, ct);  // Wait for PLC to process mode change

        // Mesafe bazlı mı yoksa basınç bazlı mı?
        if (slackDistanceMm.HasValue && slackDistanceMm.Value > 0)
        {
            // MESAFE BAZLI BOŞLUK ALMA
            var upperState = await _orchestrator.GetStateAsync();
            double upperCurrentPos = upperState.UpperPiston.PositionMm;
            double slackTargetPos = upperCurrentPos + slackDistanceMm.Value;

            _logger.LogDebug("Upper piston moving {Distance}mm for gap compensation ({Current}mm → {Target}mm)",
                slackDistanceMm.Value, upperCurrentPos, slackTargetPos);

            var slackMoveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                PistonId.Upper, slackTargetPos, SlackSpeedPercent);
            if (!slackMoveResult.Success)
                return OrchestratorResult.Fail($"Üst piston boşluk alma hatası: {slackMoveResult.Message}");

            // Wait for upper piston position
            var slackWaitResult = await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, ct, MaxPistonWaitMs);
            if (!slackWaitResult.Success)
                return OrchestratorResult.Fail($"Üst piston boşluk alma hedefe ulaşamadı");
        }
        else
        {
            // BASINÇ BAZLI BOŞLUK ALMA (geriye dönük uyumluluk)
            _logger.LogDebug("Upper piston applying {Pressure}bar pressure at {Speed}% for gap compensation (boşluk alma)",
                slackPressureBar, SlackSpeedPercent);

            var slackPressureResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                PistonId.Upper, 1, slackPressureBar, SlackSpeedPercent);
            if (!slackPressureResult.Success)
                return OrchestratorResult.Fail($"Üst piston basınç hatası: {slackPressureResult.Message}");

            // Wait for upper piston pressure
            var slackWaitResult = await WaitForUpperPistonPressureAsync(slackPressureBar, ct);
            if (!slackWaitResult.Success)
                return slackWaitResult;
        }

        ct.ThrowIfCancellationRequested();

        // Step 1: Move passive piston FIRST (backward) - must retract before active moves forward
        var passiveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(passivePiston, paso.PassivePistonTargetMm, speedPercent);
        if (!passiveResult.Success)
            return passiveResult;

        // Wait for passive piston
        var passiveWaitResult = await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);
        if (!passiveWaitResult.Success)
            return OrchestratorResult.Fail($"Pasif piston ({passivePiston}) hedefe ulaşamadı");

        ct.ThrowIfCancellationRequested();

        // Step 2: Move active piston SECOND (forward)
        var activeResult = await _orchestrator.ExecutePistonMoveToPositionAsync(activePiston, paso.ActivePistonTargetMm, speedPercent);
        if (!activeResult.Success)
            return activeResult;

        // Wait for active piston
        var activeWaitResult = await _orchestrator.WaitForPistonInPositionAsync(activePiston, ct, MaxPistonWaitMs);
        if (!activeWaitResult.Success)
            return OrchestratorResult.Fail($"Aktif piston ({activePiston}) hedefe ulaşamadı");

        _logger.LogDebug("Piston movements complete");
        return OrchestratorResult.Ok();
    }

    /// <summary>
    /// Execute DYNAMIC piston movements for paso 2+ (uses actual positions, not pre-calculated)
    /// </summary>
    private async Task<OrchestratorResult> ExecuteDynamicPasoMovementAsync(
        PistonId activePiston, PistonId passivePiston,
        double activeTargetMm, double passiveTargetMm,
        int speedPercent, double? slackDistanceMm, int slackPressureBar, CancellationToken ct)
    {
        _logger.LogDebug("Dynamic paso: Active ({Active})→{ActiveTarget}mm, Passive ({Passive})→{PassiveTarget}mm",
            activePiston, activeTargetMm, passivePiston, passiveTargetMm);

        // Step 0: Upper piston boşluk alma
        _logger.LogDebug("Stopping upper piston to reset latch...");
        await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
        await Task.Delay(200, ct);

        if (slackDistanceMm.HasValue && slackDistanceMm.Value > 0)
        {
            // MESAFE BAZLI BOŞLUK ALMA
            var upperState = await _orchestrator.GetStateAsync();
            double upperCurrentPos = upperState.UpperPiston.PositionMm;
            double slackTargetPos = upperCurrentPos + slackDistanceMm.Value;

            _logger.LogDebug("Upper piston moving {Distance}mm for gap compensation ({Current}mm → {Target}mm)",
                slackDistanceMm.Value, upperCurrentPos, slackTargetPos);

            var slackMoveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                PistonId.Upper, slackTargetPos, SlackSpeedPercent);
            if (!slackMoveResult.Success)
                return OrchestratorResult.Fail($"Üst piston boşluk alma hatası: {slackMoveResult.Message}");

            var slackWaitResult = await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, ct, MaxPistonWaitMs);
            if (!slackWaitResult.Success)
                return OrchestratorResult.Fail($"Üst piston boşluk alma hedefe ulaşamadı");
        }
        else
        {
            // BASINÇ BAZLI BOŞLUK ALMA
            _logger.LogDebug("Upper piston applying {Pressure}bar pressure at {Speed}% for gap compensation",
                slackPressureBar, SlackSpeedPercent);

            var slackPressureResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                PistonId.Upper, 1, slackPressureBar, SlackSpeedPercent);
            if (!slackPressureResult.Success)
                return OrchestratorResult.Fail($"Üst piston basınç hatası: {slackPressureResult.Message}");

            var slackWaitResult = await WaitForUpperPistonPressureAsync(slackPressureBar, ct);
            if (!slackWaitResult.Success)
                return slackWaitResult;
        }

        ct.ThrowIfCancellationRequested();

        // Step 1: Move passive piston FIRST (backward)
        var passiveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(passivePiston, passiveTargetMm, speedPercent);
        if (!passiveResult.Success)
            return passiveResult;

        var passiveWaitResult = await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);
        if (!passiveWaitResult.Success)
            return OrchestratorResult.Fail($"Pasif piston ({passivePiston}) hedefe ulaşamadı");

        ct.ThrowIfCancellationRequested();

        // Step 2: Move active piston SECOND (forward)
        var activeResult = await _orchestrator.ExecutePistonMoveToPositionAsync(activePiston, activeTargetMm, speedPercent);
        if (!activeResult.Success)
            return activeResult;

        var activeWaitResult = await _orchestrator.WaitForPistonInPositionAsync(activePiston, ct, MaxPistonWaitMs);
        if (!activeWaitResult.Success)
            return OrchestratorResult.Fail($"Aktif piston ({activePiston}) hedefe ulaşamadı");

        _logger.LogDebug("Dynamic piston movements complete");
        return OrchestratorResult.Ok();
    }

    /// <summary>
    /// Wait for upper piston to reach target pressure (boşluk alma)
    /// </summary>
    private async Task<OrchestratorResult> WaitForUpperPistonPressureAsync(int targetPressure, CancellationToken ct)
    {
        var startTime = DateTime.UtcNow;
        int logCounter = 0;
        int retryCount = 0;
        const int maxRetries = 3;
        double lastRetryTime = 0;

        // CRITICAL: Wait for startup pressure spike
        _logger.LogDebug("Waiting {Ms}ms for startup pressure spike to settle...", StartupPressureIgnoreMs);
        await Task.Delay(StartupPressureIgnoreMs, ct);

        while (!ct.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            int currentPressure = state.Sensors.S1PressureBar; // S1 valve for Upper piston
            var pistonState = state.UpperPiston;
            var elapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Log every 10 iterations (~500ms) for debugging
            if (logCounter++ % 10 == 0)
            {
                _logger.LogDebug("Upper pressure wait: Pressure={Pressure}bar, Target={Target}bar, Moving={Moving}, Position={Pos:F2}mm",
                    currentPressure, targetPressure, pistonState.Moving, pistonState.PositionMm);
            }

            // Complete when piston stops AND pressure is near target
            if (!pistonState.Moving && currentPressure >= targetPressure - PressureTolerance)
            {
                _logger.LogDebug("Upper piston pressure reached: {Pressure}bar", currentPressure);
                return OrchestratorResult.Ok();
            }

            // SAFETY: If piston stopped but pressure not reached, retry with stop-start cycle
            // Only retry max 3 times, with 3 second intervals between retries
            if (!pistonState.Moving && currentPressure < targetPressure - PressureTolerance)
            {
                if (elapsed > 2000 && retryCount < maxRetries && (elapsed - lastRetryTime) > 3000)
                {
                    retryCount++;
                    lastRetryTime = elapsed;
                    _logger.LogWarning("Upper piston stopped but pressure not reached! Pressure={Pressure}bar, Target={Target}bar. Retry {Retry}/{Max}",
                        currentPressure, targetPressure, retryCount, maxRetries);
                    // Piston durmuş ama basınç yok - muhtemelen bAtPressure latch sorunu, tekrar dene
                    await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
                    await Task.Delay(200, ct);
                    await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Upper, 1, targetPressure, SlackSpeedPercent);
                    await Task.Delay(200, ct);
                }
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxPistonWaitMs)
            {
                _logger.LogError("Upper piston pressure timeout. Current: {Current}bar, Target: {Target}bar, Moving: {Moving}",
                    currentPressure, targetPressure, pistonState.Moving);
                return OrchestratorResult.Fail($"Üst piston basınç zaman aşımı. Mevcut: {currentPressure}bar, Hedef: {targetPressure}bar");
            }

            await Task.Delay(PollingIntervalMs, ct);
        }

        return OrchestratorResult.Fail("Üst piston basınç bekleme iptal edildi");
    }

    /// <summary>
    /// Execute adaptive first paso MOVEMENT (boşluk al + passive back + adaptive active)
    /// Returns contact offset (encoder stop position) for effective target calculation
    /// </summary>
    private async Task<(bool Success, double ContactOffset, string Error)> ExecuteAdaptiveFirstPasoMovementAsync(
        PasoStep paso, double targetPositionMm, double stepDistanceMm,
        double? slackDistanceMm, int slackPressureBar, CancellationToken ct)
    {
        // Determine which piston is which
        PistonId activePiston = paso.ActiveSide == "Left" ? PistonId.Left : PistonId.Right;
        PistonId passivePiston = paso.ActiveSide == "Left" ? PistonId.Right : PistonId.Left;

        _logger.LogInformation("=== ADAPTIVE FIRST PASO MOVEMENT ===");
        _logger.LogInformation("Active: {Active}, Passive: {Passive}, Kullanıcı Hedefi: {Target}mm, Adım: {Step}mm",
            activePiston, passivePiston, targetPositionMm, stepDistanceMm);

        // Step 0: Upper piston boşluk alma (same as normal paso)
        _logger.LogDebug("Stopping upper piston to reset latch...");
        await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
        await Task.Delay(200, ct);

        if (slackDistanceMm.HasValue && slackDistanceMm.Value > 0)
        {
            // MESAFE BAZLI BOŞLUK ALMA
            var upperState = await _orchestrator.GetStateAsync();
            double upperCurrentPos = upperState.UpperPiston.PositionMm;
            double slackTargetPos = upperCurrentPos + slackDistanceMm.Value;

            _logger.LogDebug("Upper piston moving {Distance}mm for gap compensation ({Current}mm → {Target}mm)",
                slackDistanceMm.Value, upperCurrentPos, slackTargetPos);

            var slackMoveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                PistonId.Upper, slackTargetPos, SlackSpeedPercent);
            if (!slackMoveResult.Success)
                return (false, 0, $"Üst piston boşluk alma hatası: {slackMoveResult.Message}");

            await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, ct, MaxPistonWaitMs);
        }
        else
        {
            // BASINÇ BAZLI BOŞLUK ALMA
            _logger.LogDebug("Upper piston applying {Pressure}bar pressure at {Speed}% for gap compensation",
                slackPressureBar, SlackSpeedPercent);

            var slackPressureResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                PistonId.Upper, 1, slackPressureBar, SlackSpeedPercent);
            if (!slackPressureResult.Success)
                return (false, 0, $"Üst piston basınç hatası: {slackPressureResult.Message}");

            var slackWaitResult = await WaitForUpperPistonPressureAsync(slackPressureBar, ct);
            if (!slackWaitResult.Success)
                return (false, 0, slackWaitResult.Error ?? "Üst piston basınç hatası");
        }

        ct.ThrowIfCancellationRequested();

        // Step 1: Move passive piston FIRST (backward)
        _logger.LogInformation("Passive piston → {Target}mm (backward)", paso.PassivePistonTargetMm);
        var passiveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
            passivePiston, paso.PassivePistonTargetMm, 100);
        if (!passiveResult.Success)
            return (false, 0, passiveResult.Error ?? "Pasif piston hatası");

        await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);

        ct.ThrowIfCancellationRequested();

        // Step 2: ADAPTIVE active piston movement (encoder-based stop)
        // User hedefi ABSOLUTE piston pozisyonu ve nihai sinir.
        // Adaptive temasi tespit edemezse bu noktada dur — hedefi asla asma.
        double maxPossibleTarget = targetPositionMm;
        var adaptiveResult = await ExecuteAdaptiveFirstPasoAsync(
            activePiston, maxPossibleTarget, stepDistanceMm, ct);

        if (!adaptiveResult.Success)
            return (false, adaptiveResult.ContactOffset, adaptiveResult.Error);

        _logger.LogInformation("Adaptive first paso movement completed. Final: {Final:F2}mm, Temas Ofseti: {Offset:F2}mm",
            adaptiveResult.FinalPosition, adaptiveResult.ContactOffset);

        return (true, adaptiveResult.ContactOffset, string.Empty);
    }

    /// <summary>
    /// Execute adaptive first paso - piston advances until encoder change stops
    ///
    /// Algorithm:
    /// 1. Start piston JOG at 20% speed (2V)
    /// 2. Monitor rotation encoder change
    /// 3. Stop when encoder hasn't changed for last 10mm of piston movement
    /// 4. Calculate final target: stopPosition + stepDistance (or effectiveTarget if exceeded)
    /// 5. Move piston to final target
    ///
    /// IMPORTANT: The stop position (contact offset) is the point where bending starts.
    /// This becomes the "zero point" for all bending calculations.
    /// Effective target = user target + contact offset
    /// </summary>
    /// <param name="pistonId">Active piston (Left or Right)</param>
    /// <param name="effectiveTargetMm">Effective target position (user target + contact offset)</param>
    /// <param name="stepDistanceMm">Step distance to add after stop (adım mesafesi)</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Success, FinalPosition, ContactOffset (encoder stop position), Error</returns>
    private async Task<(bool Success, double FinalPosition, double ContactOffset, string Error)> ExecuteAdaptiveFirstPasoAsync(
        PistonId pistonId, double effectiveTargetMm, double stepDistanceMm, CancellationToken ct)
    {
        _logger.LogInformation("=== ADAPTIVE FIRST PASO ===");
        _logger.LogInformation("Piston: {Piston}, Max Target: {Target}mm, Step: {Step}mm",
            pistonId, effectiveTargetMm, stepDistanceMm);

        // Start JOG forward at 20% speed
        var jogResult = await _orchestrator.ExecutePistonJogAsync(pistonId, 1, AdaptiveJogSpeedPercent);
        if (!jogResult.Success)
        {
            return (false, 0, 0, $"JOG başlatma hatası: {jogResult.Error}");
        }

        _logger.LogInformation("JOG started at {Speed}% speed (2V)", AdaptiveJogSpeedPercent);

        // Tracking variables
        double initialEncoder = 0;
        double previousEncoder = 0;
        double checkpointEncoder = 0;
        double checkpointPistonPos = 0;
        bool encoderStartedChanging = false;
        double pistonStopPosition = 0;

        var startTime = DateTime.UtcNow;

        try
        {
            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(PollingIntervalMs, ct);

                var state = await _orchestrator.GetStateAsync();
                double currentPistonPos = pistonId == PistonId.Left ? state.LeftPiston.PositionMm : state.RightPiston.PositionMm;
                double currentEncoder = state.Rotation.PositionMm;

                // First reading
                if (initialEncoder == 0 && previousEncoder == 0)
                {
                    initialEncoder = currentEncoder;
                    previousEncoder = currentEncoder;
                    checkpointEncoder = currentEncoder;
                    checkpointPistonPos = currentPistonPos;
                    _logger.LogDebug("Initial state: Piston={Piston:F2}mm, Encoder={Encoder:F2}mm",
                        currentPistonPos, currentEncoder);
                    continue;
                }

                // Check if encoder started changing (minimum 0.5mm change to confirm)
                if (!encoderStartedChanging && Math.Abs(currentEncoder - initialEncoder) > 0.5)
                {
                    encoderStartedChanging = true;
                    _logger.LogInformation("Encoder değişimi başladı: {Initial:F2}mm → {Current:F2}mm",
                        initialEncoder, currentEncoder);
                }

                // Update checkpoint every 10mm of piston movement
                if (currentPistonPos - checkpointPistonPos >= PistonCheckDistanceMm)
                {
                    double encoderChange = Math.Abs(currentEncoder - checkpointEncoder);

                    _logger.LogDebug("Checkpoint: Piston={Piston:F2}mm, Encoder change in last 10mm: {Change:F3}mm",
                        currentPistonPos, encoderChange);

                    // Stop condition: encoder started changing AND stopped changing
                    if (encoderStartedChanging && encoderChange < EncoderStopTolerance)
                    {
                        pistonStopPosition = currentPistonPos;
                        _logger.LogInformation("Encoder değişimi DURDU! Stop position: {Pos:F2}mm (Encoder: {Enc:F2}mm)",
                            pistonStopPosition, currentEncoder);
                        break;
                    }

                    // Update checkpoint
                    checkpointEncoder = currentEncoder;
                    checkpointPistonPos = currentPistonPos;
                }

                // Safety: stop at effective target position
                if (currentPistonPos >= effectiveTargetMm)
                {
                    pistonStopPosition = currentPistonPos;
                    _logger.LogWarning("Efektif hedefe ulaşıldı, encoder durma tespiti yapılamadı. Position: {Pos:F2}mm",
                        pistonStopPosition);
                    break;
                }

                // Timeout check
                if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxPistonWaitMs)
                {
                    await _orchestrator.ExecutePistonStopAsync(pistonId);
                    return (false, 0, 0, "Adaptive paso zaman aşımı");
                }

                previousEncoder = currentEncoder;
            }

            // Stop JOG
            await _orchestrator.ExecutePistonStopAsync(pistonId);
            await Task.Delay(200, ct);  // Wait for stop

            _logger.LogInformation("JOG durduruldu. Encoder durma pozisyonu (temas noktası): {Pos:F2}mm", pistonStopPosition);

            // IMPORTANT: pistonStopPosition is the CONTACT OFFSET (where bending starts)
            // This is now the "zero point" for bending calculations

            // Calculate final target for first paso
            // Hedef temas noktasindan asagidaysa geri hareket etme (temasta kal).
            // Uzeride ise: min(temas + adim, hedef) — hedefi asma.
            double calculatedTarget = pistonStopPosition + stepDistanceMm;
            double finalTarget = Math.Max(pistonStopPosition, Math.Min(calculatedTarget, effectiveTargetMm));

            _logger.LogInformation("Hesaplanan hedef: {Calc:F2}mm (temas + adım), Final hedef: {Final:F2}mm",
                calculatedTarget, finalTarget);

            // Move to final target
            var moveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                pistonId, finalTarget, 100);  // Full speed for final move

            if (!moveResult.Success)
            {
                return (false, 0, pistonStopPosition, $"Final pozisyona hareket hatası: {moveResult.Error}");
            }

            // Wait for position
            var waitResult = await _orchestrator.WaitForPistonInPositionAsync(pistonId, ct, MaxPistonWaitMs);
            if (!waitResult.Success)
            {
                return (false, 0, pistonStopPosition, "Final pozisyona ulaşılamadı");
            }

            _logger.LogInformation("=== ADAPTIVE FIRST PASO TAMAMLANDI === Final: {Final:F2}mm, Temas Ofseti: {Offset:F2}mm",
                finalTarget, pistonStopPosition);
            return (true, finalTarget, pistonStopPosition, string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Adaptive paso hatası");
            await _orchestrator.ExecutePistonStopAsync(pistonId);
            return (false, 0, 0, $"Adaptive paso hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Execute REPEAT paso for symmetry (when first paso reaches target directly)
    /// </summary>
    private async Task<OrchestratorResult> ExecuteRepeatPasoAsync(
        PistonId activePiston,
        PistonId passivePiston,
        double targetPosition,
        int rotationTarget,
        double? slackDistanceMm,
        int slackPressureBar,
        int speedPercent,
        int rotationSpeedPercent,
        CancellationToken ct)
    {
        _logger.LogInformation("=== REPEAT PASO (Simetri) ===");
        _logger.LogInformation("Aktif piston: {Active} → {Target:F2}mm", activePiston, targetPosition);
        _logger.LogInformation("Pasif piston: {Passive} → Safe backward limit", passivePiston);

        try
        {
            // Step 0: Upper piston boşluk alma
            _logger.LogDebug("Stopping upper piston to reset latch...");
            await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
            await Task.Delay(200, ct);

            // Mesafe bazlı mı yoksa basınç bazlı mı?
            if (slackDistanceMm.HasValue && slackDistanceMm.Value > 0)
            {
                // MESAFE BAZLI BOŞLUK ALMA
                var upperState = await _orchestrator.GetStateAsync();
                double upperCurrentPos = upperState.UpperPiston.PositionMm;
                double slackTargetPos = upperCurrentPos + slackDistanceMm.Value;

                _logger.LogDebug("Upper piston moving {Distance}mm for gap compensation ({Current}mm → {Target}mm)",
                    slackDistanceMm.Value, upperCurrentPos, slackTargetPos);

                var slackMoveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    PistonId.Upper, slackTargetPos, SlackSpeedPercent);
                if (!slackMoveResult.Success)
                    return OrchestratorResult.Fail($"Üst piston boşluk alma hatası: {slackMoveResult.Message}");

                await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, ct, MaxPistonWaitMs);
            }
            else
            {
                // BASINÇ BAZLI BOŞLUK ALMA
                _logger.LogDebug("Upper piston applying {Pressure}bar pressure at {Speed}% for gap compensation",
                    slackPressureBar, SlackSpeedPercent);

                var slackPressureResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                    PistonId.Upper, 1, slackPressureBar, SlackSpeedPercent);
                if (!slackPressureResult.Success)
                    return OrchestratorResult.Fail($"Üst piston basınç hatası: {slackPressureResult.Message}");

                var slackWaitResult = await WaitForUpperPistonPressureAsync(slackPressureBar, ct);
                if (!slackWaitResult.Success)
                    return slackWaitResult;
            }

            ct.ThrowIfCancellationRequested();

            // Step 1: Move passive piston FIRST (backward) - to safe limit
            double passiveBackwardLimit = _orchestrator.GetSafeBackwardLimit(passivePiston);
            _logger.LogInformation("Pasif piston ({Passive}) → {Limit:F2}mm (safe backward limit)",
                passivePiston, passiveBackwardLimit);

            var passiveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                passivePiston, passiveBackwardLimit, speedPercent);
            if (!passiveResult.Success)
                return passiveResult;

            // Wait for passive piston
            var passiveWaitResult = await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);
            if (!passiveWaitResult.Success)
                return OrchestratorResult.Fail($"Pasif piston ({passivePiston}) hedefe ulaşamadı");

            ct.ThrowIfCancellationRequested();

            // Step 2: Move active piston SECOND (forward) - to target
            _logger.LogInformation("Aktif piston ({Active}) → {Target:F2}mm (hedef konum)",
                activePiston, targetPosition);

            var activeResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                activePiston, targetPosition, speedPercent);
            if (!activeResult.Success)
                return activeResult;

            // Wait for active piston
            var activeWaitResult = await _orchestrator.WaitForPistonInPositionAsync(activePiston, ct, MaxPistonWaitMs);
            if (!activeWaitResult.Success)
                return OrchestratorResult.Fail($"Aktif piston ({activePiston}) hedefe ulaşamadı");

            ct.ThrowIfCancellationRequested();

            // Step 3: Execute rotation
            _logger.LogInformation("Repeat paso rotation: Target={Target}mm", rotationTarget);
            var rotationResult = await ExecuteAbsoluteRotationAsync(rotationTarget, rotationSpeedPercent, ct);
            if (!rotationResult.Success)
                return rotationResult;

            _logger.LogInformation("=== REPEAT PASO TAMAMLANDI ===");
            return OrchestratorResult.Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Repeat paso hatası");
            return OrchestratorResult.Fail($"Repeat paso hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Execute repeat paso with integrated triangle support.
    /// Same as ExecuteRepeatPasoAsync but during rotation, after 465mm (XA1) of travel,
    /// the passive piston starts moving to the active's target position concurrently.
    /// End state: both pistons at targetPosition (triangle support).
    /// </summary>
    private async Task<OrchestratorResult> ExecuteRepeatPasoWithTriangleSupportAsync(
        PistonId activePiston,
        PistonId passivePiston,
        double targetPosition,
        int rotationTarget,
        double? slackDistanceMm,
        int slackPressureBar,
        int speedPercent,
        int rotationSpeedPercent,
        CancellationToken ct)
    {
        _logger.LogInformation("=== REPEAT PASO + ÜÇGEN DESTEK ===");
        _logger.LogInformation("Aktif piston: {Active} → {Target:F2}mm", activePiston, targetPosition);
        _logger.LogInformation("Pasif piston: {Passive} → safe backward, sonra rotasyon sırasında {Target:F2}mm", passivePiston, targetPosition);

        try
        {
            // Step 0: Upper piston boşluk alma (same as regular repeat)
            _logger.LogDebug("Stopping upper piston to reset latch...");
            await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
            await Task.Delay(200, ct);

            if (slackDistanceMm.HasValue && slackDistanceMm.Value > 0)
            {
                var upperState = await _orchestrator.GetStateAsync();
                double upperCurrentPos = upperState.UpperPiston.PositionMm;
                double slackTargetPos = upperCurrentPos + slackDistanceMm.Value;

                var slackMoveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                    PistonId.Upper, slackTargetPos, SlackSpeedPercent);
                if (!slackMoveResult.Success)
                    return OrchestratorResult.Fail($"Üst piston boşluk alma hatası: {slackMoveResult.Message}");

                await _orchestrator.WaitForPistonInPositionAsync(PistonId.Upper, ct, MaxPistonWaitMs);
            }
            else
            {
                var slackPressureResult = await _orchestrator.ExecutePistonMoveToPressureAsync(
                    PistonId.Upper, 1, slackPressureBar, SlackSpeedPercent);
                if (!slackPressureResult.Success)
                    return OrchestratorResult.Fail($"Üst piston basınç hatası: {slackPressureResult.Message}");

                var slackWaitResult = await WaitForUpperPistonPressureAsync(slackPressureBar, ct);
                if (!slackWaitResult.Success)
                    return slackWaitResult;
            }

            ct.ThrowIfCancellationRequested();

            // Step 1: Move passive piston to safe backward limit
            double passiveBackwardLimit = _orchestrator.GetSafeBackwardLimit(passivePiston);
            _logger.LogInformation("Pasif piston ({Passive}) → {Limit:F2}mm (safe backward limit)",
                passivePiston, passiveBackwardLimit);

            var passiveResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                passivePiston, passiveBackwardLimit, speedPercent);
            if (!passiveResult.Success)
                return passiveResult;

            var passiveWaitResult = await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);
            if (!passiveWaitResult.Success)
                return OrchestratorResult.Fail($"Pasif piston ({passivePiston}) hedefe ulaşamadı");

            ct.ThrowIfCancellationRequested();

            // Step 2: Move active piston to target
            _logger.LogInformation("Aktif piston ({Active}) → {Target:F2}mm", activePiston, targetPosition);

            var activeResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                activePiston, targetPosition, speedPercent);
            if (!activeResult.Success)
                return activeResult;

            var activeWaitResult = await _orchestrator.WaitForPistonInPositionAsync(activePiston, ct, MaxPistonWaitMs);
            if (!activeWaitResult.Success)
                return OrchestratorResult.Fail($"Aktif piston ({activePiston}) hedefe ulaşamadı");

            ct.ThrowIfCancellationRequested();

            // Step 3: Rotasyon çalıştır, TAMAMEN bitmesini bekle
            _logger.LogInformation("Rotasyon başlıyor: Target={Target}mm", rotationTarget);

            var rotResult = await _orchestrator.ExecuteRotationMoveToPositionAsync(rotationTarget, rotationSpeedPercent);
            if (!rotResult.Success)
                return rotResult;

            var rotWaitStart = DateTime.UtcNow;
            while (!ct.IsCancellationRequested)
            {
                var state = await _orchestrator.GetStateAsync();
                if (state.Rotation.InPosition && state.Rotation.ActiveDirection == 0)
                {
                    _logger.LogInformation("Rotasyon tamamlandı: {Rot:F2}mm", state.Rotation.PositionMm);
                    await Task.Delay(100, ct);
                    break;
                }
                if ((DateTime.UtcNow - rotWaitStart).TotalMilliseconds > MaxRotationWaitMs)
                    return OrchestratorResult.Fail("Repeat paso rotasyon zaman aşımı");
                await Task.Delay(PollingIntervalMs, ct);
            }

            ct.ThrowIfCancellationRequested();

            // Step 4: Rotasyon bittikten SONRA pasif pistonu hedef pozisyona gönder (eşitleme)
            _logger.LogInformation("ÜÇGEN DESTEK (Eşitleme): {Piston} → {Target:F2}mm", passivePiston, targetPosition);

            var trianglePistonResult = await _orchestrator.ExecutePistonMoveToPositionAsync(
                passivePiston, targetPosition, speedPercent);
            if (!trianglePistonResult.Success)
                return OrchestratorResult.Fail($"Üçgen destek piston hatası: {trianglePistonResult.Message}");

            var triangleWaitResult = await _orchestrator.WaitForPistonInPositionAsync(passivePiston, ct, MaxPistonWaitMs);
            if (!triangleWaitResult.Success)
                return OrchestratorResult.Fail($"Üçgen destek piston ({passivePiston}) hedefe ulaşamadı");

            _logger.LogInformation("✅ ÜÇGEN DESTEK TAMAMLANDI: İki vals topu da {Target:F2}mm", targetPosition);
            return OrchestratorResult.Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Repeat paso + üçgen destek hatası");
            return OrchestratorResult.Fail($"Repeat paso + üçgen destek hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Execute rotation to absolute position (SIMPLE - no drift tracking needed)
    /// Direction is automatically determined by comparing current vs target position
    /// </summary>
    /// <param name="targetPositionMm">Target absolute position in mm</param>
    /// <param name="speedPercent">Speed percentage</param>
    /// <param name="ct">Cancellation token</param>
    private async Task<OrchestratorResult> ExecuteAbsoluteRotationAsync(int targetPositionMm, int speedPercent, CancellationToken ct)
    {
        var currentState = await _orchestrator.GetStateAsync();
        double currentPosition = currentState.Rotation.PositionMm;

        _logger.LogInformation("Absolute rotation: Current={Current:F2}mm → Target={Target}mm",
            currentPosition, targetPositionMm);

        // Use position mode - direction is automatically calculated by PLC
        var rotResult = await _orchestrator.ExecuteRotationMoveToPositionAsync(targetPositionMm, speedPercent);

        if (!rotResult.Success)
            return rotResult;

        // Wait for rotation to complete (polling for InPosition)
        var startTime = DateTime.UtcNow;

        while (!ct.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();

            if (state.Rotation.InPosition && state.Rotation.ActiveDirection == 0)
            {
                _logger.LogInformation("Rotation complete at encoder: {Encoder:F2}mm", state.Rotation.PositionMm);
                // Stabilization delay after rotation
                await Task.Delay(100, ct);
                return OrchestratorResult.Ok();
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxRotationWaitMs)
            {
                return OrchestratorResult.Fail("Rotasyon zaman aşımı");
            }

            await Task.Delay(PollingIntervalMs, ct);
        }

        return OrchestratorResult.Fail("Rotasyon iptal edildi");
    }

    /// <summary>
    /// Emergency stop all movements
    /// </summary>
    private async Task EmergencyStopAllAsync()
    {
        try
        {
            await _orchestrator.ExecutePistonStopAsync(PistonId.Left);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Right);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Lower);
            await _orchestrator.ExecuteRotationStopAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during emergency stop");
        }
    }
}

/// <summary>
/// Handler for StopBendingCommand
/// Cancels ongoing bending operation
/// </summary>
public class StopBendingHandler : IRequestHandler<StopBendingCommand, bool>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<StopBendingHandler> _logger;

    public StopBendingHandler(IMachineOrchestrator orchestrator, ILogger<StopBendingHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<bool> Handle(StopBendingCommand request, CancellationToken cancellationToken)
    {
        _logger.LogWarning("Bending stop requested");

        // Cancel ongoing bending operation
        ExecuteGeometricBendingHandler.BendingCancellationSource?.Cancel();

        // Stop springback measurement FIRST (overrides piston control in PLC!)
        await _orchestrator.ExecuteSpringbackStopAsync();

        // Stop all movements
        await _orchestrator.ExecutePistonStopAsync(PistonId.Left);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Right);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
        await _orchestrator.ExecutePistonStopAsync(PistonId.Lower);
        await _orchestrator.ExecuteRotationStopAsync();

        _logger.LogInformation("Bending stopped");
        return true;
    }
}
