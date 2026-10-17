using CncBendingMachine.Application.Commands.Pneumatic;
using CncBendingMachine.Core.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Pneumatic cylinder control
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PneumaticController : ControllerBase
{
    private readonly ILogger<PneumaticController> _logger;
    private readonly ISender _mediator;

    public PneumaticController(ILogger<PneumaticController> logger, ISender mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    /// <summary>
    /// Extend pneumatic cylinder forward
    /// </summary>
    [HttpPost("{side}/forward")]
    public async Task<IActionResult> Forward(string side)
    {
        var pistonId = ParseSide(side);
        var result = await _mediator.Send(new PneumaticControlCommand
        {
            Side = pistonId,
            Direction = 1
        });

        if (result.Success)
        {
            _logger.LogInformation("{Side} pneumatic forward", side);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Retract pneumatic cylinder backward
    /// </summary>
    [HttpPost("{side}/backward")]
    public async Task<IActionResult> Backward(string side)
    {
        var pistonId = ParseSide(side);
        var result = await _mediator.Send(new PneumaticControlCommand
        {
            Side = pistonId,
            Direction = -1
        });

        if (result.Success)
        {
            _logger.LogInformation("{Side} pneumatic backward", side);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Control pneumatic with direction
    /// </summary>
    [HttpPost("{side}/control")]
    public async Task<IActionResult> Control(string side, [FromBody] PneumaticControlRequest request)
    {
        var pistonId = ParseSide(side);
        var result = await _mediator.Send(new PneumaticControlCommand
        {
            Side = pistonId,
            Direction = request.Direction
        });

        if (result.Success)
        {
            _logger.LogInformation("{Side} pneumatic direction={Dir}", side, request.Direction);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Stop pneumatic cylinder
    /// </summary>
    [HttpPost("{side}/stop")]
    public async Task<IActionResult> Stop(string side)
    {
        var pistonId = ParseSide(side);
        var result = await _mediator.Send(new PneumaticStopCommand { Side = pistonId });

        if (result.Success)
        {
            _logger.LogInformation("{Side} pneumatic stopped", side);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    private PistonId ParseSide(string side)
    {
        return side.ToLower() switch
        {
            "right" => PistonId.Right,
            "left" => PistonId.Left,
            _ => throw new ArgumentException($"Invalid side: {side}. Use 'right' or 'left'")
        };
    }
}

public class PneumaticControlRequest
{
    /// <summary>
    /// Direction: -1=Back, 0=Stop, 1=Forward
    /// </summary>
    public int Direction { get; set; }
}
