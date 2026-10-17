using CncBendingMachine.Application.Commands.Piston;
using CncBendingMachine.Core.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Piston control - jog, position, pressure
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PistonController : ControllerBase
{
    private readonly ILogger<PistonController> _logger;
    private readonly ISender _mediator;

    public PistonController(ILogger<PistonController> logger, ISender mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    /// <summary>
    /// Jog piston (hold to move)
    /// </summary>
    [HttpPost("{pistonId}/jog")]
    public async Task<IActionResult> Jog(PistonId pistonId, [FromBody] JogRequest request)
    {
        var result = await _mediator.Send(new PistonJogCommand
        {
            Piston = pistonId,
            Direction = request.Direction,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            _logger.LogInformation("{Piston} jog: dir={Dir}, speed={Speed}%", pistonId, request.Direction, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Move piston to position
    /// </summary>
    [HttpPost("{pistonId}/position")]
    public async Task<IActionResult> MoveToPosition(PistonId pistonId, [FromBody] PositionRequest request)
    {
        var result = await _mediator.Send(new PistonMoveToPositionCommand
        {
            Piston = pistonId,
            PositionMm = request.PositionMm,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            _logger.LogInformation("{Piston} move to {Position}mm at {Speed}%", pistonId, request.PositionMm, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Move piston to pressure
    /// </summary>
    [HttpPost("{pistonId}/pressure")]
    public async Task<IActionResult> MoveToPressure(PistonId pistonId, [FromBody] PressureRequest request)
    {
        var result = await _mediator.Send(new PistonMoveToPressureCommand
        {
            Piston = pistonId,
            Direction = request.Direction,
            PressureBar = request.PressureBar,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            string dirStr = request.Direction == 1 ? "ileri" : "geri";
            _logger.LogInformation("{Piston} move {Dir} to {Pressure}bar at {Speed}%", pistonId, dirStr, request.PressureBar, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Stop piston
    /// </summary>
    [HttpPost("{pistonId}/stop")]
    public async Task<IActionResult> Stop(PistonId pistonId)
    {
        var result = await _mediator.Send(new PistonStopCommand { Piston = pistonId });

        if (result.Success)
        {
            _logger.LogInformation("{Piston} stopped", pistonId);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }
}

public class JogRequest
{
    /// <summary>
    /// Direction: -1=Back, 0=Stop, 1=Forward
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

public class PositionRequest
{
    /// <summary>
    /// Target position in mm
    /// </summary>
    public double PositionMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

public class PressureRequest
{
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
