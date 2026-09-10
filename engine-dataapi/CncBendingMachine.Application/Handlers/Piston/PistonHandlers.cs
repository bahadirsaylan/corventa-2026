using CncBendingMachine.Application.Commands.Piston;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Piston;

/// <summary>
/// Handler for PistonJogCommand
/// </summary>
public class PistonJogHandler : IRequestHandler<PistonJogCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PistonJogHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PistonJogCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePistonJogAsync(
            request.Piston,
            request.Direction,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for PistonMoveToPositionCommand
/// </summary>
public class PistonMoveToPositionHandler : IRequestHandler<PistonMoveToPositionCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PistonMoveToPositionHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PistonMoveToPositionCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePistonMoveToPositionAsync(
            request.Piston,
            request.PositionMm,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for PistonMoveToPressureCommand
/// </summary>
public class PistonMoveToPressureHandler : IRequestHandler<PistonMoveToPressureCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PistonMoveToPressureHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PistonMoveToPressureCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePistonMoveToPressureAsync(
            request.Piston,
            request.Direction,
            request.PressureBar,
            request.SpeedPercent);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for PistonStopCommand
/// </summary>
public class PistonStopHandler : IRequestHandler<PistonStopCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public PistonStopHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(PistonStopCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.ExecutePistonStopAsync(request.Piston);

        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
