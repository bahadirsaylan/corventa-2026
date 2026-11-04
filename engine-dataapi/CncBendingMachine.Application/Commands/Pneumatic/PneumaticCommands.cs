using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Enums;
using MediatR;

namespace CncBendingMachine.Application.Commands.Pneumatic;

/// <summary>
/// Control pneumatic cylinder
/// </summary>
public class PneumaticControlCommand : IRequest<Result>
{
    /// <summary>
    /// Side: Right or Left (use PistonId.Right or PistonId.Left)
    /// </summary>
    public PistonId Side { get; set; }

    /// <summary>
    /// Direction: -1=Back, 0=Stop, 1=Forward
    /// </summary>
    public int Direction { get; set; }
}

/// <summary>
/// Stop pneumatic cylinder
/// </summary>
public class PneumaticStopCommand : IRequest<Result>
{
    /// <summary>
    /// Side: Right or Left
    /// </summary>
    public PistonId Side { get; set; }
}
