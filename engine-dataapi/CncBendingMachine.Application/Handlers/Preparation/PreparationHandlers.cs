using CncBendingMachine.Application.Commands.Preparation;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Application.Handlers.Preparation;

/// <summary>
/// Handler for Gönye (reference position) command
/// </summary>
public class ExecuteGonyeHandler : IRequestHandler<ExecuteGonyeCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<ExecuteGonyeHandler> _logger;

    // Polling configuration
    private const int PollingIntervalMs = 100;
    private const int MaxWaitTimeMs = 30000; // 30 seconds max wait

    // C# polling delay before checking pressure (PLC has 300ms internal delay)
    private const int StartupPressureIgnoreMs = 100;

    public ExecuteGonyeHandler(IMachineOrchestrator orchestrator, ILogger<ExecuteGonyeHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(ExecuteGonyeCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting Gönye operation - Target pressure: {Pressure} bar", request.RetractPressureBar);

        try
        {
            // ===================================================================
            // STEP 1: Retract ALL pistons and pneumatics to mechanical limit
            // ===================================================================
            _logger.LogInformation("Step 1: Starting retraction of ALL pistons and pneumatics to mechanical limit");

            // Start all piston retractions simultaneously (don't wait individually - they all retract together)
            var rightResult = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Right, -1, request.RetractPressureBar, request.SpeedPercent);
            if (!rightResult.Success)
                return PreparationResult.Fail("Gönye", $"Right piston başlatma hatası: {rightResult.Message}");

            var leftResult = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Left, -1, request.RetractPressureBar, request.SpeedPercent);
            if (!leftResult.Success)
                return PreparationResult.Fail("Gönye", $"Left piston başlatma hatası: {leftResult.Message}");

            var upperResult = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Upper, -1, request.RetractPressureBar, request.SpeedPercent);
            if (!upperResult.Success)
                return PreparationResult.Fail("Gönye", $"Upper piston başlatma hatası: {upperResult.Message}");

            var lowerResult = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Lower, -1, request.RetractPressureBar, request.SpeedPercent);
            if (!lowerResult.Success)
                return PreparationResult.Fail("Gönye", $"Lower piston başlatma hatası: {lowerResult.Message}");

            // Retract pneumatics (P1-P and P2-P) - direction -1 = backward
            var rightPneumaticResult = await _orchestrator.ExecutePneumaticControlAsync(PistonId.Right, -1);
            if (!rightPneumaticResult.Success)
                _logger.LogWarning("Right pneumatic retraction warning: {Message}", rightPneumaticResult.Message);

            var leftPneumaticResult = await _orchestrator.ExecutePneumaticControlAsync(PistonId.Left, -1);
            if (!leftPneumaticResult.Success)
                _logger.LogWarning("Left pneumatic retraction warning: {Message}", leftPneumaticResult.Message);

            _logger.LogInformation("All movements started - waiting for S1 AND S2 to reach {Pressure} bar", request.RetractPressureBar);

            // Wait for BOTH S1 AND S2 to reach target pressure
            // IMPORTANT: Ignore first 500ms due to startup pressure spike
            if (!await WaitForBothValvePressuresAsync(request.RetractPressureBar, cancellationToken))
                return PreparationResult.Fail("Gönye", "S1 ve S2 basınç hedefine ulaşamadı");

            // Stop pneumatics after retraction
            await _orchestrator.ExecutePneumaticControlAsync(PistonId.Right, 0);
            await _orchestrator.ExecutePneumaticControlAsync(PistonId.Left, 0);

            _logger.LogInformation("All pistons and pneumatics retracted to mechanical limit successfully");

            // ===================================================================
            // STEP 2: RESET ALL ENCODERS (MANDATORY - this is the reference point!)
            // Pistons are now at their physical limit - this IS the zero position
            // ===================================================================
            _logger.LogInformation("Step 2: Resetting ALL encoders at mechanical limit (reference point)");

            var resetResult = await _orchestrator.ResetEncodersAsync();
            if (!resetResult.Success)
                return PreparationResult.Fail("Gönye", $"Encoder sıfırlama hatası: {resetResult.Message}");

            // Wait for encoder reset to take effect and PLC to acknowledge
            await Task.Delay(200, cancellationToken);

            _logger.LogInformation("All encoders reset to zero at reference point");

            // ===================================================================
            // STEP 3: Move to Gönye offset positions (from the new zero reference)
            // ===================================================================
            _logger.LogInformation("Step 3: Moving to Gönye offset positions");

            // Move Lower piston to offset position
            var result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Lower, request.LowerPistonOffset, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Gönye", $"Lower piston pozisyon hatası: {result.Message}");

            if (!await WaitForPistonInPositionAsync(PistonId.Lower, cancellationToken))
                return PreparationResult.Fail("Gönye", "Lower piston hedef pozisyona ulaşamadı");

            // Move Left piston to offset position
            result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Left, request.LeftPistonOffset, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Gönye", $"Left piston pozisyon hatası: {result.Message}");

            if (!await WaitForPistonInPositionAsync(PistonId.Left, cancellationToken))
                return PreparationResult.Fail("Gönye", "Left piston hedef pozisyona ulaşamadı");

            // Right piston stays at reference (0) - NO offset movement!
            // Upper piston also stays at 0 (no offset needed - it's already at reference)
            _logger.LogInformation("Pistons at Gönye positions: Lower={Lower}mm, Left={Left}mm, Right=0mm (ref), Upper=0mm",
                request.LowerPistonOffset, request.LeftPistonOffset);

            // ===================================================================
            // STEP 4: Capture ACTUAL encoder values BEFORE reset
            // This is CRITICAL - we want real values, not config values!
            // ===================================================================
            var stateBeforeReset = await _orchestrator.GetStateAsync();
            double actualLeftOffset = stateBeforeReset.LeftPiston.PositionMm;
            double actualRightOffset = stateBeforeReset.RightPiston.PositionMm;
            double actualUpperOffset = stateBeforeReset.UpperPiston.PositionMm;
            double actualLowerOffset = stateBeforeReset.LowerPiston.PositionMm;

            _logger.LogInformation("ACTUAL encoder values BEFORE reset: Lower={Lower}mm, Left={Left}mm, Right={Right}mm, Upper={Upper}mm",
                actualLowerOffset, actualLeftOffset, actualRightOffset, actualUpperOffset);

            // ===================================================================
            // STEP 5: RESET ENCODERS at Gönye offset positions
            // This makes the Gönye position the new "zero" for encoder readings
            // Physical position tracking will add the ACTUAL offset back
            // ===================================================================
            _logger.LogInformation("Step 5: Resetting encoders at Gönye offset positions");

            resetResult = await _orchestrator.ResetEncodersAsync();
            if (!resetResult.Success)
                return PreparationResult.Fail("Gönye", $"İkinci encoder sıfırlama hatası: {resetResult.Message}");

            // Wait for encoder reset to take effect
            await Task.Delay(200, cancellationToken);

            _logger.LogInformation("Encoders reset at Gönye positions - encoders now show 0, physical tracking active");

            // ===================================================================
            // STEP 6: Mark Gönye as completed with ACTUAL encoder values
            // NOT using DB config values - using real measured values!
            // ===================================================================
            _orchestrator.SetGonyeCompleted(actualLeftOffset, actualRightOffset, actualUpperOffset, actualLowerOffset);

            _logger.LogInformation("Gönye operation completed successfully");
            return PreparationResult.Ok("Gönye");
        }
        catch (OperationCanceledException)
        {
            // Stop all movements on cancellation
            await StopAllMovementsAsync();
            _logger.LogWarning("Gönye operation cancelled");
            return PreparationResult.Fail("Gönye", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            await StopAllMovementsAsync();
            _logger.LogError(ex, "Gönye operation failed");
            return PreparationResult.Fail("Gönye", ex.Message);
        }
    }

    /// <summary>
    /// Wait for BOTH S1 AND S2 valves to reach target pressure.
    /// IMPORTANT: Ignores first 500ms due to startup pressure spike.
    /// </summary>
    private async Task<bool> WaitForBothValvePressuresAsync(int targetPressure, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        const int pressureTolerance = 5;

        // CRITICAL: Wait 500ms to ignore startup pressure spike
        _logger.LogDebug("Waiting {Ms}ms for startup pressure spike to settle...", StartupPressureIgnoreMs);
        await Task.Delay(StartupPressureIgnoreMs, cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            int s1Pressure = state.Sensors.S1PressureBar;
            int s2Pressure = state.Sensors.S2PressureBar;

            // Check if BOTH S1 AND S2 reached target pressure
            bool s1Reached = s1Pressure >= targetPressure - pressureTolerance;
            bool s2Reached = s2Pressure >= targetPressure - pressureTolerance;

            _logger.LogDebug("Pressure check: S1={S1}bar (target:{Target}), S2={S2}bar (target:{Target})",
                s1Pressure, targetPressure, s2Pressure, targetPressure);

            if (s1Reached && s2Reached)
            {
                _logger.LogInformation("Both valves reached target pressure: S1={S1}bar, S2={S2}bar", s1Pressure, s2Pressure);
                return true;
            }

            // Also check if all pistons stopped moving (indicates physical limit reached)
            bool allStopped = !state.RightPiston.Moving && !state.LeftPiston.Moving &&
                              !state.UpperPiston.Moving && !state.LowerPiston.Moving;

            if (allStopped)
            {
                _logger.LogInformation("All pistons stopped. Final pressures: S1={S1}bar, S2={S2}bar", s1Pressure, s2Pressure);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Pressure timeout. S1={S1}bar, S2={S2}bar, Target={Target}bar",
                    s1Pressure, s2Pressure, targetPressure);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }

    private async Task<bool> WaitForPistonInPositionAsync(PistonId piston, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            var pistonState = GetPistonState(state, piston);

            if (pistonState.InPosition && !pistonState.Moving)
            {
                _logger.LogDebug("{Piston} piston reached position: {Position}mm", piston, pistonState.PositionMm);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("{Piston} piston timeout waiting for InPosition. Current: {Position}mm, Moving: {Moving}",
                    piston, pistonState.PositionMm, pistonState.Moving);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }

    private async Task StopAllMovementsAsync()
    {
        try
        {
            await _orchestrator.ExecutePistonStopAsync(PistonId.Right);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Left);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
            await _orchestrator.ExecutePistonStopAsync(PistonId.Lower);
            await _orchestrator.ExecutePneumaticControlAsync(PistonId.Right, 0);
            await _orchestrator.ExecutePneumaticControlAsync(PistonId.Left, 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping movements");
        }
    }

    private static PistonState GetPistonState(MachineState state, PistonId piston) => piston switch
    {
        PistonId.Right => state.RightPiston,
        PistonId.Left => state.LeftPiston,
        PistonId.Upper => state.UpperPiston,
        PistonId.Lower => state.LowerPiston,
        _ => throw new ArgumentException($"Invalid piston: {piston}")
    };
}

/// <summary>
/// Handler for Stage change command
/// </summary>
public class ChangeStageHandler : IRequestHandler<ChangeStageCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<ChangeStageHandler> _logger;

    private const int PollingIntervalMs = 100;
    private const int MaxWaitTimeMs = 30000;

    public ChangeStageHandler(IMachineOrchestrator orchestrator, ILogger<ChangeStageHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(ChangeStageCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Changing to Stage {Stage}", request.TargetStage);

        try
        {
            var stageConfig = StageConfigurations.GetStage(request.TargetStage);

            _logger.LogInformation("Moving pistons to Stage {Stage} positions: Left={Left}mm, Lower={Lower}mm, Right={Right}mm",
                request.TargetStage,
                stageConfig.LeftPistonPosition,
                stageConfig.LowerPistonPosition,
                stageConfig.RightPistonPosition);

            // Move Left piston
            var result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Left, stageConfig.LeftPistonPosition, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail($"Stage {request.TargetStage}", $"Left piston hatası: {result.Message}");

            if (!await WaitForPistonInPositionAsync(PistonId.Left, cancellationToken))
                return PreparationResult.Fail($"Stage {request.TargetStage}", "Left piston hedef pozisyona ulaşamadı");

            // Move Lower piston
            result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Lower, stageConfig.LowerPistonPosition, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail($"Stage {request.TargetStage}", $"Lower piston hatası: {result.Message}");

            if (!await WaitForPistonInPositionAsync(PistonId.Lower, cancellationToken))
                return PreparationResult.Fail($"Stage {request.TargetStage}", "Lower piston hedef pozisyona ulaşamadı");

            // Move Right piston
            result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Right, stageConfig.RightPistonPosition, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail($"Stage {request.TargetStage}", $"Right piston hatası: {result.Message}");

            if (!await WaitForPistonInPositionAsync(PistonId.Right, cancellationToken))
                return PreparationResult.Fail($"Stage {request.TargetStage}", "Right piston hedef pozisyona ulaşamadı");

            // ===================================================================
            // Capture ACTUAL encoder values BEFORE reset
            // This is CRITICAL - we want real values, not config values!
            // ===================================================================
            var stateBeforeReset = await _orchestrator.GetStateAsync();
            double actualLeftOffset = stateBeforeReset.LeftPiston.PositionMm;
            double actualRightOffset = stateBeforeReset.RightPiston.PositionMm;
            double actualLowerOffset = stateBeforeReset.LowerPiston.PositionMm;

            _logger.LogInformation("ACTUAL encoder values BEFORE reset for Stage {Stage}: Lower={Lower}mm, Left={Left}mm, Right={Right}mm",
                request.TargetStage, actualLowerOffset, actualLeftOffset, actualRightOffset);

            // ===================================================================
            // RESET ENCODERS at Stage positions
            // This makes the Stage position the new "zero" for encoder readings
            // Physical position tracking will add the ACTUAL offset back
            // ===================================================================
            _logger.LogInformation("Resetting encoders at Stage {Stage} positions", request.TargetStage);

            var resetResult = await _orchestrator.ResetEncodersAsync();
            if (!resetResult.Success)
                return PreparationResult.Fail($"Stage {request.TargetStage}", $"Encoder sıfırlama hatası: {resetResult.Message}");

            // Wait for encoder reset to take effect
            await Task.Delay(200, cancellationToken);

            _logger.LogInformation("Encoders reset at Stage {Stage} positions", request.TargetStage);

            // ===================================================================
            // Mark Stage as completed with ACTUAL encoder values
            // NOT using DB config values - using real measured values!
            // ===================================================================
            var stageResult = _orchestrator.SetStageCompleted(request.TargetStage, actualLeftOffset, actualRightOffset, actualLowerOffset);
            if (!stageResult.Success)
                return PreparationResult.Fail($"Stage {request.TargetStage}", stageResult.Error ?? "Stage tamamlama hatası");

            _logger.LogInformation("Stage {Stage} change completed", request.TargetStage);
            return PreparationResult.Ok($"Stage {request.TargetStage}");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Stage change cancelled");
            return PreparationResult.Fail($"Stage {request.TargetStage}", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stage change failed");
            return PreparationResult.Fail($"Stage {request.TargetStage}", ex.Message);
        }
    }

    private async Task<bool> WaitForPistonInPositionAsync(PistonId piston, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            var pistonState = GetPistonState(state, piston);

            if (pistonState.InPosition && !pistonState.Moving)
            {
                _logger.LogDebug("{Piston} piston reached position: {Position}mm", piston, pistonState.PositionMm);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("{Piston} piston timeout. Current: {Position}mm, Moving: {Moving}",
                    piston, pistonState.PositionMm, pistonState.Moving);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }

    private static PistonState GetPistonState(MachineState state, PistonId piston) => piston switch
    {
        PistonId.Right => state.RightPiston,
        PistonId.Left => state.LeftPiston,
        PistonId.Upper => state.UpperPiston,
        PistonId.Lower => state.LowerPiston,
        _ => throw new ArgumentException($"Invalid piston: {piston}")
    };
}

/// <summary>
/// Handler for Part Clamping command
/// </summary>
public class ClampPartHandler : IRequestHandler<ClampPartCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<ClampPartHandler> _logger;

    private const int PollingIntervalMs = 100;
    private const int MaxWaitTimeMs = 15000; // 15 seconds for clamping

    // C# polling delay before checking pressure (PLC has 300ms internal delay)
    // 500ms bekle: PLC kalkış basınç spike'ı 200-300ms sürüyor
    private const int StartupPressureIgnoreMs = 500;

    public ClampPartHandler(IMachineOrchestrator orchestrator, ILogger<ClampPartHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(ClampPartCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting part clamping operation");

        try
        {
            // Check part presence sensor if required
            if (request.WaitForPartSensor)
            {
                var state = await _orchestrator.GetStateAsync();
                bool sensorActive = request.SensorSide == "Left"
                    ? state.Safety.LeftPartSensor
                    : state.Safety.RightPartSensor;

                if (!sensorActive)
                {
                    _logger.LogWarning("Part presence sensor ({Side}) not active", request.SensorSide);
                    return PreparationResult.Fail("Clamp", $"{request.SensorSide} parça varlık sensörü aktif değil");
                }
            }

            // Move Upper piston forward until target pressure
            // IMPORTANT: Stop first to reset bAtPressure latch in PLC (mode 3→0→3 transition)
            await _orchestrator.ExecutePistonStopAsync(PistonId.Upper);
            await Task.Delay(200, cancellationToken);

            _logger.LogInformation("Clamping: Upper piston moving to {Pressure} bar at {Speed}% speed",
                request.PressureBar, request.SpeedPercent);

            // Direction: 1 = Forward (negative voltage in our system = forward)
            var result = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Upper, 1, request.PressureBar, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Clamp", $"Upper piston sıkıştırma hatası: {result.Message}");

            // Wait for clamping pressure to be reached
            // IMPORTANT: Ignore first 500ms due to startup pressure spike
            if (!await WaitForClampingPressureAsync(request.PressureBar, cancellationToken))
                return PreparationResult.Fail("Clamp", "Sıkıştırma basıncına ulaşılamadı");

            // Verify clamping via PLC InPosition latch
            // NOT: Basınç değeri voltaj kesilince düşer (7 bar'a), bu normal.
            // PLC'nin InPosition latch'i güvenilir kaynak.
            var finalState = await _orchestrator.GetStateAsync();
            if (!finalState.UpperPiston.InPosition)
            {
                int currentPressure = finalState.Sensors.S1PressureBar;
                _logger.LogWarning("Clamping InPosition not set. Pressure: {Current}bar", currentPressure);
                return PreparationResult.Fail("Clamp", $"Sıkıştırma doğrulanamadı: InPosition=false, Basınç={currentPressure}bar");
            }

            _logger.LogInformation("Part clamping completed (InPosition=true)");
            return PreparationResult.Ok("Clamp");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Part clamping cancelled");
            return PreparationResult.Fail("Clamp", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Part clamping failed");
            return PreparationResult.Fail("Clamp", ex.Message);
        }
    }

    private async Task<bool> WaitForClampingPressureAsync(int targetPressure, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        const int pressureTolerance = 1;

        // CRITICAL: Wait 500ms to ignore startup pressure spike
        _logger.LogDebug("Waiting {Ms}ms for startup pressure spike to settle...", StartupPressureIgnoreMs);
        await Task.Delay(StartupPressureIgnoreMs, cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            int currentPressure = state.Sensors.S1PressureBar; // S1 valve for Upper piston
            var pistonState = state.UpperPiston;

            _logger.LogDebug("Clamping pressure check: S1={Pressure}bar (target:{Target}), InPos={InPos}, Moving={Moving}",
                currentPressure, targetPressure, pistonState.InPosition, pistonState.Moving);

            // PLC latch kontrolü: bAtPressure/bInPosition hedef basınca ulaşıldığında set edilir
            // ve voltaj kesilse bile true kalır. Basınç değeri voltaj kesilince düşer,
            // bu yüzden anlık basınç yerine PLC latch'ine güveniyoruz.
            // NOT: Kalkış spike'ı sırasında basınç 160 bar gösterebilir ama InPosition=false olur.
            if (pistonState.InPosition)
            {
                _logger.LogInformation("Clamping complete: PLC InPosition latch set (S1={Pressure}bar)", currentPressure);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Clamping timeout. Current: {Current}bar, Target: {Target}bar, Moving: {Moving}",
                    currentPressure, targetPressure, pistonState.Moving);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }
}

/// <summary>
/// Handler for Part Release command
/// </summary>
public class ReleasePartHandler : IRequestHandler<ReleasePartCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<ReleasePartHandler> _logger;

    private const int PollingIntervalMs = 100;
    private const int MaxWaitTimeMs = 15000;

    public ReleasePartHandler(IMachineOrchestrator orchestrator, ILogger<ReleasePartHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(ReleasePartCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Releasing clamped part to {Position}mm", request.ReleasePositionMm);

        try
        {
            // Move Upper piston to release position (back)
            var result = await _orchestrator.ExecutePistonMoveToPositionAsync(PistonId.Upper, request.ReleasePositionMm, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Release", $"Upper piston bırakma hatası: {result.Message}");

            // Wait for position
            if (!await WaitForPistonInPositionAsync(cancellationToken))
                return PreparationResult.Fail("Release", "Upper piston bırakma pozisyonuna ulaşamadı");

            _logger.LogInformation("Part released");
            return PreparationResult.Ok("Release");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Part release cancelled");
            return PreparationResult.Fail("Release", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Part release failed");
            return PreparationResult.Fail("Release", ex.Message);
        }
    }

    private async Task<bool> WaitForPistonInPositionAsync(CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            var pistonState = state.UpperPiston;

            if (pistonState.InPosition && !pistonState.Moving)
            {
                _logger.LogDebug("Upper piston reached release position: {Position}mm", pistonState.PositionMm);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Upper piston release timeout. Current: {Position}mm", pistonState.PositionMm);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }
}

/// <summary>
/// Handler for Part Zeroing command
/// </summary>
public class ZeroPartHandler : IRequestHandler<ZeroPartCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<ZeroPartHandler> _logger;

    private const int PollingIntervalMs = 50; // Faster polling for sensor detection
    private const int MaxWaitTimeMs = 30000;

    public ZeroPartHandler(IMachineOrchestrator orchestrator, ILogger<ZeroPartHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(ZeroPartCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting part zeroing operation with {Side} sensor", request.SensorSide);

        try
        {
            // Determine rotation directions based on sensor side
            // Left sensor: CW moves away, CCW moves toward
            // Right sensor: CCW moves away, CW moves toward
            int awayDirection = request.SensorSide == "Left" ? 1 : -1;  // CW = 1, CCW = -1
            int towardDirection = -awayDirection;

            // Step 1: Move away from sensor (until sensor becomes inactive)
            _logger.LogInformation("Step 1: Moving away from {Side} sensor", request.SensorSide);

            // Start rotation away from sensor at fast speed
            var result = await _orchestrator.ExecuteRotationJogAsync(awayDirection, request.FastSpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Zero", $"Rotasyon başlatma hatası: {result.Message}");

            // Wait until sensor becomes inactive
            if (!await WaitForSensorStateAsync(request.SensorSide, false, cancellationToken))
            {
                await _orchestrator.ExecuteRotationStopAsync();
                return PreparationResult.Fail("Zero", "Sensörden uzaklaşma zaman aşımı");
            }

            // Stop rotation
            result = await _orchestrator.ExecuteRotationStopAsync();
            if (!result.Success)
                return PreparationResult.Fail("Zero", $"Rotasyon durdurma hatası: {result.Message}");

            // Wait for rotation to actually stop
            await WaitForRotationStopAsync(cancellationToken);

            // Stabilization delay after moving away from sensor
            await Task.Delay(100, cancellationToken);

            // Step 2: Slow approach toward sensor (until sensor becomes active)
            _logger.LogInformation("Step 2: Slow approach toward {Side} sensor", request.SensorSide);

            result = await _orchestrator.ExecuteRotationJogAsync(towardDirection, request.SlowSpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Zero", $"Yavaş yaklaşma hatası: {result.Message}");

            // Wait until sensor becomes active
            if (!await WaitForSensorStateAsync(request.SensorSide, true, cancellationToken))
            {
                await _orchestrator.ExecuteRotationStopAsync();
                return PreparationResult.Fail("Zero", "Sensöre yaklaşma zaman aşımı");
            }

            // Stop rotation immediately when sensor activates
            result = await _orchestrator.ExecuteRotationStopAsync();
            if (!result.Success)
                return PreparationResult.Fail("Zero", $"Rotasyon durdurma hatası: {result.Message}");

            // Wait for rotation to actually stop
            await WaitForRotationStopAsync(cancellationToken);

            // Stabilization delay after sensor detection
            await Task.Delay(100, cancellationToken);

            _logger.LogInformation("Sensor detected - part zeroed at reference point");

            // Step 3: Move to start position (away from sensor by calculated distance)
            double startPosition = request.ResetDistanceMm - request.SafetyDistanceMm;
            _logger.LogInformation("Step 3: Moving to start position ({Position}mm from sensor)", startPosition);

            result = await _orchestrator.ExecuteRotationMoveDistanceAsync(awayDirection, (int)startPosition, request.PositionSpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("Zero", $"Başlangıç pozisyonuna hareket hatası: {result.Message}");

            // Wait for rotation to complete
            if (!await WaitForRotationInPositionAsync(cancellationToken))
                return PreparationResult.Fail("Zero", "Başlangıç pozisyonuna ulaşılamadı");

            // ===================================================================
            // STEP 4: RESET ONLY ROTATION ENCODER at start position
            // This is the reference point for bending operations
            // IMPORTANT: Do NOT reset piston encoders - they are calibrated to Gönye/Stage!
            // ===================================================================
            _logger.LogInformation("Step 4: Resetting ONLY rotation encoder at start position");

            var resetResult = await _orchestrator.ResetRotationEncoderAsync();
            if (!resetResult.Success)
                return PreparationResult.Fail("Zero", $"Rotasyon encoder sıfırlama hatası: {resetResult.Message}");

            // Wait for encoder reset to take effect
            await Task.Delay(200, cancellationToken);

            _logger.LogInformation("Rotation encoder reset - part zeroing completed (piston encoders preserved)");
            return PreparationResult.Ok("Zero");
        }
        catch (OperationCanceledException)
        {
            await _orchestrator.ExecuteRotationStopAsync();
            _logger.LogWarning("Part zeroing cancelled");
            return PreparationResult.Fail("Zero", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            await _orchestrator.ExecuteRotationStopAsync();
            _logger.LogError(ex, "Part zeroing failed");
            return PreparationResult.Fail("Zero", ex.Message);
        }
    }

    private async Task<bool> WaitForSensorStateAsync(string sensorSide, bool targetState, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            bool currentState = sensorSide == "Left"
                ? state.Safety.LeftPartSensor
                : state.Safety.RightPartSensor;

            if (currentState == targetState)
            {
                _logger.LogDebug("{Side} sensor state changed to {State}", sensorSide, targetState ? "ACTIVE" : "INACTIVE");
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Sensor state timeout. {Side} sensor current: {Current}, expected: {Expected}",
                    sensorSide, currentState, targetState);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }

    private async Task WaitForRotationStopAsync(CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested && (DateTime.UtcNow - startTime).TotalMilliseconds < 2000)
        {
            var state = await _orchestrator.GetStateAsync();
            if (state.Rotation.ActiveDirection == 0)
            {
                return;
            }
            await Task.Delay(PollingIntervalMs, cancellationToken);
        }
    }

    private async Task<bool> WaitForRotationInPositionAsync(CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();

            if (state.Rotation.InPosition && state.Rotation.ActiveDirection == 0)
            {
                _logger.LogDebug("Rotation reached position: {Position}", state.Rotation.PositionMm);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Rotation position timeout. Current: {Position}, InPosition: {InPos}",
                    state.Rotation.PositionMm, state.Rotation.InPosition);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }
}

/// <summary>
/// Handler for Take Up Slack command
/// </summary>
public class TakeUpSlackHandler : IRequestHandler<TakeUpSlackCommand, PreparationResult>
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly ILogger<TakeUpSlackHandler> _logger;

    private const int PollingIntervalMs = 100;
    private const int MaxWaitTimeMs = 10000;

    // C# polling delay before checking pressure (PLC has 300ms internal delay)
    private const int StartupPressureIgnoreMs = 100;

    public TakeUpSlackHandler(IMachineOrchestrator orchestrator, ILogger<TakeUpSlackHandler> logger)
    {
        _orchestrator = orchestrator;
        _logger = logger;
    }

    public async Task<PreparationResult> Handle(TakeUpSlackCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Taking up slack at {Pressure} bar", request.PressureBar);

        try
        {
            // Move Lower piston forward until target pressure
            var result = await _orchestrator.ExecutePistonMoveToPressureAsync(PistonId.Lower, 1, request.PressureBar, request.SpeedPercent);
            if (!result.Success)
                return PreparationResult.Fail("TakeUpSlack", $"Lower piston boşluk alma hatası: {result.Message}");

            // Wait for pressure to be reached
            // IMPORTANT: Ignore first 500ms due to startup pressure spike
            if (!await WaitForPressureAsync(request.PressureBar, cancellationToken))
                return PreparationResult.Fail("TakeUpSlack", "Boşluk alma basıncına ulaşılamadı");

            _logger.LogInformation("Slack take-up completed");
            return PreparationResult.Ok("TakeUpSlack");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Slack take-up cancelled");
            return PreparationResult.Fail("TakeUpSlack", "İşlem iptal edildi");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Slack take-up failed");
            return PreparationResult.Fail("TakeUpSlack", ex.Message);
        }
    }

    private async Task<bool> WaitForPressureAsync(int targetPressure, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        const int pressureTolerance = 5;

        // CRITICAL: Wait 500ms to ignore startup pressure spike
        _logger.LogDebug("Waiting {Ms}ms for startup pressure spike to settle...", StartupPressureIgnoreMs);
        await Task.Delay(StartupPressureIgnoreMs, cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var state = await _orchestrator.GetStateAsync();
            int currentPressure = state.Sensors.S1PressureBar; // S1 valve for Lower piston
            var pistonState = state.LowerPiston;

            // Complete when piston stops AND pressure is near target
            if (!pistonState.Moving && currentPressure >= targetPressure - pressureTolerance)
            {
                _logger.LogDebug("Slack take-up pressure reached: {Pressure}bar", currentPressure);
                return true;
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > MaxWaitTimeMs)
            {
                _logger.LogError("Slack take-up timeout. Current: {Current}bar, Target: {Target}bar",
                    currentPressure, targetPressure);
                return false;
            }

            await Task.Delay(PollingIntervalMs, cancellationToken);
        }

        return false;
    }
}

/// <summary>
/// Handler for Get Stages query
/// </summary>
public class GetStagesHandler : IRequestHandler<GetStagesQuery, StageConfiguration[]>
{
    public Task<StageConfiguration[]> Handle(GetStagesQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(StageConfigurations.AllStages);
    }
}

/// <summary>
/// Handler for Get Preparation State query
/// </summary>
public class GetPreparationStateHandler : IRequestHandler<GetPreparationStateQuery, PreparationState>
{
    private readonly IMachineOrchestrator _orchestrator;

    public GetPreparationStateHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<PreparationState> Handle(GetPreparationStateQuery request, CancellationToken cancellationToken)
    {
        var state = await _orchestrator.GetStateAsync();

        // Get actual state from physical state tracker
        var physicalState = _orchestrator.PhysicalState;

        return new PreparationState
        {
            IsGonyeCompleted = physicalState.IsGonyeCompleted,
            CurrentStage = physicalState.CurrentStage,
            IsPartClamped = state.Sensors.S1PressureBar > 30, // Rough estimate based on pressure
            IsPartZeroed = false, // Would need additional tracking for this
            IsReadyForBending = state.SystemReady && physicalState.IsGonyeCompleted
        };
    }
}
