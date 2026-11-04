using CncBendingMachine.Application.Commands.Rotation;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Rotation control - jog, position, distance
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class RotationController : ControllerBase
{
    private readonly ILogger<RotationController> _logger;
    private readonly ISender _mediator;

    public RotationController(ILogger<RotationController> logger, ISender mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    /// <summary>
    /// Jog rotation (hold to move)
    /// </summary>
    [HttpPost("jog")]
    public async Task<IActionResult> Jog([FromBody] RotationJogRequest request)
    {
        var result = await _mediator.Send(new RotationJogCommand
        {
            Direction = request.Direction,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            _logger.LogInformation("Rotation jog: dir={Dir}, speed={Speed}%", request.Direction, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Move rotation to absolute position (mm)
    /// </summary>
    [HttpPost("position")]
    public async Task<IActionResult> MoveToPosition([FromBody] RotationPositionRequest request)
    {
        var result = await _mediator.Send(new RotationMoveToPositionCommand
        {
            PositionMm = request.PositionMm,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            _logger.LogInformation("Rotation move to position {Position}mm at {Speed}%", request.PositionMm, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Move rotation by relative distance (mm)
    /// </summary>
    [HttpPost("distance")]
    public async Task<IActionResult> MoveDistance([FromBody] RotationDistanceRequest request)
    {
        var result = await _mediator.Send(new RotationMoveDistanceCommand
        {
            Direction = request.Direction,
            DistanceMm = request.DistanceMm,
            SpeedPercent = request.SpeedPercent
        });

        if (result.Success)
        {
            string dirStr = request.Direction == 1 ? "CW" : "CCW";
            _logger.LogInformation("Rotation move {Dir} {Distance}mm at {Speed}%", dirStr, request.DistanceMm, request.SpeedPercent);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Stop rotation
    /// </summary>
    [HttpPost("stop")]
    public async Task<IActionResult> Stop()
    {
        var result = await _mediator.Send(new RotationStopCommand());

        if (result.Success)
        {
            _logger.LogInformation("Rotation stopped");
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }
}

public class RotationJogRequest
{
    /// <summary>
    /// Direction: -1=CCW, 0=Stop, 1=CW
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

public class RotationPositionRequest
{
    /// <summary>
    /// Target position in mm
    /// </summary>
    public int PositionMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}

public class RotationDistanceRequest
{
    /// <summary>
    /// Direction: -1=CCW, 1=CW
    /// </summary>
    public int Direction { get; set; }

    /// <summary>
    /// Distance to move in mm (always positive)
    /// </summary>
    public int DistanceMm { get; set; }

    /// <summary>
    /// Speed: 0-100%
    /// </summary>
    public int SpeedPercent { get; set; }
}
