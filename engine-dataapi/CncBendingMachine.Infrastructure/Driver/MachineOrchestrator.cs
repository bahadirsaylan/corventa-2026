using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Infrastructure.Driver;

/// <summary>
/// Machine Orchestrator - the "Driver Layer" that coordinates all machine operations
///
/// Responsibilities:
/// 1. Validate commands against current state (safety double-check in C#)
/// 2. Manage valve sequences (open valve -> wait -> apply voltage)
/// 3. Enforce safety rules (motor ready, emergency stop, etc.)
/// 4. Coordinate multi-step operations
/// 5. Cache and track machine state
/// 6. Track physical positions (Gonye + Stage offsets)
/// </summary>
public class MachineOrchestrator : IMachineOrchestrator
{
    private readonly ILogger<MachineOrchestrator> _logger;
    private readonly IPlcDriver _plcDriver;
    private readonly IMachineSettingsRepository? _settingsRepository;
    private MachineState _currentState = new();
    private readonly object _stateLock = new();

    // Physical position tracking (includes Gonye + Stage offsets)
    private MachinePhysicalState _physicalState = new();
    private bool _isInitialized = false;

    // SLPIS sensor zero (tare) tracking
    private double _slpisZeroOffsetMm;
    private bool _slpisZeroed;

    // Cached settings from DB
    private MachineSettings? _machineSettings;
    private GonyeSettings? _gonyeSettings;
    private IReadOnlyList<Stage>? _stages;

    public MachineState CurrentState
    {
        get { lock (_stateLock) { return _currentState; } }
    }

    /// <summary>
    /// Physical position state including Gonye and Stage offsets
    /// </summary>
    public MachinePhysicalState PhysicalState
    {
        get { lock (_stateLock) { return _physicalState; } }
    }

    public bool IsReady => _plcDriver.IsConnected && _currentState.SystemReady;
    public string? LastError { get; private set; }

    // Constructor without repository (for backward compatibility)
    public MachineOrchestrator(ILogger<MachineOrchestrator> logger, IPlcDriver plcDriver)
    {
        _logger = logger;
        _plcDriver = plcDriver;
        _settingsRepository = null;
    }

    // Constructor with repository (preferred)
    public MachineOrchestrator(
        ILogger<MachineOrchestrator> logger,
        IPlcDriver plcDriver,
        IMachineSettingsRepository settingsRepository)
    {
        _logger = logger;
        _plcDriver = plcDriver;
        _settingsRepository = settingsRepository;
    }

    /// <summary>
    /// Initialize orchestrator with settings from database
    /// Must be called before operations that need physical position tracking
    /// </summary>
    public async Task InitializeAsync()
    {
        if (_settingsRepository == null)
        {
            _logger.LogWarning("Settings repository not available, using defaults");
            _physicalState.InitializeFromSettings(422, 422, 161, 195, 1.0);
            _isInitialized = true;
            return;
        }

        try
        {
            _machineSettings = await _settingsRepository.GetMachineSettingsAsync();
            _gonyeSettings = await _settingsRepository.GetGonyeSettingsAsync();
            _stages = await _settingsRepository.GetAllStagesAsync();

            _physicalState.InitializeFromSettings(
                _machineSettings.LeftPistonStrokeMm,
                _machineSettings.RightPistonStrokeMm,
                _machineSettings.UpperPistonStrokeMm,
                _machineSettings.LowerPistonStrokeMm,
                _machineSettings.SafetyMarginMm
            );

            // SLPIS zero offset'i DB'den runtime'a yükle
            _slpisZeroOffsetMm = _machineSettings.SlpisZeroOffsetMm;
            _slpisZeroed = _slpisZeroOffsetMm > 0;
            if (_slpisZeroed)
                _logger.LogInformation("SLPIS zero offset DB'den yüklendi: {Offset:F3}mm", _slpisZeroOffsetMm);

            _isInitialized = true;
            _logger.LogInformation("Orchestrator initialized with settings from database");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize from database, using defaults");
            _physicalState.InitializeFromSettings(422, 422, 161, 195, 1.0);
            _isInitialized = true;
        }
    }

    /// <summary>
    /// Get cached gonye settings
    /// </summary>
    public GonyeSettings? GetGonyeSettings() => _gonyeSettings;

    /// <summary>
    /// Get cached stages
    /// </summary>
    public IReadOnlyList<Stage>? GetStages() => _stages;

    /// <summary>
    /// Get stage by number
    /// </summary>
    public Stage? GetStage(int stageNumber) => _stages?.FirstOrDefault(s => s.StageNumber == stageNumber);

    // ============================================================
    // STATE MANAGEMENT
    // ============================================================

    public async Task UpdateStateAsync()
    {
        try
        {
            var state = await _plcDriver.ReadMachineStateAsync();
            lock (_stateLock)
            {
                _currentState = state;
                // Update physical positions from encoder values
                _physicalState.UpdateFromMachineState(state);

                // Populate physical position info in MachineState for SignalR push
                PopulatePhysicalPositions(state);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update state from PLC");
        }
    }

    /// <summary>
    /// Populate physical position data in MachineState for SignalR push to UI
    /// </summary>
    private void PopulatePhysicalPositions(MachineState state)
    {
        // Physical Info (Gonye + Stage)
        state.PhysicalInfo.IsGonyeCompleted = _physicalState.IsGonyeCompleted;
        state.PhysicalInfo.CurrentStage = _physicalState.CurrentStage;
        state.PhysicalInfo.CurrentStageName = _physicalState.CurrentStage > 0
            ? GetStage(_physicalState.CurrentStage)?.Name
            : null;

        // Left Piston
        state.LeftPiston.PhysicalPositionMm = _physicalState.Left.PhysicalPositionMm;
        state.LeftPiston.GonyeOffsetMm = _physicalState.Left.GonyeOffsetMm;
        state.LeftPiston.StageOffsetMm = _physicalState.Left.StageOffsetMm;
        state.LeftPiston.SafeBackwardMm = _physicalState.Left.SafeBackwardEncoder;
        state.LeftPiston.SafeForwardMm = _physicalState.Left.SafeForwardEncoder;

        // Right Piston
        state.RightPiston.PhysicalPositionMm = _physicalState.Right.PhysicalPositionMm;
        state.RightPiston.GonyeOffsetMm = _physicalState.Right.GonyeOffsetMm;
        state.RightPiston.StageOffsetMm = _physicalState.Right.StageOffsetMm;
        state.RightPiston.SafeBackwardMm = _physicalState.Right.SafeBackwardEncoder;
        state.RightPiston.SafeForwardMm = _physicalState.Right.SafeForwardEncoder;

        // Upper Piston
        state.UpperPiston.PhysicalPositionMm = _physicalState.Upper.PhysicalPositionMm;
        state.UpperPiston.GonyeOffsetMm = _physicalState.Upper.GonyeOffsetMm;
        state.UpperPiston.StageOffsetMm = _physicalState.Upper.StageOffsetMm;
        state.UpperPiston.SafeBackwardMm = _physicalState.Upper.SafeBackwardEncoder;
        state.UpperPiston.SafeForwardMm = _physicalState.Upper.SafeForwardEncoder;

        // Lower Piston
        state.LowerPiston.PhysicalPositionMm = _physicalState.Lower.PhysicalPositionMm;
        state.LowerPiston.GonyeOffsetMm = _physicalState.Lower.GonyeOffsetMm;
        state.LowerPiston.StageOffsetMm = _physicalState.Lower.StageOffsetMm;
        state.LowerPiston.SafeBackwardMm = _physicalState.Lower.SafeBackwardEncoder;
        state.LowerPiston.SafeForwardMm = _physicalState.Lower.SafeForwardEncoder;

        // SLPIS Sensor enrichment
        state.SlpisSensorMm = state.SlpisSensorRaw * 0.004; // GT-5112: 1 pulse = 4 mikron
        state.SlpisSensorEffectiveMm = state.SlpisSensorMm - _slpisZeroOffsetMm;
        state.SlpisSensorZeroed = _slpisZeroed;
    }

    // ============================================================
    // VALIDATION HELPERS
    // ============================================================

    private OrchestratorResult ValidateSystemReady()
    {
        if (!_plcDriver.IsConnected)
            return OrchestratorResult.Fail("PLC bağlantısı yok");

        if (_currentState.ErrorCode != ErrorCode.NoError)
            return OrchestratorResult.Fail($"Sistem hatası: {_currentState.ErrorCode}");

        if (!_currentState.Safety.EmergencyStopOK)
            return OrchestratorResult.Fail("Acil durdurma aktif!");

        if (!_currentState.Safety.MotorThermalOK)
            return OrchestratorResult.Fail("Motor termal hatası!");

        if (!_currentState.Safety.PhaseSequenceOK)
            return OrchestratorResult.Fail("Faz sırası hatası!");

        return OrchestratorResult.Ok();
    }

    private OrchestratorResult ValidateMotorReady()
    {
        var systemCheck = ValidateSystemReady();
        if (!systemCheck.Success) return systemCheck;

        if (_currentState.HydraulicMotorState != 2)
            return OrchestratorResult.Fail("Hidrolik motor hazır değil (3 saniye beklenmeli)");

        return OrchestratorResult.Ok();
    }

    /// <summary>
    /// Only validates safety inputs - used for motor start
    /// Does NOT check error code (to avoid chicken-egg with error 14)
    /// </summary>
    private OrchestratorResult ValidateSafetyOnly()
    {
        if (!_plcDriver.IsConnected)
            return OrchestratorResult.Fail("PLC bağlantısı yok");

        if (!_currentState.Safety.EmergencyStopOK)
            return OrchestratorResult.Fail("Acil durdurma aktif!");

        if (!_currentState.Safety.MotorThermalOK)
            return OrchestratorResult.Fail("Motor termal hatası!");

        if (!_currentState.Safety.PhaseSequenceOK)
            return OrchestratorResult.Fail("Faz sırası hatası!");

        return OrchestratorResult.Ok();
    }

    private OrchestratorResult ValidateSpeedPercent(int speedPercent)
    {
        if (speedPercent < 0 || speedPercent > 100)
            return OrchestratorResult.Fail($"Hız yüzdesi 0-100 arasında olmalı: {speedPercent}");

        return OrchestratorResult.Ok();
    }

    private OrchestratorResult ValidatePistonPosition(PistonId piston, double positionMm)
    {
        // Use physical tracker for safe limits (supports negative values for passive piston retraction)
        var tracker = _physicalState.GetTracker(piston);

        // Check against physical safe limits
        // Add small tolerance (0.01mm) to handle floating point precision issues
        const double TOLERANCE = 0.01;
        double safeBackward = tracker.SafeBackwardEncoder;
        double safeForward = tracker.SafeForwardEncoder;

        if (positionMm < safeBackward - TOLERANCE)
            return OrchestratorResult.Fail($"Pozisyon güvenli geri sınırın ({safeBackward:F2}mm) altında: {positionMm:F2}mm");

        if (positionMm > safeForward + TOLERANCE)
            return OrchestratorResult.Fail($"Pozisyon güvenli ileri sınırın ({safeForward:F2}mm) üstünde: {positionMm:F2}mm");

        return OrchestratorResult.Ok();
    }

    // ============================================================
    // SYSTEM COMMANDS
    // ============================================================

    public async Task<OrchestratorResult> SetMachineModeAsync(MachineMode mode)
    {
        _logger.LogInformation("SetMachineMode: {Mode}", mode);

        var systemCheck = ValidateSystemReady();
        if (!systemCheck.Success && mode != MachineMode.Manual)
        {
            // Only allow switching to Manual mode when system has errors
            return systemCheck;
        }

        try
        {
            await _plcDriver.SetMachineModeAsync(mode);
            return OrchestratorResult.Ok($"Mod değiştirildi: {mode}");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SetMachineMode failed");
            return OrchestratorResult.Fail($"Mod değiştirme hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> SetHydraulicMotorAsync(bool turnOn)
    {
        _logger.LogInformation("SetHydraulicMotor: {TurnOn}", turnOn);

        if (turnOn)
        {
            // Motor start only needs safety checks, NOT full system ready
            // (because motor not running causes error 14, which would block motor start)
            var safetyCheck = ValidateSafetyOnly();
            if (!safetyCheck.Success) return safetyCheck;
        }

        try
        {
            await _plcDriver.SetHydraulicMotorAsync(turnOn);

            if (turnOn)
            {
                return OrchestratorResult.Ok("Hidrolik motor başlatıldı. 3 saniye bekleyin...");
            }
            else
            {
                return OrchestratorResult.Ok("Hidrolik motor kapatıldı");
            }
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SetHydraulicMotor failed");
            return OrchestratorResult.Fail($"Motor kontrol hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> SetFanAsync(bool turnOn)
    {
        _logger.LogInformation("SetFan: {TurnOn}", turnOn);

        if (turnOn && !_currentState.Safety.FanThermalOK)
        {
            return OrchestratorResult.Fail("Fan termal hatası - fan çalıştırılamaz");
        }

        try
        {
            await _plcDriver.SetFanAsync(turnOn);
            return OrchestratorResult.Ok(turnOn ? "Fan açıldı" : "Fan kapatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SetFan failed");
            return OrchestratorResult.Fail($"Fan kontrol hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> SetAlarmAsync(bool turnOn)
    {
        _logger.LogInformation("SetAlarm: {TurnOn}", turnOn);

        try
        {
            await _plcDriver.SetAlarmAsync(turnOn);
            return OrchestratorResult.Ok(turnOn ? "Alarm aktif" : "Alarm kapatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SetAlarm failed");
            return OrchestratorResult.Fail($"Alarm kontrol hatası: {ex.Message}");
        }
    }

    // ============================================================
    // PISTON COMMANDS
    // ============================================================

    public async Task<OrchestratorResult> ExecutePistonJogAsync(PistonId piston, int direction, int speedPercent)
    {
        _logger.LogInformation("PistonJog: {Piston}, dir={Direction}, speed={Speed}%", piston, direction, speedPercent);

        // Validate
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        if (direction < -1 || direction > 1)
            return OrchestratorResult.Fail("Yön -1, 0 veya 1 olmalı");

        try
        {
            // PLC handles valve opening automatically via PRG_Main
            await _plcDriver.PistonJogAsync(piston, direction, speedPercent);
            return OrchestratorResult.Ok($"{piston} piston jog başlatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PistonJog failed");
            return OrchestratorResult.Fail($"Piston jog hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecutePistonMoveToPositionAsync(PistonId piston, double positionMm, int speedPercent)
    {
        _logger.LogInformation("PistonMoveToPosition: {Piston}, pos={Position}mm, speed={Speed}%", piston, positionMm, speedPercent);

        // Validate
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        var posCheck = ValidatePistonPosition(piston, positionMm);
        if (!posCheck.Success) return posCheck;

        try
        {
            await _plcDriver.PistonMoveToPositionAsync(piston, positionMm, speedPercent);
            return OrchestratorResult.Ok($"{piston} piston {positionMm}mm konumuna hareket başlatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PistonMoveToPosition failed");
            return OrchestratorResult.Fail($"Piston konum hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecutePistonMoveToPressureAsync(PistonId piston, int direction, int pressureBar, int speedPercent)
    {
        _logger.LogInformation("PistonMoveToPressure: {Piston}, dir={Direction}, pressure={Pressure}bar, speed={Speed}%", piston, direction, pressureBar, speedPercent);

        // Validate
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        if (direction != -1 && direction != 1)
            return OrchestratorResult.Fail("Yön -1 (Geri) veya 1 (İleri) olmalı");

        if (pressureBar < 0 || pressureBar > 250)
            return OrchestratorResult.Fail($"Basınç 0-250 bar arasında olmalı: {pressureBar}");

        try
        {
            await _plcDriver.PistonMoveToPressureAsync(piston, direction, pressureBar, speedPercent);
            string dirStr = direction == 1 ? "ileri" : "geri";
            return OrchestratorResult.Ok($"{piston} piston {dirStr} yönde {pressureBar}bar basınca hareket başlatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PistonMoveToPressure failed");
            return OrchestratorResult.Fail($"Piston basınç hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecutePistonStopAsync(PistonId piston)
    {
        _logger.LogInformation("PistonStop: {Piston}", piston);

        try
        {
            await _plcDriver.PistonStopAsync(piston);
            return OrchestratorResult.Ok($"{piston} piston durduruldu");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PistonStop failed");
            return OrchestratorResult.Fail($"Piston durdurma hatası: {ex.Message}");
        }
    }

    // ============================================================
    // ROTATION COMMANDS
    // ============================================================

    public async Task<OrchestratorResult> ExecuteRotationJogAsync(int direction, int speedPercent)
    {
        _logger.LogInformation("RotationJog: dir={Direction}, speed={Speed}%", direction, speedPercent);

        // Validate
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        if (direction < -1 || direction > 1)
            return OrchestratorResult.Fail("Yön -1 (CCW), 0 (Dur) veya 1 (CW) olmalı");

        try
        {
            // PLC handles valve sequence (S1+S2+ExtraValves)
            await _plcDriver.RotationJogAsync(direction, speedPercent);

            string dirStr = direction switch
            {
                1 => "CW (saat yönü)",
                -1 => "CCW (saat yönü tersi)",
                _ => "durduruldu"
            };

            return OrchestratorResult.Ok($"Rotasyon {dirStr}");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "RotationJog failed");
            return OrchestratorResult.Fail($"Rotasyon jog hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecuteRotationMoveToPositionAsync(int positionMm, int speedPercent)
    {
        _logger.LogInformation("RotationMoveToPosition: pos={Position}mm, speed={Speed}%", positionMm, speedPercent);

        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        // Note: Negative positions are VALID!
        // CW direction decreases encoder, CCW increases
        // So positions can be negative (CW from zero)

        try
        {
            await _plcDriver.RotationMoveToPositionAsync(positionMm, speedPercent);
            return OrchestratorResult.Ok($"Rotasyon {positionMm}mm konumuna hareket başlatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "RotationMoveToPosition failed");
            return OrchestratorResult.Fail($"Rotasyon konum hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecuteRotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent)
    {
        _logger.LogInformation("RotationMoveDistance: dir={Direction}, dist={Distance}mm, speed={Speed}%", direction, distanceMm, speedPercent);

        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        if (direction != -1 && direction != 1)
            return OrchestratorResult.Fail("Yön -1 (CCW) veya 1 (CW) olmalı");

        if (distanceMm <= 0)
            return OrchestratorResult.Fail($"Mesafe pozitif olmalı: {distanceMm}mm");

        try
        {
            await _plcDriver.RotationMoveDistanceAsync(direction, distanceMm, speedPercent);
            string dirStr = direction == 1 ? "CW" : "CCW";
            return OrchestratorResult.Ok($"Rotasyon {dirStr} yönde {distanceMm}mm mesafe hareketi başlatıldı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "RotationMoveDistance failed");
            return OrchestratorResult.Fail($"Rotasyon mesafe hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecuteRotationStopAsync()
    {
        _logger.LogInformation("RotationStop");

        try
        {
            await _plcDriver.RotationStopAsync();
            return OrchestratorResult.Ok("Rotasyon durduruldu");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "RotationStop failed");
            return OrchestratorResult.Fail($"Rotasyon durdurma hatası: {ex.Message}");
        }
    }

    // ============================================================
    // PNEUMATIC COMMANDS
    // ============================================================

    public async Task<OrchestratorResult> ExecutePneumaticControlAsync(PistonId side, int direction)
    {
        _logger.LogInformation("PneumaticControl: {Side}, dir={Direction}", side, direction);

        if (side != PistonId.Right && side != PistonId.Left)
            return OrchestratorResult.Fail("Pnömatik tarafı Right veya Left olmalı");

        if (direction < -1 || direction > 1)
            return OrchestratorResult.Fail("Yön -1 (Geri), 0 (Dur) veya 1 (İleri) olmalı");

        // Pneumatics don't require motor to be running (compressed air)
        var systemCheck = ValidateSystemReady();
        if (!systemCheck.Success) return systemCheck;

        try
        {
            await _plcDriver.PneumaticControlAsync(side, direction);

            string dirStr = direction switch
            {
                1 => "ileri",
                -1 => "geri",
                _ => "durduruldu"
            };

            return OrchestratorResult.Ok($"{side} pnömatik {dirStr}");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PneumaticControl failed");
            return OrchestratorResult.Fail($"Pnömatik kontrol hatası: {ex.Message}");
        }
    }

    public async Task<OrchestratorResult> ExecutePneumaticStopAsync(PistonId side)
    {
        _logger.LogInformation("PneumaticStop: {Side}", side);

        if (side != PistonId.Right && side != PistonId.Left)
            return OrchestratorResult.Fail("Pnömatik tarafı Right veya Left olmalı");

        try
        {
            await _plcDriver.PneumaticStopAsync(side);
            return OrchestratorResult.Ok($"{side} pnömatik durduruldu");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "PneumaticStop failed");
            return OrchestratorResult.Fail($"Pnömatik durdurma hatası: {ex.Message}");
        }
    }

    // ============================================================
    // STATE QUERIES
    // ============================================================

    public async Task<MachineState> GetStateAsync()
    {
        await UpdateStateAsync();
        return CurrentState;
    }

    // ============================================================
    // ENCODER OPERATIONS
    // ============================================================

    // Encoder bitmask constants
    private const int ENCODER_RIGHT_LEFT = 0x01;    // bit0: Sağ/Sol pistonlar
    private const int ENCODER_UPPER_LOWER = 0x02;   // bit1: Üst/Alt pistonlar
    private const int ENCODER_PNEUMATICS = 0x04;    // bit2: Pnömatikler
    private const int ENCODER_ROTATION = 0x08;      // bit3: Rotasyon
    private const int ENCODER_ALL = 0x0F;           // Hepsi

    public async Task<OrchestratorResult> ResetEncodersAsync()
    {
        _logger.LogInformation("Resetting all encoders");

        try
        {
            await _plcDriver.ResetEncodersAsync();
            return OrchestratorResult.Ok("Tüm encoder'lar sıfırlandı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "ResetEncoders failed");
            return OrchestratorResult.Fail($"Encoder sıfırlama hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset only rotation encoder (for part zeroing)
    /// </summary>
    public async Task<OrchestratorResult> ResetRotationEncoderAsync()
    {
        _logger.LogInformation("Resetting rotation encoder only");

        try
        {
            await _plcDriver.ResetEncoderAsync(ENCODER_ROTATION);
            await Task.Delay(500); // Wait for PLC state machine
            await _plcDriver.ResetEncoderAsync(0); // Clear command
            return OrchestratorResult.Ok("Rotasyon encoder'ı sıfırlandı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "ResetRotationEncoder failed");
            return OrchestratorResult.Fail($"Rotasyon encoder sıfırlama hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Reset specific encoders by bitmask
    /// bit0=Right/Left, bit1=Upper/Lower, bit2=Pneumatics, bit3=Rotation
    /// </summary>
    public async Task<OrchestratorResult> ResetEncodersByMaskAsync(int bitmask)
    {
        _logger.LogInformation("Resetting encoders with bitmask: 0x{Mask:X2}", bitmask);

        try
        {
            await _plcDriver.ResetEncoderAsync(bitmask);
            await Task.Delay(500); // Wait for PLC state machine
            await _plcDriver.ResetEncoderAsync(0); // Clear command
            return OrchestratorResult.Ok($"Encoder'lar sıfırlandı (mask: 0x{bitmask:X2})");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "ResetEncodersByMask failed");
            return OrchestratorResult.Fail($"Encoder sıfırlama hatası: {ex.Message}");
        }
    }

    // ============================================================
    // EMERGENCY
    // ============================================================

    public async Task<OrchestratorResult> EmergencyStopAsync()
    {
        _logger.LogWarning("EMERGENCY STOP triggered from C#");

        try
        {
            // Stop springback measurement FIRST (overrides piston control in PLC)
            await _plcDriver.SpringbackStopAsync();

            // Stop all movements
            await _plcDriver.PistonStopAsync(PistonId.Right);
            await _plcDriver.PistonStopAsync(PistonId.Left);
            await _plcDriver.PistonStopAsync(PistonId.Upper);
            await _plcDriver.PistonStopAsync(PistonId.Lower);
            await _plcDriver.RotationStopAsync();
            await _plcDriver.PneumaticStopAsync(PistonId.Right);
            await _plcDriver.PneumaticStopAsync(PistonId.Left);

            // Turn on alarm
            await _plcDriver.SetAlarmAsync(true);

            return OrchestratorResult.Ok("ACİL DURDURMA - Tüm hareketler durduruldu");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "EmergencyStop failed");
            return OrchestratorResult.Fail($"Acil durdurma hatası: {ex.Message}");
        }
    }

    // ============================================================
    // PARALLEL PISTON MOVEMENT
    // ============================================================

    /// <summary>
    /// Move multiple pistons to positions simultaneously
    /// </summary>
    public async Task<OrchestratorResult> ExecuteParallelPistonMoveAsync(
        Dictionary<PistonId, double> targets,
        int speedPercent,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("ParallelPistonMove: {Targets} at {Speed}%",
            string.Join(", ", targets.Select(t => $"{t.Key}={t.Value}mm")), speedPercent);

        // Validate
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        var speedCheck = ValidateSpeedPercent(speedPercent);
        if (!speedCheck.Success) return speedCheck;

        // Validate all positions
        foreach (var target in targets)
        {
            var posCheck = ValidatePistonPosition(target.Key, target.Value);
            if (!posCheck.Success) return posCheck;
        }

        try
        {
            // Send commands to all pistons simultaneously
            var tasks = targets.Select(t =>
                _plcDriver.PistonMoveToPositionAsync(t.Key, t.Value, speedPercent)
            ).ToList();

            await Task.WhenAll(tasks);

            // Wait for all pistons to reach positions
            return await WaitForPistonsInPositionAsync(targets.Keys.ToArray(), cancellationToken);
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "ParallelPistonMove failed");
            return OrchestratorResult.Fail($"Paralel hareket hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Wait for specified pistons to reach their target positions
    /// </summary>
    public async Task<OrchestratorResult> WaitForPistonsInPositionAsync(
        PistonId[] pistons,
        CancellationToken cancellationToken = default,
        int timeoutMs = 60000)
    {
        var startTime = DateTime.UtcNow;

        // PHASE 1: PLC'nin yeni komutu işlemesini bekle.
        // Yeni komut gönderildiğinde PLC InPosition'ı false yapana kadar bekle (max 500ms).
        // Bu olmadan önceki komutun InPosition=true'su okunup hemen dönülüyordu!
        var latchTimeout = DateTime.UtcNow.AddMilliseconds(500);
        bool sawNotInPosition = false;

        while (DateTime.UtcNow < latchTimeout && !cancellationToken.IsCancellationRequested)
        {
            await UpdateStateAsync();

            bool anyMovingOrNotInPos = false;
            foreach (var piston in pistons)
            {
                var ps = GetPistonState(piston);
                if (ps != null && (!ps.InPosition || ps.Moving))
                {
                    anyMovingOrNotInPos = true;
                    break;
                }
            }

            if (anyMovingOrNotInPos)
            {
                sawNotInPosition = true;
                break; // PLC yeni komutu aldı, InPosition false oldu → Phase 2'ye geç
            }

            await Task.Delay(20, cancellationToken); // 20ms hızlı polling
        }

        // PLC 500ms içinde InPosition=false yapmadıysa, zaten hedefteyiz demektir
        if (!sawNotInPosition)
        {
            _logger.LogDebug("WaitForPistons: InPosition zaten true, piston muhtemelen hedefteydi");
            return OrchestratorResult.Ok("Pistonlar zaten hedette");
        }

        // PHASE 2: Pistonun hedefe ulaşmasını bekle (eski mantık)
        while (!cancellationToken.IsCancellationRequested)
        {
            await UpdateStateAsync();

            bool allInPosition = true;
            foreach (var piston in pistons)
            {
                var ps = GetPistonState(piston);
                if (ps == null || !ps.InPosition)
                {
                    allInPosition = false;
                    break;
                }
            }

            if (allInPosition)
            {
                return OrchestratorResult.Ok("Tüm pistonlar hedefe ulaştı");
            }

            if ((DateTime.UtcNow - startTime).TotalMilliseconds > timeoutMs)
            {
                return OrchestratorResult.Fail("Zaman aşımı - pistonlar hedefe ulaşamadı");
            }

            await Task.Delay(100, cancellationToken);
        }

        cancellationToken.ThrowIfCancellationRequested();
        return OrchestratorResult.Fail("İşlem iptal edildi");
    }

    private PistonState? GetPistonState(PistonId piston)
    {
        return piston switch
        {
            PistonId.Right => _currentState.RightPiston,
            PistonId.Left => _currentState.LeftPiston,
            PistonId.Upper => _currentState.UpperPiston,
            PistonId.Lower => _currentState.LowerPiston,
            _ => null
        };
    }

    /// <summary>
    /// Wait for single piston to reach target position
    /// </summary>
    public async Task<OrchestratorResult> WaitForPistonInPositionAsync(
        PistonId piston,
        CancellationToken cancellationToken = default,
        int timeoutMs = 60000)
    {
        return await WaitForPistonsInPositionAsync(new[] { piston }, cancellationToken, timeoutMs);
    }

    // ============================================================
    // GONYE (REFERENCE) OPERATIONS
    // ============================================================

    /// <summary>
    /// Mark gonye process as completed and save ACTUAL offsets
    /// Called after pistons reach gonye positions and encoders are zeroed
    /// Uses ACTUAL encoder readings (not DB config values) for accuracy
    /// </summary>
    public void SetGonyeCompleted(double leftOffset, double rightOffset, double upperOffset, double lowerOffset)
    {
        _logger.LogInformation("SetGonyeCompleted called with ACTUAL encoder values: Left={Left}mm, Right={Right}mm, Upper={Upper}mm, Lower={Lower}mm",
            leftOffset, rightOffset, upperOffset, lowerOffset);

        _physicalState.SetGonyeCompleted(leftOffset, rightOffset, upperOffset, lowerOffset);

        _logger.LogInformation("Gonye completed. Physical positions: Left={Left}mm, Right={Right}mm, Upper={Upper}mm, Lower={Lower}mm",
            _physicalState.Left.PhysicalPositionMm,
            _physicalState.Right.PhysicalPositionMm,
            _physicalState.Upper.PhysicalPositionMm,
            _physicalState.Lower.PhysicalPositionMm);
    }

    // ============================================================
    // STAGE OPERATIONS
    // ============================================================

    /// <summary>
    /// Mark stage change as completed and save ACTUAL offsets
    /// Called after pistons reach stage positions and encoders are zeroed
    /// Uses ACTUAL encoder readings (not DB config values) for accuracy
    /// </summary>
    public OrchestratorResult SetStageCompleted(int stageNumber, double leftOffset, double rightOffset, double lowerOffset)
    {
        _logger.LogInformation("SetStageCompleted called for Stage {Stage} with ACTUAL encoder values: Left={Left}mm, Right={Right}mm, Lower={Lower}mm",
            stageNumber, leftOffset, rightOffset, lowerOffset);

        _physicalState.SetStageCompleted(stageNumber, leftOffset, rightOffset, lowerOffset);

        _logger.LogInformation("Stage {Stage} completed. Physical positions: Left={Left}mm, Right={Right}mm, Lower={Lower}mm",
            stageNumber,
            _physicalState.Left.PhysicalPositionMm,
            _physicalState.Right.PhysicalPositionMm,
            _physicalState.Lower.PhysicalPositionMm);

        return OrchestratorResult.Ok($"Stage {stageNumber} tamamlandı");
    }

    /// <summary>
    /// Calculate movement needed to go from current stage to target stage
    /// </summary>
    public Dictionary<PistonId, double>? CalculateStageMovement(int targetStageNumber)
    {
        var targetStage = GetStage(targetStageNumber);
        if (targetStage == null) return null;

        var currentStage = _physicalState.CurrentStage;
        var currentStageData = currentStage > 0 ? GetStage(currentStage) : null;

        // Calculate movement needed (target - current stage offset)
        double currentLeftOffset = currentStageData?.LeftOffsetMm ?? 0;
        double currentRightOffset = currentStageData?.RightOffsetMm ?? 0;
        double currentLowerOffset = currentStageData?.LowerOffsetMm ?? 0;

        return new Dictionary<PistonId, double>
        {
            [PistonId.Left] = targetStage.LeftOffsetMm - currentLeftOffset,
            [PistonId.Right] = targetStage.RightOffsetMm - currentRightOffset,
            [PistonId.Lower] = targetStage.LowerOffsetMm - currentLowerOffset
        };
    }

    // ============================================================
    // PHYSICAL POSITION QUERIES
    // ============================================================

    /// <summary>
    /// Get safe backward limit for a piston (for passive piston retraction during bending)
    /// </summary>
    public double GetSafeBackwardLimit(PistonId piston)
    {
        return _physicalState.GetTracker(piston).SafeBackwardEncoder;
    }

    /// <summary>
    /// Get safe forward limit for a piston
    /// </summary>
    public double GetSafeForwardLimit(PistonId piston)
    {
        return _physicalState.GetTracker(piston).SafeForwardEncoder;
    }

    /// <summary>
    /// Get physical position of a piston (including Gonye + Stage offsets)
    /// </summary>
    public double GetPhysicalPosition(PistonId piston)
    {
        return _physicalState.GetTracker(piston).PhysicalPositionMm;
    }

    /// <summary>
    /// Check if a target position is within safe limits
    /// </summary>
    public bool IsPositionSafe(PistonId piston, double targetEncoderMm)
    {
        return _physicalState.GetTracker(piston).IsPositionSafe(targetEncoderMm);
    }

    /// <summary>
    /// Clamp target position to safe limits
    /// </summary>
    public double ClampToSafeLimits(PistonId piston, double targetEncoderMm)
    {
        return _physicalState.GetTracker(piston).ClampToSafeLimits(targetEncoderMm);
    }

    // ============================================================
    // SLPIS SENSOR
    // ============================================================

    public void ZeroSlpisSensor()
    {
        lock (_stateLock)
        {
            double currentMm = _currentState.SlpisSensorRaw * 0.004; // GT-5112: 1 pulse = 4 mikron
            _slpisZeroOffsetMm = currentMm;
            _slpisZeroed = true;
            _logger.LogInformation("SLPIS sensor zeroed at {Offset:F3}mm", currentMm);
        }
    }

    public void ClearSlpisSensorZero()
    {
        lock (_stateLock)
        {
            _slpisZeroOffsetMm = 0;
            _slpisZeroed = false;
            _logger.LogInformation("SLPIS sensor zero cleared");
        }
    }

    public void SetSlpisZeroOffset(double offsetMm)
    {
        lock (_stateLock)
        {
            _slpisZeroOffsetMm = offsetMm;
            _slpisZeroed = true;
            _logger.LogInformation("SLPIS sensor manual zero offset set to {Offset:F3}mm", offsetMm);
        }
    }

    // ============================================================
    // SPRINGBACK MEASUREMENT
    // ============================================================

    /// <summary>
    /// Start springback measurement on specified side
    /// </summary>
    public async Task<OrchestratorResult> ExecuteSpringbackStartAsync(
        int side,
        double increaseThresholdMm = 0.2,
        double minThresholdMm = 0.1,
        int stableTimeMs = 500)
    {
        _logger.LogInformation("SpringbackStart: side={Side}, increase={Increase}mm, min={Min}mm, stable={Stable}ms",
            side == 1 ? "Right" : "Left", increaseThresholdMm, minThresholdMm, stableTimeMs);

        // Validate side
        if (side != 1 && side != -1)
        {
            return OrchestratorResult.Fail("Geçersiz taraf: 1=Sağ, -1=Sol olmalı");
        }

        // Validate motor ready
        var motorCheck = ValidateMotorReady();
        if (!motorCheck.Success) return motorCheck;

        // Check if springback is already active
        if (_currentState.Springback.IsMeasuring)
        {
            return OrchestratorResult.Fail("Springback ölçümü zaten aktif");
        }

        try
        {
            // First set thresholds
            await _plcDriver.SetSpringbackThresholdsAsync(increaseThresholdMm, minThresholdMm, stableTimeMs);

            // Start measurement
            await _plcDriver.SpringbackStartAsync(side);

            string sideStr = side == 1 ? "sağ" : "sol";
            return OrchestratorResult.Ok($"Springback ölçümü başlatıldı ({sideStr} taraf)");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SpringbackStart failed");
            return OrchestratorResult.Fail($"Springback başlatma hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Stop/cancel springback measurement
    /// </summary>
    public async Task<OrchestratorResult> ExecuteSpringbackStopAsync()
    {
        _logger.LogInformation("SpringbackStop");

        try
        {
            await _plcDriver.SpringbackStopAsync();
            return OrchestratorResult.Ok("Springback ölçümü durduruldu");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SpringbackStop failed");
            return OrchestratorResult.Fail($"Springback durdurma hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// Set springback detection thresholds (without starting measurement)
    /// </summary>
    public async Task<OrchestratorResult> ExecuteSetSpringbackThresholdsAsync(
        double increaseThresholdMm,
        double minThresholdMm,
        int stableTimeMs)
    {
        _logger.LogInformation("SetSpringbackThresholds: increase={Increase}mm, min={Min}mm, stable={Stable}ms",
            increaseThresholdMm, minThresholdMm, stableTimeMs);

        // Validate thresholds
        if (increaseThresholdMm <= 0 || minThresholdMm <= 0 || stableTimeMs <= 0)
        {
            return OrchestratorResult.Fail("Eşik değerleri pozitif olmalı");
        }

        try
        {
            await _plcDriver.SetSpringbackThresholdsAsync(increaseThresholdMm, minThresholdMm, stableTimeMs);
            return OrchestratorResult.Ok($"Springback eşikleri ayarlandı");
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            _logger.LogError(ex, "SetSpringbackThresholds failed");
            return OrchestratorResult.Fail($"Springback eşik ayar hatası: {ex.Message}");
        }
    }
}
