using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Enums;
using MediatR;

namespace CncBendingMachine.Application.Commands.Piston;

/// <summary>
/// Jog piston command (manual hold-to-move)
/// </summary>
public class PistonJogCommand : IRequest<Result>
{
    public PistonId Piston { get; set; }

    /// <summary>
    /// Direction: -1=Back, 0=Stop, 1=Forward
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Move piston to absolute position
/// </summary>
public class PistonMoveToPositionCommand : IRequest<Result>
{
    public PistonId Piston { get; set; }

    /// <summary>
    /// Target position in mm
    /// </summary>
    public double PositionMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Move piston to target pressure
/// </summary>
public class PistonMoveToPressureCommand : IRequest<Result>
{
    public PistonId Piston { get; set; }

    /// <summary>
    /// Direction: -1=Back, 1=Forward
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Target pressure in bar
    /// </summary>
    public int PressureBar { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

/// <summary>
/// Stop piston immediately
/// </summary>
public class PistonStopCommand : IRequest<Result>
{
    public PistonId Piston { get; set; }
}
