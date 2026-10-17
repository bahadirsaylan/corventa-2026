using CncBendingMachine.Application.Commands.Emergency;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Emergency;

/// <summary>
/// Handler for EmergencyStopCommand - stops all machine movements immediately
/// </summary>
public class EmergencyStopHandler : IRequestHandler<EmergencyStopCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public EmergencyStopHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(EmergencyStopCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.EmergencyStopAsync();

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
