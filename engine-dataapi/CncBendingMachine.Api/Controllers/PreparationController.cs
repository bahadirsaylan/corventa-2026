using CncBendingMachine.Application.Commands.Preparation;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Pre-bending preparation operations + sensor-triggered orchestration helpers.
/// </summary>
/// <remarks>
/// UI orchestration akışında (bkz. BendingJobController) bu controller'dan kullanılan endpoint'ler:
///   GET  /api/preparation/stages              — tüm stage listesi
///   GET  /api/preparation/recommend-stage     — profileA'ya göre uygun stage önerisi (Step 3)
///   POST /api/preparation/stage               — seçilen stage'e geçiş (Step 5)
///
/// Diğer endpoint'ler (gönye, clamp, release, zero, slack) makine hazırlık işlemleri için
/// — büküm akışında StartJob içinde otomatik çağrılırlar.
/// </remarks>
[ApiController]
[Route("api/[controller]")]
public class PreparationController : ControllerBase
{
    private readonly ILogger<PreparationController> _logger;
    private readonly ISender _mediator;
    private readonly IDataApiClient _dataApi;

    public PreparationController(ILogger<PreparationController> logger, ISender mediator, IDataApiClient dataApi)
    {
        _logger = logger;
        _mediator = mediator;
        _dataApi = dataApi;
    }

    /// <summary>
    /// Execute Gönye (reference position) operation
    /// </summary>
    /// <remarks>
    /// Establishes machine reference position. Process:
    /// 1. Retract all pistons to mechanical limit (until S1+S2 reach 70bar)
    /// 2. RESET all encoders at this reference point (MANDATORY)
    /// 3. Move pistons to Gönye offset positions
    ///
    /// Note: Encoder reset is now MANDATORY and happens automatically at Step 2.
    /// The first 500ms of pressure readings are ignored (startup pressure spike).
    /// </remarks>
    [HttpPost("gonye")]
    public async Task<IActionResult> ExecuteGonye([FromBody] GonyeRequest request)
    {
        var command = new ExecuteGonyeCommand
        {
            LowerPistonOffset = request.Configuration?.LowerPistonOffset ?? 10.5,
            LeftPistonOffset = request.Configuration?.LeftPistonOffset ?? 3.75,
            RightPistonOffset = request.Configuration?.RightPistonOffset ?? 3.75,
            RetractPressureBar = request.Configuration?.RetractPressureBar ?? 85,
            SpeedPercent = request.Configuration?.RetractSpeedPercent ?? 100  // MUST be 100% for retraction!
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Gönye operation completed");
            return Ok(result);
        }

        _logger.LogWarning("Gönye operation failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Get available stages
    /// </summary>
    [HttpGet("stages")]
    public async Task<IActionResult> GetStages()
    {
        var stages = await _mediator.Send(new GetStagesQuery());
        return Ok(stages);
    }

    /// <summary>
    /// Profil A kenarına göre uygun stage öner.
    /// </summary>
    /// <remarks>
    /// Mantık: profileA &lt;= MaxProfileAMm olan en küçük (en düşük kapasiteli) aktif stage seçilir.
    /// Hiçbir stage uygun değilse 400 BadRequest döner — operatör profili veya MaxProfileAMm değerlerini gözden geçirmeli.
    ///
    /// MaxProfileAMm değeri null olan stage'ler otomatik seçimde göz ardı edilir
    /// (operatör DataApi /api/settings/stages üzerinden manuel ayarlayabilir).
    ///
    /// Geçici varsayılanlar: Stage 1 = 50mm, Stage 2 = 120mm, Stage 3 = 250mm.
    /// </remarks>
    [HttpGet("recommend-stage")]
    public async Task<IActionResult> RecommendStage([FromQuery] double profileA)
    {
        if (profileA <= 0)
            return BadRequest(new { error = "profileA sıfırdan büyük olmalı" });

        var stages = await _dataApi.GetStagesAsync();

        var recommended = stages
            .Where(s => s.IsActive && s.MaxProfileAMm.HasValue && profileA <= s.MaxProfileAMm.Value)
            .OrderBy(s => s.MaxProfileAMm!.Value)
            .FirstOrDefault();

        if (recommended == null)
        {
            var maxConfigured = stages
                .Where(s => s.MaxProfileAMm.HasValue)
                .Max(s => (double?)s.MaxProfileAMm!.Value);
            return BadRequest(new
            {
                error = $"ProfileA={profileA}mm için uygun stage bulunamadı (en yüksek konfigüre eşik: {maxConfigured}mm)",
                profileA,
                maxConfiguredMaxProfileAMm = maxConfigured
            });
        }

        _logger.LogInformation("Stage önerisi: profileA={ProfileA}mm → Stage {StageNumber} (max {Max}mm)",
            profileA, recommended.StageNumber, recommended.MaxProfileAMm);

        return Ok(new
        {
            stageNumber = recommended.StageNumber,
            stageId = recommended.Id,
            name = recommended.Name,
            maxProfileAMm = recommended.MaxProfileAMm,
            leftOffsetMm = recommended.LeftOffsetMm,
            rightOffsetMm = recommended.RightOffsetMm,
            lowerOffsetMm = recommended.LowerOffsetMm,
            reason = $"ProfileA={profileA}mm <= {recommended.MaxProfileAMm}mm ({recommended.Name})"
        });
    }

    /// <summary>
    /// Change machine stage (height configuration)
    /// </summary>
    /// <remarks>
    /// Stage 1: Gönye position (small capacity)
    /// Stage 2: 67.34mm Left, 60mm Lower, 67.34mm Right (medium capacity)
    /// Stage 3: 134.68mm Left, 120mm Lower, 134.68mm Right (high capacity)
    /// </remarks>
    [HttpPost("stage")]
    public async Task<IActionResult> ChangeStage([FromBody] StageChangeRequest request)
    {
        if (request.TargetStage < 1 || request.TargetStage > 3)
        {
            return BadRequest(PreparationResult.Fail("Stage", "Stage 1, 2 veya 3 olmalı"));
        }

        var command = new ChangeStageCommand
        {
            TargetStage = request.TargetStage,
            SpeedPercent = request.SpeedPercent
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Stage changed to {Stage}", request.TargetStage);
            return Ok(result);
        }

        _logger.LogWarning("Stage change failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Clamp work piece
    /// </summary>
    /// <remarks>
    /// Uses Upper piston to clamp the work piece against Lower piston.
    /// Prerequisite: Part presence sensor must be active (optional check).
    /// </remarks>
    [HttpPost("clamp")]
    public async Task<IActionResult> ClampPart([FromBody] ClampingRequest request)
    {
        var command = new ClampPartCommand
        {
            PressureBar = request.PressureBar,
            SpeedPercent = request.SpeedPercent,
            WaitForPartSensor = true,
            SensorSide = "Left" // Default to left sensor
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Part clamped at {Pressure} bar", request.PressureBar);
            return Ok(result);
        }

        _logger.LogWarning("Part clamping failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Clamp work piece with sensor side specification
    /// </summary>
    [HttpPost("clamp/{sensorSide}")]
    public async Task<IActionResult> ClampPartWithSensor(string sensorSide, [FromBody] ClampingRequest request)
    {
        if (sensorSide != "Left" && sensorSide != "Right" && sensorSide != "left" && sensorSide != "right")
        {
            return BadRequest(PreparationResult.Fail("Clamp", "Sensör tarafı Left veya Right olmalı"));
        }

        var command = new ClampPartCommand
        {
            PressureBar = request.PressureBar,
            SpeedPercent = request.SpeedPercent,
            WaitForPartSensor = true,
            SensorSide = char.ToUpper(sensorSide[0]) + sensorSide.Substring(1).ToLower()
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Part clamped at {Pressure} bar (sensor: {Side})", request.PressureBar, sensorSide);
            return Ok(result);
        }

        _logger.LogWarning("Part clamping failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Release clamped work piece
    /// </summary>
    [HttpPost("release")]
    public async Task<IActionResult> ReleasePart([FromBody] ReleaseRequest? request)
    {
        var command = new ReleasePartCommand
        {
            SpeedPercent = request?.SpeedPercent ?? 50,
            ReleasePositionMm = request?.ReleasePositionMm ?? 0
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Part released");
            return Ok(result);
        }

        _logger.LogWarning("Part release failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Zero (reference) work piece position
    /// </summary>
    /// <remarks>
    /// 1. Move away from sensor
    /// 2. Slow approach to sensor
    /// 3. Move to start position (ResetDistance - SafetyDistance)
    /// </remarks>
    [HttpPost("zero")]
    public async Task<IActionResult> ZeroPart([FromBody] ZeroingRequest request)
    {
        var command = new ZeroPartCommand
        {
            SensorSide = request.SensorSide,
            ResetDistanceMm = request.ResetDistanceMm,
            SafetyDistanceMm = request.SafetyDistanceMm,
            FastSpeedPercent = 80,
            SlowSpeedPercent = 10,
            PositionSpeedPercent = request.SpeedPercent
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Part zeroed (sensor: {Side})", request.SensorSide);
            return Ok(result);
        }

        _logger.LogWarning("Part zeroing failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Take up slack before bending step
    /// </summary>
    /// <remarks>
    /// Moves Lower piston forward until target pressure to eliminate play.
    /// </remarks>
    [HttpPost("slack")]
    public async Task<IActionResult> TakeUpSlack([FromBody] SlackRequest? request)
    {
        var command = new TakeUpSlackCommand
        {
            PressureBar = request?.PressureBar ?? 30,
            SpeedPercent = request?.SpeedPercent ?? 50
        };

        var result = await _mediator.Send(command);

        if (result.Success)
        {
            _logger.LogInformation("Slack taken up at {Pressure} bar", command.PressureBar);
            return Ok(result);
        }

        _logger.LogWarning("Slack take-up failed: {Error}", result.ErrorMessage);
        return BadRequest(result);
    }

    /// <summary>
    /// Get current preparation state
    /// </summary>
    [HttpGet("state")]
    public async Task<IActionResult> GetPreparationState()
    {
        var state = await _mediator.Send(new GetPreparationStateQuery());
        return Ok(state);
    }
}

/// <summary>
/// Request for part release
/// </summary>
public class ReleaseRequest
{
    /// <summary>
    /// Speed percent for release movement
    /// </summary>
    public int SpeedPercent { get; set; } = 50;

    /// <summary>
    /// Target position after release (mm)
    /// </summary>
    public double ReleasePositionMm { get; set; } = 0;
}

/// <summary>
/// Request for slack take-up
/// </summary>
public class SlackRequest
{
    /// <summary>
    /// Target pressure (bar)
    /// </summary>
    public int PressureBar { get; set; } = 30;

    /// <summary>
    /// Speed percent
    /// </summary>
    public int SpeedPercent { get; set; } = 50;
}
