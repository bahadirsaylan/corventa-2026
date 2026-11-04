namespace CncBendingMachine.Core.Enums;

/// <summary>
/// Error codes matching PLC FB and PRG_Safety error codes
/// </summary>
public enum ErrorCode
{
    NoError = 0,

    // =============================================
    // Safety Errors (1-10) - Set by PRG_Safety
    // =============================================
    EmergencyStop = 1,
    MotorThermal = 2,
    FanThermal = 3,
    PhaseSequence = 4,

    // =============================================
    // System Errors (11-19) - Set by FBs
    // =============================================
    /// <summary>
    /// bSystemReady = FALSE (system not ready)
    /// </summary>
    SystemNotReady = 11,

    /// <summary>
    /// Valve not open when movement requested
    /// </summary>
    ValveNotOpen = 12,

    /// <summary>
    /// Communication error with PLC
    /// </summary>
    CommunicationError = 13,

    /// <summary>
    /// Hydraulic motor not ready (not started or startup delay not complete)
    /// </summary>
    MotorNotReady = 14,

    // =============================================
    // Motion Errors (20-29) - Set by FBs
    // =============================================
    /// <summary>
    /// Movement timeout (30s piston, 60s rotation)
    /// </summary>
    MovementTimeout = 20,

    /// <summary>
    /// Stall detected (encoder not changing while moving)
    /// </summary>
    StallDetected = 21,

    /// <summary>
    /// Extra valve timeout (rotation only, 5s)
    /// </summary>
    ExtraValveTimeout = 22,

    // =============================================
    // Sensor Errors (31-40)
    // =============================================
    OilTempHigh = 31,
    OilLevelLow = 32,
    OilContaminated = 33,

    // =============================================
    // Part Errors (41-50)
    // =============================================
    NoPartDetected = 41,
    PartMisaligned = 42,

    // =============================================
    // Rotation Specific (90-99)
    // =============================================
    /// <summary>
    /// CW and CCW both active simultaneously (critical safety error)
    /// </summary>
    RotationDirectionConflict = 99
}
