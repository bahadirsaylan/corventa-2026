namespace CncBendingMachine.Core.Models;

/// <summary>
/// Input parameters for bending calculation
/// </summary>
public class BendingCalculationInput
{
    /// <summary>
    /// Ball diameter (Vals topu capi) - mm
    /// Default: 220mm
    /// </summary>
    public double BallDiameter { get; set; } = 220;

    /// <summary>
    /// Part thickness (Parca et kalinligi) - mm
    /// Default: 80mm
    /// </summary>
    public double Thickness { get; set; } = 80;

    /// <summary>
    /// Ball center distance (Top eksen mesafesi) - mm
    /// Default: 300.82mm
    /// </summary>
    public double CenterDistance { get; set; } = 300.82;

    /// <summary>
    /// Target bending diameter (Hedef bukum capi) - mm
    /// Default: 2000mm
    /// </summary>
    public double TargetBendingDiameter { get; set; } = 2000;

    /// <summary>
    /// Left ball X coordinate (Sol top X koordinati) - mm
    /// Default: -493mm
    /// </summary>
    public double XA1 { get; set; } = -493;

    /// <summary>
    /// Left ball Y coordinate (Sol top Y koordinati) - mm
    /// Default: 0mm
    /// </summary>
    public double YA1 { get; set; } = 0;

    /// <summary>
    /// Fixed angle for calculation - degrees
    /// Default: 63 degrees
    /// </summary>
    public double Theta { get; set; } = 63;
}

/// <summary>
/// Result of bending calculation
/// </summary>
public class BendingCalculationResult
{
    /// <summary>
    /// Calculation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if calculation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Piston position (main output) - mm
    /// This is the target position for the upper/lower pistons
    /// </summary>
    public double PistonPosition { get; set; }

    /// <summary>
    /// Arc center X coordinate - mm
    /// </summary>
    public double XArc { get; set; }

    /// <summary>
    /// Arc center Y coordinate - mm
    /// </summary>
    public double YArc { get; set; }

    /// <summary>
    /// Discriminant value (for validation)
    /// Must be >= 0 for valid calculation
    /// </summary>
    public double Discriminant { get; set; }

    /// <summary>
    /// Ball radius (Rk) - mm
    /// </summary>
    public double BallRadius { get; set; }

    /// <summary>
    /// Target arc radius (Rarc) - mm
    /// </summary>
    public double ArcRadius { get; set; }

    /// <summary>
    /// K value (lower ball tangent radius) - mm
    /// K = Rarc + Rk
    /// </summary>
    public double K { get; set; }

    /// <summary>
    /// R2 value (upper ball tangent radius) - mm
    /// R2 = Rarc - Thickness - Rk
    /// </summary>
    public double R2 { get; set; }

    /// <summary>
    /// Create successful result
    /// </summary>
    public static BendingCalculationResult Ok(
        double pistonPosition,
        double xArc,
        double yArc,
        double discriminant,
        double ballRadius,
        double arcRadius,
        double k,
        double r2)
    {
        return new BendingCalculationResult
        {
            Success = true,
            PistonPosition = pistonPosition,
            XArc = xArc,
            YArc = yArc,
            Discriminant = discriminant,
            BallRadius = ballRadius,
            ArcRadius = arcRadius,
            K = k,
            R2 = r2
        };
    }

    /// <summary>
    /// Create failed result
    /// </summary>
    public static BendingCalculationResult Fail(string error)
    {
        return new BendingCalculationResult
        {
            Success = false,
            ErrorMessage = error
        };
    }
}

// ============================================================
// GEOMETRIC BENDING MODELS
// ============================================================

/// <summary>
/// A single paso (step) in the geometric bending process
/// </summary>
public class PasoStep
{
    /// <summary>
    /// Paso number (1-based)
    /// </summary>
    public int PasoNumber { get; set; }

    /// <summary>
    /// Which side is active for this paso ("Left" or "Right")
    /// Active piston moves toward target, passive moves backward
    /// </summary>
    public string ActiveSide { get; set; } = "Left";

    /// <summary>
    /// Target position for the active piston (mm)
    /// </summary>
    public double ActivePistonTargetMm { get; set; }

    /// <summary>
    /// Target position for the passive piston (mm)
    /// Usually current - (step * 2), but respects safe limits
    /// </summary>
    public double PassivePistonTargetMm { get; set; }

    /// <summary>
    /// Rotation direction: -1 = CCW (Left→Right), 1 = CW (Right→Left)
    /// </summary>
    public int RotationDirection { get; set; }

    /// <summary>
    /// Rotation distance (mm)
    /// Usually: PartLength - (SafetyMargin * 2)
    /// </summary>
    public double RotationDistanceMm { get; set; }

    /// <summary>
    /// Is this a repeat paso for symmetry?
    /// After reaching target, we repeat on the other side
    /// </summary>
    public bool IsRepeatPaso { get; set; }

    /// <summary>
    /// Human-readable description of this paso
    /// </summary>
    public string GetDescription()
    {
        string dir = RotationDirection == -1 ? "CCW" : "CW";
        string repeatNote = IsRepeatPaso ? " (Tekrar - Simetri)" : "";
        return $"Paso {PasoNumber}{repeatNote}: {ActiveSide} aktif → {ActivePistonTargetMm:F2}mm, " +
               $"Pasif → {PassivePistonTargetMm:F2}mm, Rotasyon {dir} {RotationDistanceMm:F0}mm";
    }
}

/// <summary>
/// Result of geometric bending operation
/// </summary>
public class GeometricBendingResult
{
    /// <summary>
    /// Operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Total number of pasos in this bending operation
    /// </summary>
    public int TotalPasos { get; set; }

    /// <summary>
    /// Number of pasos completed
    /// </summary>
    public int CompletedPasos { get; set; }

    /// <summary>
    /// Current paso being executed (0 if not started or finished)
    /// </summary>
    public int CurrentPaso { get; set; }

    /// <summary>
    /// All paso steps (for preview/logging)
    /// </summary>
    public List<PasoStep> PasoSteps { get; set; } = new();

    /// <summary>
    /// Final left piston position after bending
    /// </summary>
    public double FinalLeftPositionMm { get; set; }

    /// <summary>
    /// Final right piston position after bending
    /// </summary>
    public double FinalRightPositionMm { get; set; }

    /// <summary>
    /// Create successful result
    /// </summary>
    public static GeometricBendingResult Ok(List<PasoStep> pasoSteps)
    {
        return new GeometricBendingResult
        {
            Success = true,
            TotalPasos = pasoSteps.Count,
            CompletedPasos = pasoSteps.Count,
            PasoSteps = pasoSteps
        };
    }

    /// <summary>
    /// Create failed result
    /// </summary>
    public static GeometricBendingResult Fail(string error, int completedPasos = 0)
    {
        return new GeometricBendingResult
        {
            Success = false,
            ErrorMessage = error,
            CompletedPasos = completedPasos
        };
    }

    /// <summary>
    /// Create in-progress result (for partial completion)
    /// </summary>
    public static GeometricBendingResult InProgress(int currentPaso, int totalPasos, List<PasoStep> pasoSteps)
    {
        return new GeometricBendingResult
        {
            Success = false,
            TotalPasos = totalPasos,
            CompletedPasos = currentPaso - 1,
            CurrentPaso = currentPaso,
            PasoSteps = pasoSteps
        };
    }
}

/// <summary>
/// Parameters for generating paso steps (used by BendingCalculator)
/// </summary>
public class PasoGenerationParams
{
    /// <summary>
    /// Target piston position (from bending calculation) - mm
    /// </summary>
    public double TargetPositionMm { get; set; }

    /// <summary>
    /// Part length - mm
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Safety margin on each end - mm
    /// </summary>
    public double SafetyMarginMm { get; set; }

    /// <summary>
    /// Step distance for each paso - mm
    /// </summary>
    public double StepDistanceMm { get; set; }

    /// <summary>
    /// First step distance - mm (optional)
    /// If set, the first paso will use this distance instead of StepDistanceMm
    /// Used to break material resistance with a larger initial step
    /// </summary>
    public double? FirstStepDistanceMm { get; set; }

    /// <summary>
    /// Which side starts as active ("Left" or "Right")
    /// Based on which part presence sensor is active
    /// </summary>
    public string StartingSide { get; set; } = "Left";

    /// <summary>
    /// Safe backward limit for left piston - mm (encoder value)
    /// </summary>
    public double LeftSafeBackwardMm { get; set; }

    /// <summary>
    /// Safe backward limit for right piston - mm (encoder value)
    /// </summary>
    public double RightSafeBackwardMm { get; set; }
}
