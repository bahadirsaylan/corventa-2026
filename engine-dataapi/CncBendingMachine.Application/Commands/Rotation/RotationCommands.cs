using CncBendingMachine.Application.Common;
using MediatR;

namespace CncBendingMachine.Application.Commands.Rotation;

/// <summary>
/// Jog rotation command (manual hold-to-move)
/// </summary>
public class RotationJogCommand : IRequest<Result>
{
    /// <summary>
    /// Direction: -1=CCW, 0=Stop, 1=CW
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Move rotation to absolute position
/// </summary>
public class RotationMoveToPositionCommand : IRequest<Result>
{
    /// <summary>
    /// Target position in mm
    /// </summary>
    public int PositionMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Move rotation by relative distance
/// </summary>
public class RotationMoveDistanceCommand : IRequest<Result>
{
    /// <summary>
    /// Direction: -1=CCW, 1=CW
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Distance in mm (always positive)
    /// </summary>
    public int DistanceMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Stop rotation immediately
/// </summary>
public class RotationStopCommand : IRequest<Result>
{
}
