namespace CncBendingMachine.Web.Models;

/// <summary>
/// Machine state DTO for SignalR communication
/// </summary>
public class MachineStateDto
{
    // System Status - property names must match Core model for JSON deserialization
    public int Mode { get; set; }
    public int HydraulicMotorState { get; set; }
    public bool FanActive { get; set; }
    public bool AlarmActive { get; set; }
    public bool SystemReady { get; set; }
    public int SafetyBits { get; set; }
    public int ErrorCode { get; set; }

    // UI aliases for backwards compatibility
    public bool FanOn => FanActive;
    public bool AlarmOn => AlarmActive;

    // Piston States
    public PistonStateDto RightPiston { get; set; } = new();
    public PistonStateDto LeftPiston { get; set; } = new();
    public PistonStateDto UpperPiston { get; set; } = new();
    public PistonStateDto LowerPiston { get; set; } = new();

    // Rotation State
    public RotationStateDto Rotation { get; set; } = new();

    // Pneumatic States
    public PneumaticStateDto RightPneumatic { get; set; } = new();
    public PneumaticStateDto LeftPneumatic { get; set; } = new();

    // Sensor States
    public SensorStateDto Sensors { get; set; } = new();

    // Physical State Info (Gonye + Stage tracking)
    public PhysicalStateInfoDto PhysicalInfo { get; set; } = new();

    // SLPIS Sensor (Geri Esneme Ölçümü)
    public int SlpisSensorRaw { get; set; }
    public double SlpisSensorMm { get; set; }
    public double SlpisSensorEffectiveMm { get; set; }
    public bool SlpisSensorZeroed { get; set; }

    // Helper properties for UI
    public string HydraulicMotorStateText => HydraulicMotorState switch
    {
        0 => "OFF",
        1 => "Starting...",
        2 => "Ready",
        _ => "Unknown"
    };

    public string ModeText => Mode switch
    {
        0 => "Manual",
        1 => "Semi-Auto",
        2 => "Auto",
        3 => "Setup",
        _ => "Unknown"
    };

    public string ErrorText => ErrorCode switch
    {
        // No Error
        0 => "Hata Yok",

        // Safety Errors (1-10)
        1 => "ACİL DURDURMA!",
        2 => "Motor Aşırı Isınma!",
        3 => "Fan Aşırı Isınma",
        4 => "Faz Sırası Hatası!",

        // System Errors (11-19)
        11 => "Güvenlik Hatası - Sistem Hazır Değil",
        12 => "Valf Açık Değil",
        13 => "İletişim Hatası",
        14 => "Hidrolik Motor Hazır Değil",

        // Motion Errors (20-29)
        20 => "Hareket Zaman Aşımı!",
        21 => "Stall - Encoder Takılı!",
        22 => "Extra Valf Zaman Aşımı!",

        // Sensor Errors (31-40)
        31 => "Yağ Sıcaklığı Yüksek",
        32 => "Yağ Seviyesi Düşük",
        33 => "Yağ Kontamine",

        // Part Errors (41-50)
        41 => "Parça Algılanmadı",
        42 => "Parça Hizalı Değil",

        // Rotation Specific (99)
        99 => "CW+CCW Çakışması!",

        _ => $"Hata {ErrorCode}"
    };

    // Safety bit helpers
    public bool EmergencyStopOK => (SafetyBits & 0x01) != 0;
    public bool MotorThermalOK => (SafetyBits & 0x02) != 0;
    public bool FanThermalOK => (SafetyBits & 0x04) != 0;
    public bool PhaseSequenceOK => (SafetyBits & 0x08) != 0;
}

public class PistonStateDto
{
    public int EncoderRaw { get; set; }
    public double PositionMm { get; set; }
    public bool InPosition { get; set; }
    public bool Moving { get; set; }

    // Physical position tracking (including Gonye + Stage offsets)
    public double PhysicalPositionMm { get; set; }
    public double GonyeOffsetMm { get; set; }
    public double StageOffsetMm { get; set; }
    public double SafeBackwardMm { get; set; }
    public double SafeForwardMm { get; set; }

    // UI display helpers
    public string PositionText => $"{PositionMm:F2} mm";
    public string PhysicalPositionText => $"{PhysicalPositionMm:F2} mm";
    public string StatusText => Moving ? "Moving" : (InPosition ? "In Position" : "Idle");

    // Total offset (Gonye + Stage)
    public double TotalOffsetMm => GonyeOffsetMm + StageOffsetMm;
    public bool HasOffset => TotalOffsetMm > 0.01; // Has any offset applied
}

public class RotationStateDto
{
    // Property names must match Core model for JSON deserialization
    public int EncoderRaw { get; set; }
    public int ActiveDirection { get; set; } // -1=CCW, 0=Stop, 1=CW
    public double PositionMm { get; set; } // Position in mm (already divided by 100 in driver)
    public bool InPosition { get; set; }

    // UI alias for backwards compatibility
    public int Active => ActiveDirection;

    public string DirectionText => ActiveDirection switch
    {
        1 => "CW",
        -1 => "CCW",
        _ => "Stopped"
    };
}

public class PneumaticStateDto
{
    // Pneumatic cylinder: 265mm stroke, ~13250 max register (50 pulses/mm)
    private const int MaxRegister = 13250;
    private const double StrokeMm = 265.0;

    // Must match Core model property name for JSON deserialization
    public int EncoderPosition { get; set; }
    public int ActiveDirection { get; set; } // -1=Back, 0=Stop, 1=Forward

    // Alias for backwards compatibility in UI
    public int EncoderRaw => EncoderPosition;
    public int State => ActiveDirection;

    // Position in mm calculated from encoder
    public double PositionMm => MaxRegister > 0 ? (EncoderPosition / (double)MaxRegister) * StrokeMm : 0;

    public string PositionText => $"{PositionMm:F2} mm";

    public string StateText => ActiveDirection switch
    {
        1 => "Forward",
        -1 => "Backward",
        _ => "Stopped"
    };
}

public class SensorStateDto
{
    public int S1PressureBar { get; set; }
    public int S2PressureBar { get; set; }
    public int S1FlowCms { get; set; }
    public int S2FlowCms { get; set; }
    public int OilTempC { get; set; }
    public int OilHumidityPercent { get; set; }
    public int OilLevelPercent { get; set; }
}

/// <summary>
/// Physical state information - Gonye and Stage tracking
/// </summary>
public class PhysicalStateInfoDto
{
    public bool IsGonyeCompleted { get; set; }
    public int CurrentStage { get; set; }
    public string? CurrentStageName { get; set; }

    // UI helpers
    public string StageText => CurrentStage > 0
        ? $"Stage {CurrentStage}" + (CurrentStageName != null ? $" ({CurrentStageName})" : "")
        : "Gönye Yapılmadı";

    public string StatusText => IsGonyeCompleted
        ? (CurrentStage > 0 ? StageText : "Gönye Tamamlandı")
        : "Gönye Yapılmadı";
}
