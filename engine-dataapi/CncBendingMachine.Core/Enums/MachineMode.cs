namespace CncBendingMachine.Core.Enums;

/// <summary>
/// Machine operation modes
/// </summary>
public enum MachineMode
{
    Manual = 0,      // Manual control
    SemiAuto = 1,    // Semi-automatic (step confirmation)
    Auto = 2,        // Full automatic
    Setup = 3        // Setup/Calibration
}
