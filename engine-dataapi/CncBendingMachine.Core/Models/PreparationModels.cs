namespace CncBendingMachine.Core.Models;

/// <summary>
/// Gönye (Reference) position configuration.
///
/// Process:
/// 1. All pistons retract to mechanical limit (S1+S2 reach RetractPressureBar)
/// 2. All encoders are RESET at this reference point (MANDATORY)
/// 3. Pistons move to offset positions from the new zero reference
/// </summary>
public class GonyeConfiguration
{
    /// <summary>
    /// Lower piston offset from reference (mm) - after encoder reset
    /// Alt Orta Top offset
    /// </summary>
    public double LowerPistonOffset { get; set; } = 10.5;

    /// <summary>
    /// Left piston offset from reference (mm) - after encoder reset
    /// Alt Sol Top offset
    /// </summary>
    public double LeftPistonOffset { get; set; } = 3.75;

    /// <summary>
    /// Right piston offset from reference (mm) - usually same as left for symmetry
    /// </summary>
    public double RightPistonOffset { get; set; } = 3.75;

    /// <summary>
    /// Pressure target for pulling pistons back to mechanical limit (bar).
    /// Both S1 AND S2 must reach this pressure.
    /// First 500ms of pressure readings are ignored (startup spike).
    /// </summary>
    public int RetractPressureBar { get; set; } = 70;

    /// <summary>
    /// Speed percent for retract movement.
    /// MUST BE 100% to reach mechanical limit before pressure builds up!
    /// </summary>
    public int RetractSpeedPercent { get; set; } = 100;

    /// <summary>
    /// Speed percent for positioning movement (after encoder reset)
    /// </summary>
    public int PositionSpeedPercent { get; set; } = 30;
}

/// <summary>
/// Stage (height) configuration for different bending capacities
/// </summary>
public class StageConfiguration
{
    public int StageNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Left piston position for this stage (mm)
    /// </summary>
    public double LeftPistonPosition { get; set; }

    /// <summary>
    /// Lower (middle) piston position for this stage (mm)
    /// </summary>
    public double LowerPistonPosition { get; set; }

    /// <summary>
    /// Right piston position for this stage (mm)
    /// </summary>
    public double RightPistonPosition { get; set; }
}

/// <summary>
/// Predefined stage configurations
/// </summary>
public static class StageConfigurations
{
    public static readonly StageConfiguration Stage1 = new()
    {
        StageNumber = 1,
        Name = "Stage 1",
        Description = "Küçük kapasite - Gönye pozisyonu",
        LeftPistonPosition = 3.75,    // Gönye offset
        LowerPistonPosition = 10.5,   // Gönye offset
        RightPistonPosition = 3.75    // Gönye offset
    };

    public static readonly StageConfiguration Stage2 = new()
    {
        StageNumber = 2,
        Name = "Stage 2",
        Description = "Orta kapasite",
        LeftPistonPosition = 67.34,
        LowerPistonPosition = 60.00,
        RightPistonPosition = 67.34
    };

    public static readonly StageConfiguration Stage3 = new()
    {
        StageNumber = 3,
        Name = "Stage 3",
        Description = "Yüksek kapasite",
        LeftPistonPosition = 134.68,
        LowerPistonPosition = 120.00,
        RightPistonPosition = 134.68
    };

    public static StageConfiguration GetStage(int stageNumber) => stageNumber switch
    {
        1 => Stage1,
        2 => Stage2,
        3 => Stage3,
        _ => Stage1
    };

    public static StageConfiguration[] AllStages => new[] { Stage1, Stage2, Stage3 };
}

/// <summary>
/// Part clamping configuration
/// </summary>
public class ClampingConfiguration
{
    /// <summary>
    /// Target pressure for clamping (bar)
    /// </summary>
    public int ClampingPressureBar { get; set; } = 155;

    /// <summary>
    /// Speed percent for clamping movement - 30% (3V) to avoid crushing part
    /// </summary>
    public int ClampingSpeedPercent { get; set; } = 30;

    /// <summary>
    /// Minimum holding pressure (bar)
    /// </summary>
    public int MinHoldingPressureBar { get; set; } = 30;
}

/// <summary>
/// Part zeroing (referencing) configuration
/// </summary>
public class ZeroingConfiguration
{
    /// <summary>
    /// Distance from sensor to center (mm)
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

    /// <summary>
    /// Calculated start position (ResetDistance - SafetyDistance)
    /// </summary>
    public double StartPositionMm => ResetDistanceMm - SafetyDistanceMm;
}

/// <summary>
/// Result of a preparation operation
/// </summary>
public class PreparationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string OperationName { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    public static PreparationResult Ok(string operationName) => new()
    {
        Success = true,
        OperationName = operationName
    };

    public static PreparationResult Fail(string operationName, string error) => new()
    {
        Success = false,
        OperationName = operationName,
        ErrorMessage = error
    };
}

/// <summary>
/// Request for Gönye operation.
/// Note: Encoder reset is MANDATORY and happens automatically at Step 2.
/// </summary>
public class GonyeRequest
{
    /// <summary>
    /// Custom configuration (null = use defaults).
    /// Allows overriding offset positions and pressure settings.
    /// </summary>
    public GonyeConfiguration? Configuration { get; set; }
}

/// <summary>
/// Request for Stage change operation
/// </summary>
public class StageChangeRequest
{
    /// <summary>
    /// Target stage number (1, 2, or 3)
    /// </summary>
    public int TargetStage { get; set; } = 1;

    /// <summary>
    /// Speed percent for stage change movements
    /// </summary>
    public int SpeedPercent { get; set; } = 50;
}

/// <summary>
/// Request for Part Clamping operation
/// </summary>
public class ClampingRequest
{
    /// <summary>
    /// Target clamping pressure (bar) - 155 bar default to avoid crushing part
    /// </summary>
    public int PressureBar { get; set; } = 155;

    /// <summary>
    /// Speed percent for clamping - 30% (3V) to avoid crushing part
    /// </summary>
    public int SpeedPercent { get; set; } = 30;
}

/// <summary>
/// Request for Part Zeroing operation
/// </summary>
public class ZeroingRequest
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
    /// Safety margin (mm)
    /// </summary>
    public double SafetyDistanceMm { get; set; } = 50;

    /// <summary>
    /// Speed for positioning
    /// </summary>
    public int SpeedPercent { get; set; } = 50;
}
