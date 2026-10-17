using CncBendingMachine.Core.Models;
using MediatR;

namespace CncBendingMachine.Application.Commands.Preparation;

/// <summary>
/// Command to execute Gönye (reference position) operation.
///
/// Process:
/// 1. All pistons retract to mechanical limit (until S1+S2 reach 70bar)
/// 2. All encoders are RESET at this reference point (MANDATORY)
/// 3. Pistons move to Gönye offset positions from the new zero reference
/// </summary>
public class ExecuteGonyeCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Lower piston offset from reference (mm) - default: 10.5
    /// This is the position AFTER encoder reset
    /// </summary>
    public double LowerPistonOffset { get; set; } = 10.5;

    /// <summary>
    /// Left piston offset from reference (mm) - default: 3.75
    /// This is the position AFTER encoder reset
    /// </summary>
    public double LeftPistonOffset { get; set; } = 3.75;

    /// <summary>
    /// Right piston offset from reference (mm) - default: 3.75
    /// This is the position AFTER encoder reset
    /// </summary>
    public double RightPistonOffset { get; set; } = 3.75;

    /// <summary>
    /// Pressure for retracting pistons (bar) - default: 70 bar
    /// Pistons retract until BOTH S1 AND S2 reach this pressure.
    /// First 500ms of pressure readings are ignored (startup spike).
    /// </summary>
    public int RetractPressureBar { get; set; } = 85;

    /// <summary>
    /// Speed percent for retraction (0-100)
    /// MUST BE 100% for retraction to mechanical limit!
    /// Lower speeds cause pressure buildup before reaching limit.
    /// </summary>
    public int SpeedPercent { get; set; } = 100;
}

/// <summary>
/// Command to change machine stage (height configuration)
/// </summary>
public class ChangeStageCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Target stage number (1, 2, or 3)
    /// </summary>
    public int TargetStage { get; set; }

    /// <summary>
    /// Speed percent for stage change movements
    /// </summary>
    public int SpeedPercent { get; set; } = 50;
}

/// <summary>
/// Command to clamp the work piece
/// Uses Upper piston to clamp against Lower piston
/// </summary>
public class ClampPartCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Target clamping pressure (bar) - 155 bar default to avoid crushing part
    /// </summary>
    public int PressureBar { get; set; } = 155;

    /// <summary>
    /// Speed percent for clamping movement - 30% (3V) to avoid crushing part
    /// </summary>
    public int SpeedPercent { get; set; } = 30;

    /// <summary>
    /// Wait for part presence sensor before clamping
    /// </summary>
    public bool WaitForPartSensor { get; set; } = true;

    /// <summary>
    /// Which sensor side to check (Left or Right)
    /// </summary>
    public string SensorSide { get; set; } = "Left";
}

/// <summary>
/// Command to release the clamped work piece
/// </summary>
public class ReleasePartCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Speed percent for release movement
    /// </summary>
    public int SpeedPercent { get; set; } = 50;

    /// <summary>
    /// Target position for upper piston after release (mm)
    /// 0 = fully retracted
    /// </summary>
    public double ReleasePositionMm { get; set; } = 0;
}

/// <summary>
/// Command to zero (reference) the work piece
/// References part to sensor and moves to start position
/// </summary>
public class ZeroPartCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Which sensor to reference (Left or Right)
    /// </summary>
    public string SensorSide { get; set; } = "Left";

    /// <summary>
    /// Reset distance from sensor to center (mm)
    /// </summary>
    public double ResetDistanceMm { get; set; } = 690;

    /// <summary>
    /// Safety margin at each end (mm)
    /// </summary>
    public double SafetyDistanceMm { get; set; } = 50;

    /// <summary>
    /// Fast approach speed percent
    /// </summary>
    public int FastSpeedPercent { get; set; } = 80;

    /// <summary>
    /// Slow approach speed percent (for precision)
    /// </summary>
    public int SlowSpeedPercent { get; set; } = 10;

    /// <summary>
    /// Speed for moving to start position
    /// </summary>
    public int PositionSpeedPercent { get; set; } = 50;
}

/// <summary>
/// Command to take up slack (Boşluk Alma)
/// Used before each bending step to eliminate play
/// </summary>
public class TakeUpSlackCommand : IRequest<PreparationResult>
{
    /// <summary>
    /// Target pressure for slack take-up (bar)
    /// </summary>
    public int PressureBar { get; set; } = 30;

    /// <summary>
    /// Speed percent for movement
    /// </summary>
    public int SpeedPercent { get; set; } = 50;
}

/// <summary>
/// Query to get available stages
/// </summary>
public class GetStagesQuery : IRequest<StageConfiguration[]>
{
}

/// <summary>
/// Query to get current preparation state
/// </summary>
public class GetPreparationStateQuery : IRequest<PreparationState>
{
}

/// <summary>
/// Current preparation state
/// </summary>
public class PreparationState
{
    public bool IsGonyeCompleted { get; set; }
    public int CurrentStage { get; set; }
    public bool IsPartClamped { get; set; }
    public bool IsPartZeroed { get; set; }
    public bool IsReadyForBending { get; set; }
    public DateTime? GonyeCompletedAt { get; set; }
    public DateTime? StageChangedAt { get; set; }
    public DateTime? ClampedAt { get; set; }
    public DateTime? ZeroedAt { get; set; }
}
