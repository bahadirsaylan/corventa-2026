using CncBendingMachine.Application.Commands.Rotation;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Rotation;

/// <summary>
/// Handler for RotationJogCommand
/// </summary>
public class RotationJogHandler : IRequestHandler<RotationJogCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public RotationJogHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(RotationJogCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteRotationJogAsync(
            request.Direction,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for RotationMoveToPositionCommand
/// </summary>
public class RotationMoveToPositionHandler : IRequestHandler<RotationMoveToPositionCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public RotationMoveToPositionHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(RotationMoveToPositionCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteRotationMoveToPositionAsync(
            request.PositionMm,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for RotationMoveDistanceCommand
/// </summary>
public class RotationMoveDistanceHandler : IRequestHandler<RotationMoveDistanceCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public RotationMoveDistanceHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(RotationMoveDistanceCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteRotationMoveDistanceAsync(
            request.Direction,
            request.DistanceMm,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for RotationStopCommand
/// </summary>
public class RotationStopHandler : IRequestHandler<RotationStopCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public RotationStopHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(RotationStopCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecuteRotationStopAsync();

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
