namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Machine-specific settings stored in database
/// These are fixed values for a specific machine installation
/// </summary>
public class MachineSettings
{
    public int Id { get; set; }

    // Piston Strokes (mm)
    public double LeftPistonStrokeMm { get; set; } = 422.0;
    public double RightPistonStrokeMm { get; set; } = 422.0;
    public double UpperPistonStrokeMm { get; set; } = 161.0;
    public double LowerPistonStrokeMm { get; set; } = 195.0;

    // Piston Max Registers (encoder max values)
    public int LeftPistonMaxReg { get; set; } = 21093;
    public int RightPistonMaxReg { get; set; } = 21127;
    public int UpperPistonMaxReg { get; set; } = 7981;
    public int LowerPistonMaxReg { get; set; } = 9732;

    // Pneumatic Parameters
    public double PneumaticStrokeMm { get; set; } = 265.0;
    public int PneumaticMaxReg { get; set; } = 13250;

    // Rotation Parameters
    public double RollerDiameterMm { get; set; } = 220.0;
    public int RotationEncoderPpr { get; set; } = 1024;

    // Safety Margins (for piston physical movement limits - keep small for passive piston retraction)
    public double SafetyMarginMm { get; set; } = 1.0;

    // Preparation (parça sıfırlama) — sensörden "0" noktasına olan mesafe
    // ZeroPartHandler: startPosition = ZeroResetDistanceMm - SafetyMargin
    public double ZeroResetDistanceMm { get; set; } = 690.0;

    // Bending Defaults (UI'dan gelmez, ayarlardan okunur)
    public string DefaultActiveSensorSide { get; set; } = "Left";
    public string? DefaultValsCode { get; set; }
    public int DefaultPistonSpeedPercent { get; set; } = 100;
    public int DefaultRotationSpeedPercent { get; set; } = 100;
    public double DefaultToleranceMm { get; set; } = 0.1;
    public double DefaultSafetyMarginMm { get; set; } = 50;
    public int DefaultSlackPressureBar { get; set; } = 157;
    public double DefaultSlackDistanceMm { get; set; } = 0.2;
    public int DefaultClampPressureBar { get; set; } = 155;
    public double DefaultBallDiameterMm { get; set; } = 220;
    public double DefaultCenterDistanceMm { get; set; } = 300.82;
    public double DefaultThetaDeg { get; set; } = 63;
    public double DefaultXA1 { get; set; } = -493;
    public double DefaultYA1 { get; set; } = 0;

    // SLPIS Sensor Parameters (geri esneme radyüs hesabı için)
    public double SlpisZeroOffsetMm { get; set; } = 0;
    public double SlpisLMm { get; set; } = 70.0;
    public double SlpisRulmanCapMm { get; set; } = 35.0;

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
