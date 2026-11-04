using CncBendingMachine.Core.Models;

namespace CncBendingMachine.Application.Services;

/// <summary>
/// Bending calculation service
/// Calculates piston position from target bending diameter
/// </summary>
public class BendingCalculator : IBendingCalculator
{
    /// <summary>
    /// Calculate piston position from bending parameters
    ///
    /// Formula from CLAUDESON.txt:
    /// 1) Rarc = TargetBendingDiameter / 2
    /// 2) K = Rarc + Rk (lower ball tangent radius)
    /// 3) R2 = Rarc - Thickness - Rk (upper ball tangent radius)
    /// 4) yarc = (K² - R2² + BC²) / (2 × BC)
    /// 5) xarc = √(K² - yarc²)
    /// 6) B = 2 × (((xA1 - xarc) × cos θ) + ((yA1 - yarc) × sin θ))
    /// 7) C = (xA1 - xarc)² + (yA1 - yarc)² - K²
    /// 8) Discriminant = B² - 4C
    /// 9) d = (-B - √Discriminant) / 2
    /// </summary>
    public BendingCalculationResult Calculate(BendingCalculationInput input)
    {
        try
        {
            // Validate inputs
            if (input.BallDiameter <= 0)
                return BendingCalculationResult.Fail("Top capi 0'dan buyuk olmali");

            if (input.Thickness <= 0)
                return BendingCalculationResult.Fail("Et kalinligi 0'dan buyuk olmali");

            if (input.CenterDistance <= 0)
                return BendingCalculationResult.Fail("Eksen mesafesi 0'dan buyuk olmali");

            if (input.TargetBendingDiameter <= 0)
                return BendingCalculationResult.Fail("Hedef bukum capi 0'dan buyuk olmali");

            // Step 1: Calculate ball radius
            double Rk = input.BallDiameter / 2.0;

            // Step 2: Calculate arc radius (target radius)
            double Rarc = input.TargetBendingDiameter / 2.0;

            // Step 3: Calculate K (lower ball tangent radius)
            double K = Rarc + Rk;

            // Step 4: Calculate R2 (upper ball tangent radius)
            double R2 = Rarc - input.Thickness - Rk;

            // Validate R2 > 0
            if (R2 <= 0)
            {
                return BendingCalculationResult.Fail(
                    $"R2 degeri negatif veya sifir ({R2:F2}mm). " +
                    $"Hedef cap ({input.TargetBendingDiameter}mm) cok kucuk veya et kalinligi ({input.Thickness}mm) cok buyuk.");
            }

            // Step 5: Convert theta to radians
            double thetaRad = input.Theta * Math.PI / 180.0;
            double cosTheta = Math.Cos(thetaRad);
            double sinTheta = Math.Sin(thetaRad);

            // Step 6: Calculate yarc
            double BC = input.CenterDistance;
            double yarc = (K * K - R2 * R2 + BC * BC) / (2.0 * BC);

            // Step 7: Calculate xarc
            double xarcSquared = K * K - yarc * yarc;
            if (xarcSquared < 0)
            {
                return BendingCalculationResult.Fail(
                    $"xarc hesaplanamadi (K² - yarc² = {xarcSquared:F2} < 0). " +
                    "Parametreleri kontrol edin.");
            }
            double xarc = Math.Sqrt(xarcSquared);

            // Step 8: Calculate B
            double xDiff = input.XA1 - xarc;
            double yDiff = input.YA1 - yarc;
            double B = 2.0 * ((xDiff * cosTheta) + (yDiff * sinTheta));

            // Step 9: Calculate C
            double C = xDiff * xDiff + yDiff * yDiff - K * K;

            // Step 10: Calculate Discriminant
            double discriminant = B * B - 4.0 * C;

            if (discriminant < 0)
            {
                return BendingCalculationResult.Fail(
                    $"Discriminant negatif ({discriminant:F2}). " +
                    "Bu parametrelerle bukum yapilamaz.");
            }

            // Step 11: Calculate piston position (d)
            double d = (-B - Math.Sqrt(discriminant)) / 2.0;

            // Validate result
            if (d < 0)
            {
                // Try alternative formula
                double dAlt = (-B + Math.Sqrt(discriminant)) / 2.0;
                if (dAlt >= 0)
                {
                    d = dAlt;
                }
                else
                {
                    return BendingCalculationResult.Fail(
                        $"Piston pozisyonu negatif ({d:F2}mm). " +
                        "Parametreleri kontrol edin.");
                }
            }

            return BendingCalculationResult.Ok(
                pistonPosition: Math.Round(d, 2),
                xArc: Math.Round(xarc, 2),
                yArc: Math.Round(yarc, 2),
                discriminant: Math.Round(discriminant, 2),
                ballRadius: Rk,
                arcRadius: Rarc,
                k: K,
                r2: R2
            );
        }
        catch (Exception ex)
        {
            return BendingCalculationResult.Fail($"Hesaplama hatasi: {ex.Message}");
        }
    }

    /// <summary>
    /// Reverse calculation: Get bending diameter from piston position
    /// (For display purposes when manually positioning pistons)
    /// </summary>
    public double? CalculateDiameterFromPosition(double pistonPosition, BendingCalculationInput baseInput)
    {
        // Binary search to find the diameter that gives this piston position
        double minDiameter = (baseInput.Thickness + baseInput.BallDiameter) * 2 + 100; // Minimum possible
        double maxDiameter = 50000; // Maximum reasonable diameter
        double tolerance = 0.1; // 0.1mm tolerance

        for (int i = 0; i < 50; i++) // Max 50 iterations
        {
            double midDiameter = (minDiameter + maxDiameter) / 2.0;

            var testInput = new BendingCalculationInput
            {
                BallDiameter = baseInput.BallDiameter,
                Thickness = baseInput.Thickness,
                CenterDistance = baseInput.CenterDistance,
                TargetBendingDiameter = midDiameter,
                XA1 = baseInput.XA1,
                YA1 = baseInput.YA1,
                Theta = baseInput.Theta
            };

            var result = Calculate(testInput);
            if (!result.Success)
            {
                minDiameter = midDiameter;
                continue;
            }

            double diff = result.PistonPosition - pistonPosition;

            if (Math.Abs(diff) < tolerance)
            {
                return Math.Round(midDiameter, 1);
            }

            // Larger diameter = smaller piston position
            // If calculated > target: need larger diameter to get smaller position
            // If calculated < target: need smaller diameter to get larger position
            if (diff > 0)
            {
                minDiameter = midDiameter;  // Search upper half (larger diameters)
            }
            else
            {
                maxDiameter = midDiameter;  // Search lower half (smaller diameters)
            }
        }

        return null; // Could not find
    }

    /// <summary>
    /// Generate all paso steps for geometric bending
    ///
    /// Algorithm from CLAUDESON.txt:
    /// - globalTarget increases by step each paso: 30, 60, 90, 120...
    /// - Active piston goes to globalTarget (or final target if less)
    /// - Passive piston goes backward by step*10 from its current position (or max safe backward limit)
    /// - Rotation alternates CCW/CW based on active side
    /// - Final paso is repeated on opposite side for symmetry
    /// </summary>
    public List<PasoStep> GeneratePasoSteps(PasoGenerationParams p)
    {
        var steps = new List<PasoStep>();

        // Current positions (both start at 0 after zeroing)
        double leftPosition = 0;
        double rightPosition = 0;

        // Which side is currently active
        bool leftIsActive = p.StartingSide == "Left";

        // Rotation distance (constant for all pasos)
        double rotationDistance = p.PartLengthMm - (p.SafetyMarginMm * 2);

        // Global target increases by step each paso
        double globalTarget = 0;
        int pasoNumber = 0;

        // Generate pasos until target reached
        while (true)
        {
            pasoNumber++;

            // Increase global target by step
            // First paso uses FirstStepDistanceMm if set (to break material resistance)
            double currentStepDistance = (pasoNumber == 1 && p.FirstStepDistanceMm.HasValue)
                ? p.FirstStepDistanceMm.Value
                : p.StepDistanceMm;

            globalTarget += currentStepDistance;

            // Clamp to final target
            bool reachingFinalTarget = globalTarget >= p.TargetPositionMm;
            if (reachingFinalTarget)
            {
                globalTarget = p.TargetPositionMm;
            }

            // Active piston goes to globalTarget
            double activeTarget = globalTarget;

            // Get passive piston current position and safe limit
            double passiveCurrentPos = leftIsActive ? rightPosition : leftPosition;
            double passiveSafeBackward = leftIsActive ? p.RightSafeBackwardMm : p.LeftSafeBackwardMm;

            // Pasif piston her zaman safe backward limit'e (güvenlik payı dahil)
            double passiveTarget = passiveSafeBackward;

            // Rotation direction: Left active = CCW (-1), Right active = CW (1)
            int rotationDir = leftIsActive ? -1 : 1;

            // Create paso step
            var paso = new PasoStep
            {
                PasoNumber = pasoNumber,
                ActiveSide = leftIsActive ? "Left" : "Right",
                ActivePistonTargetMm = Math.Round(activeTarget, 2),
                PassivePistonTargetMm = Math.Round(passiveTarget, 2),
                RotationDirection = rotationDir,
                RotationDistanceMm = rotationDistance,
                IsRepeatPaso = false
            };

            steps.Add(paso);

            // Update positions
            if (leftIsActive)
            {
                leftPosition = activeTarget;
                rightPosition = passiveTarget;
            }
            else
            {
                rightPosition = activeTarget;
                leftPosition = passiveTarget;
            }

            // Check if final target reached
            if (reachingFinalTarget)
            {
                // Add repeat paso on opposite side for symmetry
                pasoNumber++;

                // Swap active side
                bool repeatLeftActive = !leftIsActive;

                // Repeat: other side goes to final target
                double repeatActiveTarget = p.TargetPositionMm;

                // The side that just reached target becomes passive, moves back
                double repeatPassiveSafeLimit = repeatLeftActive ? p.RightSafeBackwardMm : p.LeftSafeBackwardMm;
                double repeatPassiveTarget = repeatPassiveSafeLimit;

                var repeatPaso = new PasoStep
                {
                    PasoNumber = pasoNumber,
                    ActiveSide = repeatLeftActive ? "Left" : "Right",
                    ActivePistonTargetMm = Math.Round(repeatActiveTarget, 2),
                    PassivePistonTargetMm = Math.Round(repeatPassiveTarget, 2),
                    RotationDirection = repeatLeftActive ? -1 : 1,
                    RotationDistanceMm = rotationDistance,  // Always use full rotation distance
                    IsRepeatPaso = true
                };

                steps.Add(repeatPaso);
                break;
            }

            // Alternate active side
            leftIsActive = !leftIsActive;

            // Safety: max 50 pasos
            if (pasoNumber >= 50)
            {
                break;
            }
        }

        return steps;
    }
}

/// <summary>
/// Bending calculator interface
/// </summary>
public interface IBendingCalculator
{
    /// <summary>
    /// Calculate piston position from bending parameters
    /// </summary>
    BendingCalculationResult Calculate(BendingCalculationInput input);

    /// <summary>
    /// Reverse calculation: Get bending diameter from piston position
    /// </summary>
    double? CalculateDiameterFromPosition(double pistonPosition, BendingCalculationInput baseInput);

    /// <summary>
    /// Generate all paso steps for geometric bending
    /// </summary>
    List<PasoStep> GeneratePasoSteps(PasoGenerationParams parameters);
}
