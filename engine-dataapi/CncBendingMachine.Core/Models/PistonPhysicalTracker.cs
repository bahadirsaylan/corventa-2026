using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Models;

/// <summary>
/// Tracks physical position of a piston including offsets from Gonye and Stage
///
/// Physical Position = GonyeOffset + StageOffset + EncoderPosition
///
/// Example (Stage 2, Left Piston):
///   GonyeOffset = 3.75mm
///   StageOffset = 67.34mm
///   EncoderPosition = 0mm (zeroed after stage)
///   PhysicalPosition = 71.09mm
///
/// When encoder goes negative (backward):
///   EncoderPosition = -50mm
///   PhysicalPosition = 71.09 - 50 = 21.09mm
///   MaxBackward = -71.09mm (to reach physical 0)
/// </summary>
public class PistonPhysicalTracker
{
    public PistonId Id { get; }

    /// <summary>
    /// Total piston stroke in mm (from DB)
    /// </summary>
    public double StrokeMm { get; set; }

    /// <summary>
    /// Gonye offset - position from mechanical limit to gonye reference
    /// Set after gonye process completes
    /// </summary>
    public double GonyeOffsetMm { get; set; }

    /// <summary>
    /// Stage offset - position from gonye to current stage
    /// Set after stage change completes
    /// </summary>
    public double StageOffsetMm { get; set; }

    /// <summary>
    /// Safety margin for backward movement limit (mm from mechanical limit)
    /// Keep small to allow passive piston retraction during geometric bending
    /// </summary>
    public double SafetyMarginMm { get; set; } = 1.0;

    /// <summary>
    /// Current encoder position from PLC (can be negative after zeroing)
    /// </summary>
    public double EncoderPositionMm { get; set; }

    /// <summary>
    /// Combined base offset (Gonye + Stage)
    /// </summary>
    public double BaseOffsetMm => GonyeOffsetMm + StageOffsetMm;

    /// <summary>
    /// Actual physical position from mechanical zero
    /// </summary>
    public double PhysicalPositionMm => BaseOffsetMm + EncoderPositionMm;

    /// <summary>
    /// Maximum backward movement (encoder value to reach physical 0)
    /// </summary>
    public double MaxBackwardEncoder => -BaseOffsetMm;

    /// <summary>
    /// Safe backward movement with margin
    /// If Gonye not completed, allow full backward movement (no physical reference yet)
    /// </summary>
    public double SafeBackwardEncoder => IsGonyeCompleted
        ? -BaseOffsetMm + SafetyMarginMm
        : -StrokeMm + SafetyMarginMm;

    /// <summary>
    /// Maximum forward movement (encoder value to reach stroke limit)
    /// </summary>
    public double MaxForwardEncoder => StrokeMm - BaseOffsetMm;

    /// <summary>
    /// Safe forward movement with margin
    /// If Gonye not completed, allow full forward movement (no physical reference yet)
    /// </summary>
    public double SafeForwardEncoder => IsGonyeCompleted
        ? StrokeMm - BaseOffsetMm - SafetyMarginMm
        : StrokeMm - SafetyMarginMm;

    /// <summary>
    /// Whether gonye has been completed for this piston
    /// </summary>
    public bool IsGonyeCompleted { get; set; }

    /// <summary>
    /// Current stage number (0 = no stage, 1-3 = active stage)
    /// </summary>
    public int CurrentStage { get; set; }

    public PistonPhysicalTracker(PistonId id)
    {
        Id = id;
    }

    /// <summary>
    /// Reset after gonye completion
    /// </summary>
    public void SetGonyeCompleted(double gonyeOffset)
    {
        GonyeOffsetMm = gonyeOffset;
        StageOffsetMm = 0;
        EncoderPositionMm = 0;
        IsGonyeCompleted = true;
        CurrentStage = 0;
    }

    /// <summary>
    /// Set stage offset after stage change
    /// </summary>
    public void SetStageCompleted(int stageNumber, double stageOffset)
    {
        StageOffsetMm = stageOffset;
        EncoderPositionMm = 0;
        CurrentStage = stageNumber;
    }

    /// <summary>
    /// Update encoder position from PLC
    /// </summary>
    public void UpdateEncoderPosition(double encoderMm)
    {
        EncoderPositionMm = encoderMm;
    }

    /// <summary>
    /// Check if target encoder position is within safe limits
    /// </summary>
    public bool IsPositionSafe(double targetEncoderMm)
    {
        return targetEncoderMm >= SafeBackwardEncoder && targetEncoderMm <= SafeForwardEncoder;
    }

    /// <summary>
    /// Clamp target position to safe limits
    /// </summary>
    public double ClampToSafeLimits(double targetEncoderMm)
    {
        if (targetEncoderMm < SafeBackwardEncoder)
            return SafeBackwardEncoder;
        if (targetEncoderMm > SafeForwardEncoder)
            return SafeForwardEncoder;
        return targetEncoderMm;
    }
}

/// <summary>
/// Collection of all piston trackers for easy management
/// </summary>
public class MachinePhysicalState
{
    public PistonPhysicalTracker Left { get; }
    public PistonPhysicalTracker Right { get; }
    public PistonPhysicalTracker Upper { get; }
    public PistonPhysicalTracker Lower { get; }

    /// <summary>
    /// Current stage number (0 = no stage/gonye only)
    /// </summary>
    public int CurrentStage { get; set; }

    /// <summary>
    /// Whether gonye process is completed
    /// </summary>
    public bool IsGonyeCompleted => Left.IsGonyeCompleted && Right.IsGonyeCompleted &&
                                     Upper.IsGonyeCompleted && Lower.IsGonyeCompleted;

    public MachinePhysicalState()
    {
        Left = new PistonPhysicalTracker(PistonId.Left);
        Right = new PistonPhysicalTracker(PistonId.Right);
        Upper = new PistonPhysicalTracker(PistonId.Upper);
        Lower = new PistonPhysicalTracker(PistonId.Lower);
    }

    /// <summary>
    /// Get tracker by piston ID
    /// </summary>
    public PistonPhysicalTracker GetTracker(PistonId pistonId)
    {
        return pistonId switch
        {
            PistonId.Left => Left,
            PistonId.Right => Right,
            PistonId.Upper => Upper,
            PistonId.Lower => Lower,
            _ => throw new ArgumentException($"Unknown piston: {pistonId}")
        };
    }

    /// <summary>
    /// Update all encoder positions from machine state
    /// </summary>
    public void UpdateFromMachineState(MachineState state)
    {
        Left.UpdateEncoderPosition(state.LeftPiston.PositionMm);
        Right.UpdateEncoderPosition(state.RightPiston.PositionMm);
        Upper.UpdateEncoderPosition(state.UpperPiston.PositionMm);
        Lower.UpdateEncoderPosition(state.LowerPiston.PositionMm);
    }

    /// <summary>
    /// Initialize stroke values from machine settings
    /// </summary>
    public void InitializeFromSettings(
        double leftStroke, double rightStroke,
        double upperStroke, double lowerStroke,
        double safetyMargin)
    {
        Left.StrokeMm = leftStroke;
        Left.SafetyMarginMm = safetyMargin;

        Right.StrokeMm = rightStroke;
        Right.SafetyMarginMm = safetyMargin;

        Upper.StrokeMm = upperStroke;
        Upper.SafetyMarginMm = safetyMargin;

        Lower.StrokeMm = lowerStroke;
        Lower.SafetyMarginMm = safetyMargin;
    }

    /// <summary>
    /// Set gonye completed for all pistons
    /// </summary>
    public void SetGonyeCompleted(double leftOffset, double rightOffset, double upperOffset, double lowerOffset)
    {
        Left.SetGonyeCompleted(leftOffset);
        Right.SetGonyeCompleted(rightOffset);
        Upper.SetGonyeCompleted(upperOffset);
        Lower.SetGonyeCompleted(lowerOffset);
        CurrentStage = 0;
    }

    /// <summary>
    /// Set stage completed for pistons that have stage offsets
    /// Upper piston doesn't have stage offset
    /// </summary>
    public void SetStageCompleted(int stageNumber, double leftOffset, double rightOffset, double lowerOffset)
    {
        Left.SetStageCompleted(stageNumber, leftOffset);
        Right.SetStageCompleted(stageNumber, rightOffset);
        Lower.SetStageCompleted(stageNumber, lowerOffset);
        // Upper piston has no stage offset, stays at gonye position
        Upper.SetStageCompleted(stageNumber, 0);
        CurrentStage = stageNumber;
    }
}
