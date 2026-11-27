using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Models;

/// <summary>
/// Complete machine state - pushed to UI via SignalR
/// </summary>
public class MachineState
{
    // System Status
    public MachineMode Mode { get; set; }
    public int HydraulicMotorState { get; set; } // 0=OFF, 1=Starting, 2=Ready
    public bool FanActive { get; set; }
    public bool AlarmActive { get; set; }
    public bool SystemReady { get; set; }
    public int SafetyBits { get; set; }
    public ErrorCode ErrorCode { get; set; }

    // Piston States
    public PistonState RightPiston { get; set; } = new();
    public PistonState LeftPiston { get; set; } = new();
    public PistonState UpperPiston { get; set; } = new();
    public PistonState LowerPiston { get; set; } = new();

    // Rotation State
    public RotationState Rotation { get; set; } = new();

    // Sensor State
    public SensorState Sensors { get; set; } = new();

    // Pneumatic States
    public PneumaticState RightPneumatic { get; set; } = new();
    public PneumaticState LeftPneumatic { get; set; } = new();

    // Safety State (decoded from SafetyBits)
    public SafetyState Safety { get; set; } = new();

    // Springback Measurement State
    public SpringbackState Springback { get; set; } = new();

    // SLPIS Sensor (Geri Esneme Ölçümü)
    public int SlpisSensorRaw { get; set; }
    public double SlpisSensorMm { get; set; }
    public double SlpisSensorEffectiveMm { get; set; }
    public bool SlpisSensorZeroed { get; set; }

    // Physical State Info (Gonye + Stage tracking)
    public PhysicalStateInfo PhysicalInfo { get; set; } = new();

    // Timestamp
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Physical state information - Gonye and Stage tracking
/// </summary>
public class PhysicalStateInfo
{
    public bool IsGonyeCompleted { get; set; }
    public int CurrentStage { get; set; }
    public string? CurrentStageName { get; set; }
}

public class PistonState
{
    public int EncoderRaw { get; set; }
    public double PositionMm { get; set; }
    public bool InPosition { get; set; }
    public bool Moving { get; set; }

    // Physical position tracking (including Gonye + Stage offsets)
    public double PhysicalPositionMm { get; set; }
    public double GonyeOffsetMm { get; set; }
    public double StageOffsetMm { get; set; }
    public double SafeBackwardMm { get; set; }  // Safe backward limit (encoder value)
    public double SafeForwardMm { get; set; }   // Safe forward limit (encoder value)
}

public class RotationState
{
    public int EncoderRaw { get; set; }
    public int ActiveDirection { get; set; } // -1=CCW, 0=Stop, 1=CW
    public double PositionMm { get; set; }   // Position in mm (PLC sends x100, we divide by 100)
    public bool InPosition { get; set; }
}

public class SensorState
{
    public int S1PressureBar { get; set; }
    public int S2PressureBar { get; set; }
    public int S1FlowCms { get; set; }
    public int S2FlowCms { get; set; }
    public int OilTempC { get; set; }
    public int OilHumidityPercent { get; set; }
    public int OilLevelPercent { get; set; }
}

public class PneumaticState
{
    public int EncoderPosition { get; set; }
    public int ActiveDirection { get; set; } // -1=Back, 0=Stop, 1=Forward
    public bool Extended { get; set; }
    public bool Retracted { get; set; }
}

public class SafetyState
{
    public bool EmergencyStopOK { get; set; }
    public bool MotorThermalOK { get; set; }
    public bool FanThermalOK { get; set; }
    public bool PhaseSequenceOK { get; set; }
    public bool LeftPartSensor { get; set; }
    public bool RightPartSensor { get; set; }
    public bool ContaminationK1 { get; set; }
    public bool ContaminationK2 { get; set; }
    public bool ContaminationK3 { get; set; }
}

/// <summary>
/// Springback (Geri Esneme) measurement state
/// </summary>
public class SpringbackState
{
    /// <summary>
    /// State machine: 0=Idle, 1=PneumaticExtend, 2=Measuring, 3=Detected, 4=PneumaticRetract, 5=Complete, 99=Error
    /// </summary>
    public int State { get; set; }

    /// <summary>
    /// Detected piston position when springback occurred (mm)
    /// </summary>
    public double DetectedPositionMm { get; set; }

    /// <summary>
    /// Pneumatic encoder value at start of measurement (mm)
    /// </summary>
    public double PneumaticStartMm { get; set; }

    /// <summary>
    /// Pneumatic encoder value when springback detected (mm)
    /// </summary>
    public double PneumaticEndMm { get; set; }

    /// <summary>
    /// Detection type: 0=None, 1=Increase, 2=AboveMinimum, 3=Stable
    /// </summary>
    public int DetectionType { get; set; }

    /// <summary>
    /// Minimum pneumatic value seen during measurement (mm)
    /// </summary>
    public double MinValueMm { get; set; }

    /// <summary>
    /// Error code: 0=OK, 1=Timeout, 2=PneumaticFail, 3=Cancelled
    /// </summary>
    public int ErrorCode { get; set; }

    /// <summary>
    /// Helper: Is measurement in progress
    /// </summary>
    public bool IsMeasuring => State >= 1 && State <= 4;

    /// <summary>
    /// Helper: Is measurement complete
    /// </summary>
    public bool IsComplete => State == 5;

    /// <summary>
    /// Helper: Has error
    /// </summary>
    public bool HasError => State == 99;
}
