using CncBendingMachine.Application.Commands.Bending;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Bending calculation and control
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BendingController : ControllerBase
{
    private readonly ILogger<BendingController> _logger;
    private readonly ISender _mediator;

    public BendingController(ILogger<BendingController> logger, ISender mediator)
    {
        _logger = logger;
        _mediator = mediator;
    }

    /// <summary>
    /// Calculate piston position from bending parameters
    /// </summary>
    /// <remarks>
    /// Given a target bending diameter and machine parameters,
    /// calculates the required piston position.
    /// </remarks>
    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] BendingCalculationRequest request)
    {
        var command = new CalculateBendingCommand
        {
            BallDiameter = request.BallDiameter,
            Thickness = request.Thickness,
            CenterDistance = request.CenterDistance,
            TargetBendingDiameter = request.TargetBendingDiameter,
            XA1 = request.XA1,
            YA1 = request.YA1,
            Theta = request.Theta
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation(
                "Bending calculation: Diameter={Diameter}mm -> Piston={Position}mm",
                request.TargetBendingDiameter, result.PistonPosition);

            return Ok(new BendingCalculationResponse
            {
                Success = true,
                PistonPosition = result.PistonPosition,
                XArc = result.XArc,
                YArc = result.YArc,
                Discriminant = result.Discriminant,
                BallRadius = result.BallRadius,
                ArcRadius = result.ArcRadius,
                K = result.K,
                R2 = result.R2
            });
        }

        _logger.LogWarning("Bending calculation failed: {Error}", result.ErrorMessage);
        return BadRequest(new { Success = false, Error = result.ErrorMessage });
    }

    /// <summary>
    /// Reverse calculation: Get bending diameter from piston position
    /// </summary>
    /// <remarks>
    /// Given a piston position, calculates the approximate bending diameter.
    /// Useful for display when manually positioning pistons.
    /// </remarks>
    [HttpPost("calculate-diameter")]
    public async Task<IActionResult> CalculateDiameter([FromBody] DiameterFromPositionRequest request)
    {
        var command = new CalculateDiameterFromPositionCommand
        {
            PistonPosition = request.PistonPosition,
            BallDiameter = request.BallDiameter,
            Thickness = request.Thickness,
            CenterDistance = request.CenterDistance,
            XA1 = request.XA1,
            YA1 = request.YA1,
            Theta = request.Theta
        };

        var result = await _mediator.Send(command);

        if (result.HasValue)
        {
            _logger.LogInformation(
                "Diameter calculation: Piston={Position}mm -> Diameter={Diameter}mm",
                request.PistonPosition, result.Value);

            return Ok(new { Success = true, BendingDiameter = result.Value });
        }

        return BadRequest(new { Success = false, Error = "Hesaplanamadi" });
    }

    // ============================================================
    // GEOMETRIC BENDING ENDPOINTS
    // ============================================================

    /// <summary>
    /// Preview geometric bending - generate paso steps without executing
    /// </summary>
    /// <remarks>
    /// Calculates all paso (step) operations needed for the bending.
    /// Use this to preview the bending plan before executing.
    /// </remarks>
    [HttpPost("geometric/preview")]
    public async Task<IActionResult> PreviewGeometricBending([FromBody] GeometricBendingRequest request)
    {
        var command = new PreviewGeometricBendingCommand
        {
            TargetPositionMm = request.TargetPositionMm,
            PartLengthMm = request.PartLengthMm,
            SafetyMarginMm = request.SafetyMarginMm,
            StepDistanceMm = request.StepDistanceMm,
            FirstStepDistanceMm = request.FirstStepDistanceMm,
            ActiveSensorSide = request.ActiveSensorSide
        };

        var result = await _mediator.Send(command);

        _logger.LogInformation("Geometric bending preview: {TotalPasos} pasos generated", result.TotalPasos);

        return Ok(result);
    }

    /// <summary>
    /// Execute geometric bending operation
    /// </summary>
    /// <remarks>
    /// Prerequisites:
    /// 1. Gonye must be completed
    /// 2. Part must be clamped
    /// 3. Part must be zeroed
    /// 4. Hydraulic motor must be ready
    ///
    /// The operation will execute all paso steps sequentially:
    /// - Move active piston forward, passive piston backward
    /// - Execute rotation after pistons reach position
    /// - Repeat for each paso until target is reached
    /// - Final paso is repeated on opposite side for symmetry
    /// </remarks>
    [HttpPost("geometric/execute")]
    public async Task<IActionResult> ExecuteGeometricBending([FromBody] GeometricBendingRequest request)
    {
        _logger.LogInformation("Starting geometric bending: Target={Target}mm, PartLength={Length}mm",
            request.TargetPositionMm, request.PartLengthMm);

        var command = new ExecuteGeometricBendingCommand
        {
            TargetPositionMm = request.TargetPositionMm,
            PartLengthMm = request.PartLengthMm,
            SafetyMarginMm = request.SafetyMarginMm,
            StepDistanceMm = request.StepDistanceMm,
            FirstStepDistanceMm = request.FirstStepDistanceMm,
            ActiveSensorSide = request.ActiveSensorSide,
            PistonSpeedPercent = request.PistonSpeedPercent,
            RotationSpeedPercent = request.RotationSpeedPercent,
            SlackDistanceMm = request.SlackDistanceMm,
            SlackPressureBar = request.SlackPressureBar
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Geometric bending completed: {CompletedPasos} pasos", result.CompletedPasos);
            return Ok(result);
        }

        _logger.LogWarning("Geometric bending failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Stop ongoing bending operation
    /// </summary>
    /// <remarks>
    /// Cancels any ongoing bending operation and stops all movements.
    /// </remarks>
    [HttpPost("stop")]
    public async Task<IActionResult> StopBending()
    {
        _logger.LogWarning("Bending stop requested via API");

        var result = await _mediator.Send(new StopBendingCommand());

        if (result)
        {
            return Ok(new { Success = true, Message = "Bending stopped" });
        }

        return BadRequest(new { Success = false, Error = "Stop failed" });
    }
}

/// <summary>
/// Request for bending calculation
/// </summary>
public class BendingCalculationRequest
{
    /// <summary>
    /// Ball diameter (mm) - Default: 220
    /// </summary>
    public double BallDiameter { get; set; } = 220;

    /// <summary>
    /// Part thickness (mm) - Default: 80
    /// </summary>
    public double Thickness { get; set; } = 80;

    /// <summary>
    /// Ball center distance (mm) - Default: 300.82
    /// </summary>
    public double CenterDistance { get; set; } = 300.82;

    /// <summary>
    /// Target bending diameter (mm) - Required
    /// </summary>
    public double TargetBendingDiameter { get; set; }

    /// <summary>
    /// Left ball X coordinate (mm) - Default: -493
    /// </summary>
    public double XA1 { get; set; } = -493;

    /// <summary>
    /// Left ball Y coordinate (mm) - Default: 0
    /// </summary>
    public double YA1 { get; set; } = 0;

    /// <summary>
    /// Fixed angle (degrees) - Default: 63
    /// </summary>
    public double Theta { get; set; } = 63;
}

/// <summary>
/// Response for bending calculation
/// </summary>
public class BendingCalculationResponse
{
    public bool Success { get; set; }

    /// <summary>
    /// Target piston position (mm)
    /// </summary>
    public double PistonPosition { get; set; }

    /// <summary>
    /// Arc center X coordinate (mm)
    /// </summary>
    public double XArc { get; set; }

    /// <summary>
    /// Arc center Y coordinate (mm)
    /// </summary>
    public double YArc { get; set; }

    /// <summary>
    /// Discriminant value
    /// </summary>
    public double Discriminant { get; set; }

    /// <summary>
    /// Ball radius (mm)
    /// </summary>
    public double BallRadius { get; set; }

    /// <summary>
    /// Arc radius (mm)
    /// </summary>
    public double ArcRadius { get; set; }

    /// <summary>
    /// K value (mm)
    /// </summary>
    public double K { get; set; }

    /// <summary>
    /// R2 value (mm)
    /// </summary>
    public double R2 { get; set; }
}

/// <summary>
/// Request for reverse calculation (diameter from position)
/// </summary>
public class DiameterFromPositionRequest
{
    /// <summary>
    /// Current piston position (mm)
    /// </summary>
    public double PistonPosition { get; set; }

    /// <summary>
    /// Ball diameter (mm) - Default: 220
    /// </summary>
    public double BallDiameter { get; set; } = 220;

    /// <summary>
    /// Part thickness (mm) - Default: 80
    /// </summary>
    public double Thickness { get; set; } = 80;

    /// <summary>
    /// Ball center distance (mm) - Default: 300.82
    /// </summary>
    public double CenterDistance { get; set; } = 300.82;

    /// <summary>
    /// Left ball X coordinate (mm) - Default: -493
    /// </summary>
    public double XA1 { get; set; } = -493;

    /// <summary>
    /// Left ball Y coordinate (mm) - Default: 0
    /// </summary>
    public double YA1 { get; set; } = 0;

    /// <summary>
    /// Fixed angle (degrees) - Default: 63
    /// </summary>
    public double Theta { get; set; } = 63;
}

/// <summary>
/// Request for geometric bending operation
/// </summary>
public class GeometricBendingRequest
{
    /// <summary>
    /// Target piston position (mm) - calculated from bending formula
    /// </summary>
    public double TargetPositionMm { get; set; }

    /// <summary>
    /// Part length (mm)
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Safety margin on each end (mm) - Default: 50
    /// </summary>
    public double SafetyMarginMm { get; set; } = 50;

    /// <summary>
    /// Step distance for each paso (mm) - Default: 30
    /// </summary>
    public double StepDistanceMm { get; set; } = 30;

    /// <summary>
    /// Active sensor side ("Left" or "Right") - Default: "Left"
    /// Determines which piston starts as active
    /// </summary>
    public string ActiveSensorSide { get; set; } = "Left";

    /// <summary>
    /// Piston movement speed percent (0-100) - Default: 100
    /// </summary>
    public int PistonSpeedPercent { get; set; } = 100;

    /// <summary>
    /// Rotation speed percent (0-100) - Default: 100
    /// </summary>
    public int RotationSpeedPercent { get; set; } = 100;

    /// <summary>
    /// Üst piston boşluk alma mesafesi (mm) - mesafe bazlı boşluk alma
    /// Bu değer tanımlıysa basınç bazlı yerine mesafe bazlı boşluk alma kullanılır
    /// Örneğin: 0.5mm girildiyse üst piston mevcut konumundan 0.5mm ilerler
    /// </summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>
    /// Üst piston boşluk alma basıncı (bar) - basınç bazlı boşluk alma
    /// NOT: SlackDistanceMm tanımlıysa bu değer kullanılmaz
    /// Varsayılan: 157 bar
    /// </summary>
    public int SlackPressureBar { get; set; } = 157;

    /// <summary>
    /// İlk paso adım mesafesi (mm) - opsiyonel
    /// Tanımlıysa ilk paso bu mesafeyi kullanır (profil mukavemetini kırmak için)
    /// Örnek: StepDistanceMm=20, FirstStepDistanceMm=40 → 40, 60, 80, 100...
    /// Tanımlı değilse tüm pasolar StepDistanceMm kullanır
    /// </summary>
    public double? FirstStepDistanceMm { get; set; }
}
