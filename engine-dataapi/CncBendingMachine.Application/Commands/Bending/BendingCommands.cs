using CncBendingMachine.Core.Models;
using MediatR;

namespace CncBendingMachine.Application.Commands.Bending;

/// <summary>
/// Calculate piston position from bending parameters
/// </summary>
public class CalculateBendingCommand : IRequest<BendingCalculationResult>
{
    /// <summary>
    /// Ball diameter (Vals topu capi) - mm
    /// </summary>
    public double BallDiameter { get; set; } = 220;

    /// <summary>
    /// Part thickness (Parca et kalinligi) - mm
    /// </summary>
    public double Thickness { get; set; } = 80;

    /// <summary>
    /// Ball center distance (Top eksen mesafesi) - mm
    /// </summary>
    public double CenterDistance { get; set; } = 300.82;

    /// <summary>
    /// Target bending diameter (Hedef bukum capi) - mm
    /// </summary>
    public double TargetBendingDiameter { get; set; } = 2000;

    /// <summary>
    /// Left ball X coordinate - mm
    /// </summary>
    public double XA1 { get; set; } = -493;

    /// <summary>
    /// Left ball Y coordinate - mm
    /// </summary>
    public double YA1 { get; set; } = 0;

    /// <summary>
    /// Fixed angle - degrees
    /// </summary>
    public double Theta { get; set; } = 63;

    /// <summary>
    /// Convert to calculation input
    /// </summary>
    public BendingCalculationInput ToInput() => new()
    {
        BallDiameter = BallDiameter,
        Thickness = Thickness,
        CenterDistance = CenterDistance,
        TargetBendingDiameter = TargetBendingDiameter,
        XA1 = XA1,
        YA1 = YA1,
        Theta = Theta
    };
}

/// <summary>
/// Reverse calculation: Get bending diameter from piston position
/// </summary>
public class CalculateDiameterFromPositionCommand : IRequest<double?>
{
    /// <summary>
    /// Current piston position - mm
    /// </summary>
    public double PistonPosition { get; set; }

    /// <summary>
    /// Ball diameter - mm
    /// </summary>
    public double BallDiameter { get; set; } = 220;

    /// <summary>
    /// Part thickness - mm
    /// </summary>
    public double Thickness { get; set; } = 80;

    /// <summary>
    /// Ball center distance - mm
    /// </summary>
    public double CenterDistance { get; set; } = 300.82;

    /// <summary>
    /// Left ball X coordinate - mm
    /// </summary>
    public double XA1 { get; set; } = -493;

    /// <summary>
    /// Left ball Y coordinate - mm
    /// </summary>
    public double YA1 { get; set; } = 0;

    /// <summary>
    /// Fixed angle - degrees
    /// </summary>
    public double Theta { get; set; } = 63;

    /// <summary>
    /// Convert to base input (without target diameter)
    /// </summary>
    public BendingCalculationInput ToBaseInput() => new()
    {
        BallDiameter = BallDiameter,
        Thickness = Thickness,
        CenterDistance = CenterDistance,
        XA1 = XA1,
        YA1 = YA1,
        Theta = Theta
    };
}

// ============================================================
// GEOMETRIC BENDING COMMANDS
// ============================================================

/// <summary>
/// Execute geometric bending operation with paso (step) algorithm
/// </summary>
/// <remarks>
/// Prerequisites:
/// 1. Machine must be at Gonye position
/// 2. Stage must be set
/// 3. Part must be clamped (Upper piston)
/// 4. Part must be zeroed (rotation encoder reset)
///
/// Algorithm:
/// - Active piston moves toward target by step distance
/// - Passive piston moves backward by step*2 (respecting safe limits)
/// - Rotation alternates CCW/CW based on active side
/// - Final paso is repeated on opposite side for symmetry
/// </remarks>
public class ExecuteGeometricBendingCommand : IRequest<GeometricBendingResult>
{
    /// <summary>
    /// Job ID — progress raporlama için (BendingProgressService)
    /// </summary>
    public int JobId { get; set; }

    /// <summary>
    /// Target piston position (from bending calculation) - mm
    /// This is where both pistons will eventually reach
    /// </summary>
    public double TargetPositionMm { get; set; }

    /// <summary>
    /// Part length - mm
    /// Used to calculate rotation distance
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Safety margin on each end - mm
    /// Rotation = PartLength - (SafetyMargin * 2)
    /// </summary>
    public double SafetyMarginMm { get; set; } = 50;

    /// <summary>
    /// Step distance for each paso - mm
    /// Active piston moves by this amount toward target
    /// </summary>
    public double StepDistanceMm { get; set; } = 30;

    /// <summary>
    /// First step distance - mm (optional)
    /// If set, the first paso will use this distance instead of StepDistanceMm
    /// Used to break material resistance with a larger initial step
    /// Example: StepDistanceMm=20, FirstStepDistanceMm=40 → 40, 60, 80, 100...
    /// </summary>
    public double? FirstStepDistanceMm { get; set; }

    /// <summary>
    /// Which sensor is active (determines starting side)
    /// "Left" = Left sensor active, start with Left piston
    /// "Right" = Right sensor active, start with Right piston
    /// </summary>
    public string ActiveSensorSide { get; set; } = "Left";

    /// <summary>
    /// Piston movement speed - percent (0-100)
    /// </summary>
    public int PistonSpeedPercent { get; set; } = 100;

    /// <summary>
    /// Rotation speed - percent (0-100)
    /// </summary>
    public int RotationSpeedPercent { get; set; } = 100;

    /// <summary>
    /// Üst piston boşluk alma mesafesi (mm) - mesafe bazlı boşluk alma
    /// Bu değer tanımlıysa basınç bazlı (157 bar) yerine mesafe bazlı boşluk alma kullanılır
    /// Örneğin: 0.5mm girildiyse üst piston mevcut konumundan 0.5mm ilerler
    /// </summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>
    /// Üst piston boşluk alma basıncı (bar) - basınç bazlı boşluk alma
    /// NOT: SlackDistanceMm tanımlıysa bu değer kullanılmaz
    /// Varsayılan: 157 bar
    /// </summary>
    public int SlackPressureBar { get; set; } = 157;
}

/// <summary>
/// Preview geometric bending - calculate all paso steps without executing
/// </summary>
public class PreviewGeometricBendingCommand : IRequest<GeometricBendingResult>
{
    /// <summary>
    /// Target piston position - mm
    /// </summary>
    public double TargetPositionMm { get; set; }

    /// <summary>
    /// Part length - mm
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Safety margin - mm
    /// </summary>
    public double SafetyMarginMm { get; set; } = 50;

    /// <summary>
    /// Step distance - mm
    /// </summary>
    public double StepDistanceMm { get; set; } = 30;

    /// <summary>
    /// First step distance - mm (optional)
    /// If set, the first paso will use this distance instead of StepDistanceMm
    /// </summary>
    public double? FirstStepDistanceMm { get; set; }

    /// <summary>
    /// Starting side
    /// </summary>
    public string ActiveSensorSide { get; set; } = "Left";
}

/// <summary>
/// Stop ongoing bending operation
/// </summary>
public class StopBendingCommand : IRequest<bool>
{
}
