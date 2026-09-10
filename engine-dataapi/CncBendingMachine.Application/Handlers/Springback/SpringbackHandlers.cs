using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Springback;

/// <summary>
/// Handler for SpringbackStartCommand
/// </summary>
public class SpringbackStartHandler : IRequestHandler<SpringbackStartCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SpringbackStartHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SpringbackStartCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteSpringbackStartAsync(
            request.Side,
            request.IncreaseThresholdMm,
            request.MinThresholdMm,
            request.StableTimeMs);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for SpringbackStopCommand
/// </summary>
public class SpringbackStopHandler : IRequestHandler<SpringbackStopCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SpringbackStopHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SpringbackStopCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteSpringbackStopAsync();

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for SetSpringbackThresholdsCommand
/// </summary>
public class SetSpringbackThresholdsHandler : IRequestHandler<SetSpringbackThresholdsCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SetSpringbackThresholdsHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SetSpringbackThresholdsCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteSetSpringbackThresholdsAsync(
            request.IncreaseThresholdMm,
            request.MinThresholdMm,
            request.StableTimeMs);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
