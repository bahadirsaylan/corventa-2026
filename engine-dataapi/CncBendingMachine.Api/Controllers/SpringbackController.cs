using CncBendingMachine.Application.Commands.Springback;
using CncBendingMachine.Core.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Springback (Geri Esneme) measurement control
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SpringbackController : ControllerBase
{
    private readonly ILogger<SpringbackController> _logger;
    private readonly ISender _mediator;
    private readonly IMachineSettingsRepository _settingsRepo;

    public SpringbackController(ILogger<SpringbackController> logger, ISender mediator, IMachineSettingsRepository settingsRepo)
    {
        _logger = logger;
        _mediator = mediator;
        _settingsRepo = settingsRepo;
    }

    /// <summary>
    /// Semi-automatic springback correction
    /// Correct flow: Measure → Calculate → Correct both sides with rotation → Repeat
    /// </summary>
    [HttpPost("auto-correct")]
    public async Task<IActionResult> AutoCorrect([FromBody] AutoCorrectRequest request)
    {
        // DataApi'den SLPIS sensör parametrelerini oku
        var settings = await _settingsRepo.GetMachineSettingsAsync();

        var result = await _mediator.Send(new SpringbackAutoCorrectCommand
        {
            TargetDiameterMm = request.TargetDiameterMm,
            PartSide = request.PartSide,
            PartLengthMm = request.PartLengthMm,
            SafetyMarginMm = request.SafetyMarginMm,
            SlackPressureBar = request.SlackPressureBar,
            // Boşluk alma HER ZAMAN mesafe-bazlı (DB default: 0.2mm). User override varsa onu kullan.
            SlackDistanceMm = request.SlackDistanceMm ?? settings?.DefaultSlackDistanceMm ?? 0.2,
            ClampPressureBar = request.ClampPressureBar,
            MaxIterations = request.MaxIterations,
            ToleranceMm = request.ToleranceMm,
            MovementSpeedPercent = request.MovementSpeedPercent,
            RotationSpeedPercent = request.RotationSpeedPercent,
            PartWidthMm = request.PartWidthMm,
            SlpisZeroOffsetMm = settings?.SlpisZeroOffsetMm ?? 0,
            SlpisLMm = settings?.SlpisLMm ?? 70.0,
            SlpisRulmanCapMm = settings?.SlpisRulmanCapMm ?? 35.0,
            MeasurementParams = new SpringbackMeasurementParams
            {
                IncreaseThresholdMm = request.MeasurementParams?.IncreaseThresholdMm ?? 0.2,
                MinThresholdMm = request.MeasurementParams?.MinThresholdMm ?? 0.1,
                StableTimeMs = request.MeasurementParams?.StableTimeMs ?? 500
            },
            MachineParams = new AutoCorrectMachineParams
            {
                BallDiameterMm = request.MachineParams.BallDiameterMm,
                ThicknessMm = request.MachineParams.ThicknessMm,
                CenterDistanceMm = request.MachineParams.CenterDistanceMm,
                ThetaDeg = request.MachineParams.ThetaDeg,
                XA1 = request.MachineParams.XA1,
                YA1 = request.MachineParams.YA1
            }
        });

        if (result.Success)
        {
            _logger.LogInformation(
                "Springback auto-correct completed: {Iterations} iterations, final error: {Error}mm",
                result.TotalIterations,
                result.FinalErrorMm);
            return Ok(result);
        }

        _logger.LogWarning("Springback auto-correct failed: {Error}", result.Error);
        return BadRequest(result);
    }

    /// <summary>
    /// Stop ongoing springback auto-correct operation
    /// </summary>
    [HttpPost("auto-correct/stop")]
    public async Task<IActionResult> StopAutoCorrect()
    {
        var result = await _mediator.Send(new StopSpringbackAutoCorrectCommand());

        if (result)
        {
            _logger.LogInformation("Springback auto-correct stopped");
            return Ok(new { Success = true, Message = "Springback auto-correct stopped" });
        }

        return BadRequest(new { Success = false, Error = "Failed to stop springback auto-correct" });
    }

    /// <summary>
    /// Start springback measurement on specified side
    /// </summary>
    /// <param name="side">Measuring side: "right" or "left"</param>
    /// <param name="request">Optional threshold parameters</param>
    [HttpPost("{side}/start")]
    public async Task<IActionResult> Start(string side, [FromBody] SpringbackStartRequest? request = null)
    {
        int sideValue = ParseSide(side);

        var result = await _mediator.Send(new SpringbackStartCommand
        {
            Side = sideValue,
            IncreaseThresholdMm = request?.IncreaseThresholdMm ?? 0.2,
            MinThresholdMm = request?.MinThresholdMm ?? 0.1,
            StableTimeMs = request?.StableTimeMs ?? 500
        });

        if (result.Success)
        {
            _logger.LogInformation("Springback measurement started on {Side} side", side);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Stop/cancel springback measurement
    /// </summary>
    [HttpPost("stop")]
    public async Task<IActionResult> Stop()
    {
        var result = await _mediator.Send(new SpringbackStopCommand());

        if (result.Success)
        {
            _logger.LogInformation("Springback measurement stopped");
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Set detection thresholds without starting measurement
    /// </summary>
    [HttpPost("thresholds")]
    public async Task<IActionResult> SetThresholds([FromBody] SetThresholdsRequest request)
    {
        var result = await _mediator.Send(new SetSpringbackThresholdsCommand
        {
            IncreaseThresholdMm = request.IncreaseThresholdMm,
            MinThresholdMm = request.MinThresholdMm,
            StableTimeMs = request.StableTimeMs
        });

        if (result.Success)
        {
            _logger.LogInformation("Springback thresholds set: increase={Increase}mm, min={Min}mm, stable={Stable}ms",
                request.IncreaseThresholdMm, request.MinThresholdMm, request.StableTimeMs);
            return Ok(new { Success = true, Message = result.Message });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// EXPERIMENTAL: SLPIS sensörlü geri esneme ölçümü
    /// Pnömatik uzat → sensör değeri oku → R = (L² + H²) / (2H) formülü ile radyüs hesapla
    /// </summary>
    [HttpPost("experimental/{side}")]
    public async Task<IActionResult> ExperimentalMeasure(string side, [FromBody] ExperimentalMeasureRequest? request = null)
    {
        _logger.LogInformation("SLPIS experimental measurement requested for {Side}, PartWidth={Width}mm",
            side, request?.PartWidthMm);

        var result = await _mediator.Send(new SpringbackExperimentalMeasureCommand
        {
            Side = side,
            PartWidthMm = request?.PartWidthMm ?? 0,
            PneumaticWaitMs = request?.PneumaticWaitMs ?? 5000,
            StableTimeMs = request?.StableTimeMs ?? 1000,
            StableThresholdMm = request?.StableThresholdMm ?? 0.05,
            TimeoutMs = request?.TimeoutMs ?? 15000,
            AverageSampleCount = request?.AverageSampleCount ?? 5
        });

        if (result.Success)
        {
            _logger.LogInformation(
                "SLPIS measurement completed: H={H:F3}mm, R={R:F2}mm, D={D:F2}mm",
                result.SensorValueMm,
                result.RadiusMm,
                result.DiameterMm);
            return Ok(result);
        }

        _logger.LogWarning("SLPIS measurement failed: {Error}", result.Error);
        return BadRequest(result);
    }

    /// <summary>
    /// Calculate correction after springback measurement completes
    /// Uses Goal-Seek to find actual diameter from position, then applies correction formula
    /// </summary>
    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateCorrection([FromBody] CalculateCorrectionRequest request)
    {
        var result = await _mediator.Send(new CalculateSpringbackCorrectionCommand
        {
            IterationNumber = request.IterationNumber,
            TargetDiameterMm = request.TargetDiameterMm,
            PreviousDiameterMm = request.PreviousDiameterMm,
            SpringbackPositionMm = request.SpringbackPositionMm,
            MachineParams = new MachineParameters
            {
                BallDiameterMm = request.BallDiameterMm,
                ThicknessMm = request.ThicknessMm,
                CenterDistanceMm = request.CenterDistanceMm,
                ThetaDeg = request.ThetaDeg,
                XA1 = request.XA1,
                YA1 = request.YA1
            }
        });

        if (result.Success)
        {
            return Ok(result);
        }

        return BadRequest(result);
    }

    private int ParseSide(string side)
    {
        return side.ToLower() switch
        {
            "right" => 1,
            "left" => -1,
            _ => throw new ArgumentException($"Invalid side: {side}. Use 'right' or 'left'")
        };
    }
}

/// <summary>
/// Request model for starting springback measurement
/// </summary>
public class SpringbackStartRequest
{
    /// <summary>
    /// Increase threshold in mm (default 0.2)
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Above-minimum threshold in mm (default 0.1)
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Stable time in ms (default 500)
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}

/// <summary>
/// Request model for setting thresholds
/// </summary>
public class SetThresholdsRequest
{
    /// <summary>
    /// Increase threshold in mm (default 0.2)
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Above-minimum threshold in mm (default 0.1)
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Stable time in ms (default 500)
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}

/// <summary>
/// Request model for calculating springback correction
/// </summary>
public class CalculateCorrectionRequest
{
    /// <summary>
    /// Iteration number (1-based)
    /// </summary>
    public int IterationNumber { get; set; } = 1;

    /// <summary>
    /// Target (desired) bending diameter in mm
    /// </summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>
    /// Diameter used in this iteration (first iteration = TargetDiameter)
    /// </summary>
    public double PreviousDiameterMm { get; set; }

    /// <summary>
    /// Piston position from springback measurement (mm)
    /// </summary>
    public double SpringbackPositionMm { get; set; }

    /// <summary>
    /// Ball diameter in mm (default 220)
    /// </summary>
    public double BallDiameterMm { get; set; } = 220.0;

    /// <summary>
    /// Profile wall thickness in mm
    /// </summary>
    public double ThicknessMm { get; set; }

    /// <summary>
    /// Center distance BC in mm (default 490)
    /// </summary>
    public double CenterDistanceMm { get; set; } = 490.0;

    /// <summary>
    /// Theta angle in degrees (default 45)
    /// </summary>
    public double ThetaDeg { get; set; } = 45.0;

    /// <summary>
    /// XA1 coordinate
    /// </summary>
    public double XA1 { get; set; } = 0.0;

    /// <summary>
    /// YA1 coordinate
    /// </summary>
    public double YA1 { get; set; } = 0.0;
}

/// <summary>
/// Request model for semi-automatic springback correction
/// </summary>
public class AutoCorrectRequest
{
    /// <summary>
    /// Target bending diameter in mm
    /// </summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>
    /// Which side the part is currently on: "right" or "left"
    /// (Based on which piston did the last bending)
    /// </summary>
    public string PartSide { get; set; } = "right";

    /// <summary>
    /// Part length in mm (for rotation distance calculation)
    /// </summary>
    public double PartLengthMm { get; set; }

    /// <summary>
    /// Safety margin in mm - rotation = part length - (safety * 2)
    /// </summary>
    public double SafetyMarginMm { get; set; } = 50.0;

    /// <summary>
    /// Upper piston slack pressure in bar (default: 155)
    /// NOT: SlackDistanceMm tanımlıysa bu değer kullanılmaz
    /// </summary>
    public int SlackPressureBar { get; set; } = 155;

    /// <summary>
    /// Üst piston boşluk alma mesafesi (mm) - mesafe bazlı boşluk alma
    /// Bu değer tanımlıysa basınç bazlı yerine mesafe bazlı boşluk alma kullanılır
    /// Örneğin: 0.5mm girildiyse üst piston mevcut konumundan 0.5mm ilerler
    /// </summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>
    /// Upper piston clamp pressure in bar (default: 155)
    /// </summary>
    public int ClampPressureBar { get; set; } = 155;

    /// <summary>
    /// Maximum iterations (default: 5)
    /// </summary>
    public int MaxIterations { get; set; } = 5;

    /// <summary>
    /// Tolerance in mm - errors below this are accepted (default: 10mm)
    /// </summary>
    public double ToleranceMm { get; set; } = 10.0;

    /// <summary>
    /// Movement speed percent (default: 50%)
    /// </summary>
    public int MovementSpeedPercent { get; set; } = 50;

    /// <summary>
    /// Rotation speed percent (default: 50%)
    /// </summary>
    public int RotationSpeedPercent { get; set; } = 50;

    /// <summary>
    /// Parça genişliği (mm) - SLPIS formülünde L = PartWidthMm / 2 olarak kullanılır
    /// </summary>
    public double PartWidthMm { get; set; }

    /// <summary>
    /// SLPIS sensör ölçüm parametreleri
    /// </summary>
    public AutoCorrectMeasurementParams? MeasurementParams { get; set; }

    /// <summary>
    /// Machine parameters for calculation
    /// </summary>
    public AutoCorrectMachineParamsRequest MachineParams { get; set; } = new();
}

/// <summary>
/// PLC sıyrılma tespit parametreleri for auto-correct
/// </summary>
public class AutoCorrectMeasurementParams
{
    /// <summary>
    /// Artış eşiği (mm) — başlangıç değerinden bu kadar artış = sıyrılma (default 0.2)
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Minimum üstü eşik (mm) — minimum değerden bu kadar artış = sıyrılma (default 0.1)
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Sabitlenme süresi (ms) — PLC doğrulama süresi (default 500)
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}

/// <summary>
/// Machine parameters for auto-correct calculation
/// </summary>
public class AutoCorrectMachineParamsRequest
{
    /// <summary>
    /// Ball diameter in mm (default 220)
    /// </summary>
    public double BallDiameterMm { get; set; } = 220.0;

    /// <summary>
    /// Profile HEIGHT in mm (NOT wall thickness!)
    /// </summary>
    public double ThicknessMm { get; set; }

    /// <summary>
    /// Center distance BC in mm (default 300.82)
    /// </summary>
    public double CenterDistanceMm { get; set; } = 300.82;

    /// <summary>
    /// Theta angle in degrees (default 63)
    /// </summary>
    public double ThetaDeg { get; set; } = 63.0;

    /// <summary>
    /// XA1 coordinate (default -465)
    /// </summary>
    public double XA1 { get; set; } = -465.0;

    /// <summary>
    /// YA1 coordinate
    /// </summary>
    public double YA1 { get; set; } = 0.0;
}

/// <summary>
/// Request model for SLPIS experimental springback measurement
/// </summary>
public class ExperimentalMeasureRequest
{
    /// <summary>
    /// Parça genişliği (mm) - formülde L = PartWidthMm / 2 olarak kullanılır
    /// </summary>
    public double PartWidthMm { get; set; }

    /// <summary>
    /// Pnömatik bekleme süresi (ms) - sensörün parçaya oturması için (default 5000)
    /// </summary>
    public int PneumaticWaitMs { get; set; } = 5000;

    /// <summary>
    /// Sensör stabilite süresi (ms) - değer sabitlenene kadar bekle (default 1000)
    /// </summary>
    public int StableTimeMs { get; set; } = 1000;

    /// <summary>
    /// Stabilite eşiği (mm) - ardışık okumalar arası fark (default 0.05)
    /// </summary>
    public double StableThresholdMm { get; set; } = 0.05;

    /// <summary>
    /// Ölçüm zaman aşımı (ms) (default 15000)
    /// </summary>
    public int TimeoutMs { get; set; } = 15000;

    /// <summary>
    /// Sabitlendikten sonra kaç okuma ortalaması alınsın (default 5)
    /// </summary>
    public int AverageSampleCount { get; set; } = 5;
}
