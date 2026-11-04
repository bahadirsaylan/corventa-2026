using CncBendingMachine.Application.Common;
using MediatR;

namespace CncBendingMachine.Application.Commands.Machine;

/// <summary>
/// Command to turn hydraulic motor ON/OFF
/// </summary>
public class SetHydraulicMotorCommand : IRequest<Result>
{
    public bool TurnOn { get; set; }
}

/// <summary>
/// Command to turn fan ON/OFF
/// </summary>
public class SetFanCommand : IRequest<Result>
{
    public bool TurnOn { get; set; }
}

/// <summary>
/// Command to set machine mode
/// </summary>
public class SetMachineModeCommand : IRequest<Result>
{
    public Core.Enums.MachineMode Mode { get; set; }
}

/// <summary>
/// Command to control alarm
/// </summary>
public class SetAlarmCommand : IRequest<Result>
{
    public bool TurnOn { get; set; }
}
