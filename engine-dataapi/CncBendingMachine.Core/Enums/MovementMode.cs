namespace CncBendingMachine.Core.Enums;

/// <summary>
/// Movement modes for pistons and rotation
/// </summary>
public enum MovementMode
{
    Stop = 0,        // Stopped
    Jog = 1,         // Manual jogging (hold to move)
    Position = 2,    // Position-based movement
    Pressure = 3,    // Pressure-based movement (pistons only)
    Distance = 4     // Distance-based movement (rotation only)
}
