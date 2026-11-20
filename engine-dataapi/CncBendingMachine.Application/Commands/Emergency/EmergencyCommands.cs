using CncBendingMachine.Application.Common;
using MediatR;

namespace CncBendingMachine.Application.Commands.Emergency;

/// <summary>
/// Emergency stop command - stops all movements immediately
/// </summary>
public class EmergencyStopCommand : IRequest<Result>
{
}
