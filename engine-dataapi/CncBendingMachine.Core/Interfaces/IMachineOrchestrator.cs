using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Models;

namespace CncBendingMachine.Core.Interfaces;

/// <summary>
/// Machine Orchestrator - the "Driver Layer" that coordinates all machine operations
/// This is the central brain that:
/// - Validates commands against current state
/// - Manages valve sequences
/// - Enforces safety rules (C# side double-check)
/// - Coordinates multi-step operations
/// - Tracks machine state
/// - Tracks physical positions (Gonye + Stage offsets)
/// </summary>
public interface IMachineOrchestrator
{
    /// <summary>
    /// Current machine state (cached, updated by polling)
    /// </summary>
    MachineState CurrentState { get; }

    /// <summary>
    /// Physical position state including Gonye and Stage offsets
    /// </summary>
    MachinePhysicalState PhysicalState { get; }

    /// <summary>
    /// Is the orchestrator ready to accept commands?
    /// </summary>
    bool IsReady { get; }

    /// <summary>
    /// Last error message
    /// </summary>
    string? LastError { get; }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /// <summary>
    /// Initialize orchestrator with settings from database
    /// </summary>
    Task InitializeAsync();

    /// <summary>
    /// Get cached gonye settings
    /// </summary>
    GonyeSettings? GetGonyeSettings();

    /// <summary>
    /// Get cached stages
    /// </summary>
    IReadOnlyList<Stage>? GetStages();

    /// <summary>
    /// Get stage by number
    /// </summary>
    Stage? GetStage(int stageNumber);

    // ============================================================
    // STATE MANAGEMENT
    // ============================================================

    /// <summary>
    /// Update internal state from PLC (called by polling service)
    /// </summary>
    Task UpdateStateAsync();

    // ============================================================
    // SYSTEM COMMANDS
    // ============================================================

    /// <summary>
    /// Set machine mode
    /// </summary>
    Task<OrchestratorResult> SetMachineModeAsync(MachineMode mode);

    /// <summary>
    /// Turn hydraulic motor ON/OFF (handles 3-second startup delay)
    /// </summary>
    Task<OrchestratorResult> SetHydraulicMotorAsync(bool turnOn);

    /// <summary>
    /// Turn fan ON/OFF
    /// </summary>
    Task<OrchestratorResult> SetFanAsync(bool turnOn);

    /// <summary>
    /// Control alarm
    /// </summary>
    Task<OrchestratorResult> SetAlarmAsync(bool turnOn);

    // ============================================================
    // PISTON COMMANDS
    // ============================================================

    /// <summary>
    /// Execute piston jog (validates: motor ready, valve sequence)
    /// </summary>
    Task<OrchestratorResult> ExecutePistonJogAsync(PistonId piston, int direction, int speedPercent);

    /// <summary>
    /// Execute piston move to position
    /// </summary>
    Task<OrchestratorResult> ExecutePistonMoveToPositionAsync(PistonId piston, double positionMm, int speedPercent);

    /// <summary>
    /// Execute piston move to pressure
    /// </summary>
    /// <param name="direction">-1=Back, 1=Forward</param>
    Task<OrchestratorResult> ExecutePistonMoveToPressureAsync(PistonId piston, int direction, int pressureBar, int speedPercent);

    /// <summary>
    /// Stop piston
    /// </summary>
    Task<OrchestratorResult> ExecutePistonStopAsync(PistonId piston);

    // ============================================================
    // ROTATION COMMANDS
    // ============================================================

    /// <summary>
    /// Execute rotation jog (validates: motor ready, both valves, extra valves)
    /// </summary>
    Task<OrchestratorResult> ExecuteRotationJogAsync(int direction, int speedPercent);

    /// <summary>
    /// Execute rotation move to position (mm)
    /// </summary>
    Task<OrchestratorResult> ExecuteRotationMoveToPositionAsync(int positionMm, int speedPercent);

    /// <summary>
    /// Execute rotation move by distance
    /// </summary>
    /// <param name="direction">-1=CCW, 1=CW</param>
    /// <param name="distanceMm">Distance in mm (always positive)</param>
    Task<OrchestratorResult> ExecuteRotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent);

    /// <summary>
    /// Stop rotation
    /// </summary>
    Task<OrchestratorResult> ExecuteRotationStopAsync();

    // ============================================================
    // PNEUMATIC COMMANDS
    // ============================================================

    /// <summary>
    /// Control pneumatic cylinder
    /// </summary>
    Task<OrchestratorResult> ExecutePneumaticControlAsync(PistonId side, int direction);

    /// <summary>
    /// Stop pneumatic cylinder
    /// </summary>
    Task<OrchestratorResult> ExecutePneumaticStopAsync(PistonId side);

    // ============================================================
    // EMERGENCY
    // ============================================================

    /// <summary>
    /// Emergency stop all movements (C# side)
    /// </summary>
    Task<OrchestratorResult> EmergencyStopAsync();

    // ============================================================
    // STATE QUERIES
    // ============================================================

    /// <summary>
    /// Get current machine state (fresh read)
    /// </summary>
    Task<MachineState> GetStateAsync();

    // ============================================================
    // ENCODER OPERATIONS
    // ============================================================

    /// <summary>
    /// Reset all encoders (used during Gönye operation)
    /// </summary>
    Task<OrchestratorResult> ResetEncodersAsync();

    /// <summary>
    /// Reset only rotation encoder (used during Part Zero operation)
    /// </summary>
    Task<OrchestratorResult> ResetRotationEncoderAsync();

    /// <summary>
    /// Reset specific encoders by bitmask
    /// bit0=Right/Left, bit1=Upper/Lower, bit2=Pneumatics, bit3=Rotation
    /// </summary>
    Task<OrchestratorResult> ResetEncodersByMaskAsync(int bitmask);

    // ============================================================
    // PARALLEL PISTON MOVEMENT
    // ============================================================

    /// <summary>
    /// Move multiple pistons to positions simultaneously
    /// </summary>
    Task<OrchestratorResult> ExecuteParallelPistonMoveAsync(
        Dictionary<PistonId, double> targets,
        int speedPercent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Wait for specified pistons to reach their target positions
    /// </summary>
    Task<OrchestratorResult> WaitForPistonsInPositionAsync(
        PistonId[] pistons,
        CancellationToken cancellationToken = default,
        int timeoutMs = 60000);

    /// <summary>
    /// Wait for single piston to reach target position
    /// </summary>
    Task<OrchestratorResult> WaitForPistonInPositionAsync(
        PistonId piston,
        CancellationToken cancellationToken = default,
        int timeoutMs = 60000);

    // ============================================================
    // GONYE (REFERENCE) OPERATIONS
    // ============================================================

    /// <summary>
    /// Mark gonye process as completed and save ACTUAL offsets
    /// Called after pistons reach gonye positions and encoders are zeroed
    /// </summary>
    /// <param name="leftOffset">Actual encoder reading for Left piston at gonye position</param>
    /// <param name="rightOffset">Actual encoder reading for Right piston at gonye position</param>
    /// <param name="upperOffset">Actual encoder reading for Upper piston at gonye position</param>
    /// <param name="lowerOffset">Actual encoder reading for Lower piston at gonye position</param>
    void SetGonyeCompleted(double leftOffset, double rightOffset, double upperOffset, double lowerOffset);

    // ============================================================
    // STAGE OPERATIONS
    // ============================================================

    /// <summary>
    /// Mark stage change as completed and save ACTUAL offsets
    /// Called after pistons reach stage positions and encoders are zeroed
    /// </summary>
    /// <param name="stageNumber">Stage number (1, 2, or 3)</param>
    /// <param name="leftOffset">Actual encoder reading for Left piston at stage position</param>
    /// <param name="rightOffset">Actual encoder reading for Right piston at stage position</param>
    /// <param name="lowerOffset">Actual encoder reading for Lower piston at stage position</param>
    OrchestratorResult SetStageCompleted(int stageNumber, double leftOffset, double rightOffset, double lowerOffset);

    /// <summary>
    /// Calculate movement needed to go from current stage to target stage
    /// </summary>
    Dictionary<PistonId, double>? CalculateStageMovement(int targetStageNumber);

    // ============================================================
    // PHYSICAL POSITION QUERIES
    // ============================================================

    /// <summary>
    /// Get safe backward limit for a piston (for passive piston retraction during bending)
    /// </summary>
    double GetSafeBackwardLimit(PistonId piston);

    /// <summary>
    /// Get safe forward limit for a piston
    /// </summary>
    double GetSafeForwardLimit(PistonId piston);

    /// <summary>
    /// Get physical position of a piston (including Gonye + Stage offsets)
    /// </summary>
    double GetPhysicalPosition(PistonId piston);

    /// <summary>
    /// Check if a target position is within safe limits
    /// </summary>
    bool IsPositionSafe(PistonId piston, double targetEncoderMm);

    /// <summary>
    /// Clamp target position to safe limits
    /// </summary>
    double ClampToSafeLimits(PistonId piston, double targetEncoderMm);

    // ============================================================
    // SLPIS SENSOR
    // ============================================================

    /// <summary>
    /// Zero (tare) the SLPIS sensor - current mm value becomes the zero reference
    /// </summary>
    void ZeroSlpisSensor();

    /// <summary>
    /// Clear the SLPIS sensor zero reference - show raw mm values again
    /// </summary>
    void ClearSlpisSensorZero();

    /// <summary>
    /// Set a manual zero offset for the SLPIS sensor (mm)
    /// </summary>
    void SetSlpisZeroOffset(double offsetMm);

    // ============================================================
    // SPRINGBACK MEASUREMENT
    // ============================================================

    /// <summary>
    /// Start springback measurement on specified side
    /// </summary>
    /// <param name="side">1=Right, -1=Left</param>
    /// <param name="increaseThresholdMm">Increase threshold in mm (default 0.2)</param>
    /// <param name="minThresholdMm">Above-minimum threshold in mm (default 0.1)</param>
    /// <param name="stableTimeMs">Stable time in ms (default 500)</param>
    Task<OrchestratorResult> ExecuteSpringbackStartAsync(int side, double increaseThresholdMm = 0.2, double minThresholdMm = 0.1, int stableTimeMs = 500);

    /// <summary>
    /// Stop/cancel springback measurement
    /// </summary>
    Task<OrchestratorResult> ExecuteSpringbackStopAsync();

    /// <summary>
    /// Set springback detection thresholds (without starting measurement)
    /// </summary>
    Task<OrchestratorResult> ExecuteSetSpringbackThresholdsAsync(double increaseThresholdMm, double minThresholdMm, int stableTimeMs);
}

/// <summary>
/// Result from orchestrator operations
/// </summary>
public class OrchestratorResult
{
    public bool Success { get; private set; }
    public string? Error { get; private set; }
    public string? Message { get; private set; }

    private OrchestratorResult(bool success, string? error = null, string? message = null)
    {
        Success = success;
        Error = error;
        Message = message;
    }

    public static OrchestratorResult Ok(string? message = null) => new(true, null, message);
    public static OrchestratorResult Fail(string error) => new(false, error);
}
