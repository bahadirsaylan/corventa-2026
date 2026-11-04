using CncBendingMachine.Application.Commands.Machine;
using CncBendingMachine.Application.Common;
using CncBendingMachine.Core.Interfaces;
using MediatR;

namespace CncBendingMachine.Application.Handlers.Machine;

/// <summary>
/// Handler for SetHydraulicMotorCommand
/// </summary>
public class SetHydraulicMotorHandler : IRequestHandler<SetHydraulicMotorCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SetHydraulicMotorHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SetHydraulicMotorCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.SetHydraulicMotorAsync(request.TurnOn);
        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for SetFanCommand
/// </summary>
public class SetFanHandler : IRequestHandler<SetFanCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SetFanHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SetFanCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.SetFanAsync(request.TurnOn);
        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for SetAlarmCommand
/// </summary>
public class SetAlarmHandler : IRequestHandler<SetAlarmCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SetAlarmHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SetAlarmCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.SetAlarmAsync(request.TurnOn);
        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}

/// <summary>
/// Handler for SetMachineModeCommand
/// </summary>
public class SetMachineModeHandler : IRequestHandler<SetMachineModeCommand, Result>
{
    private readonly IMachineOrchestrator _orchestrator;

    public SetMachineModeHandler(IMachineOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<Result> Handle(SetMachineModeCommand request, CancellationToken cancellationToken)
    {
        var result = await _orchestrator.SetMachineModeAsync(request.Mode);
        return result.Success
            ? Result.Ok(result.Message)
            : Result.Fail(result.Error!);
    }
}
