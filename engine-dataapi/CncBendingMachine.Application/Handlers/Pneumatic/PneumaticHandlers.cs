using CncBendingMachine.Application.Commands.Pneumatic;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Pneumatic;

/// <summary>
/// Handler for PneumaticControlCommand
/// </summary>
public class PneumaticControlHandler : IRequestHandler<PneumaticControlCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PneumaticControlHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PneumaticControlCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePneumaticControlAsync(
            request.Side,
            request.Direction);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for PneumaticStopCommand
/// </summary>
public class PneumaticStopHandler : IRequestHandler<PneumaticStopCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PneumaticStopHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PneumaticStopCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePneumaticStopAsync(request.Side);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
