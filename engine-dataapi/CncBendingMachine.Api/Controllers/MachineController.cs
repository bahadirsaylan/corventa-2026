using CncBendingMachine.Application.Commands.Emergency;
using CncBendingMachine.Application.Commands.Machine;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.Api.Controllers;

/// <summary>
/// Machine system control - motor, fan, mode
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MachineController : ControllerBase
{
    private readonly ILogger<MachineController> _logger;
    private readonly ISender _mediator;
    private readonly IMachineOrchestrator _orchestrator;
    private readonly IPlcDriver _plcDriver;

    public MachineController(
        ILogger<MachineController> logger,
        ISender mediator,
        IMachineOrchestrator orchestrator,
        IPlcDriver plcDriver)
    {
        _logger = logger;
        _mediator = mediator;
        _orchestrator = orchestrator;
        _plcDriver = plcDriver;
    }

    /// <summary>
    /// Get current machine state (from orchestrator cache)
    /// </summary>
    [HttpGet("state")]
    public IActionResult GetState()
    {
        return Ok(_orchestrator.CurrentState);
    }

    /// <summary>
    /// Get live machine state (fresh read from PLC)
    /// </summary>
    [HttpGet("state/live")]
    public async Task<IActionResult> GetStateLive()
    {
        var state = await _plcDriver.ReadMachineStateAsync();
        return Ok(state);
    }

    /// <summary>
    /// Set machine mode
    /// </summary>
    [HttpPost("mode")]
    public async Task<IActionResult> SetMode([FromBody] SetModeRequest request)
    {
        var result = await _mediator.Send(new SetMachineModeCommand { Mode = request.Mode });

        if (result.Success)
        {
            _logger.LogInformation("Mode set to {Mode}", request.Mode);
            return Ok(new { Success = true, Message = result.Message, Mode = request.Mode });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Control hydraulic motor
    /// </summary>
    [HttpPost("motor")]
    public async Task<IActionResult> SetMotor([FromBody] SetBoolRequest request)
    {
        var result = await _mediator.Send(new SetHydraulicMotorCommand { TurnOn = request.Value });

        if (result.Success)
        {
            _logger.LogInformation("Hydraulic motor {State}", request.Value ? "ON" : "OFF");
            return Ok(new { Success = true, Message = result.Message, MotorOn = request.Value });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Control fan
    /// </summary>
    [HttpPost("fan")]
    public async Task<IActionResult> SetFan([FromBody] SetBoolRequest request)
    {
        var result = await _mediator.Send(new SetFanCommand { TurnOn = request.Value });

        if (result.Success)
        {
            _logger.LogInformation("Fan {State}", request.Value ? "ON" : "OFF");
            return Ok(new { Success = true, Message = result.Message, FanOn = request.Value });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Control alarm
    /// </summary>
    [HttpPost("alarm")]
    public async Task<IActionResult> SetAlarm([FromBody] SetBoolRequest request)
    {
        var result = await _mediator.Send(new SetAlarmCommand { TurnOn = request.Value });

        if (result.Success)
        {
            _logger.LogInformation("Alarm {State}", request.Value ? "ON" : "OFF");
            return Ok(new { Success = true, Message = result.Message, AlarmOn = request.Value });
        }

        return BadRequest(new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Emergency stop - stops all movements immediately
    /// </summary>
    [HttpPost("emergency-stop")]
    public async Task<IActionResult> EmergencyStop()
    {
        _logger.LogWarning("EMERGENCY STOP requested via API");

        var result = await _mediator.Send(new EmergencyStopCommand());

        if (result.Success)
        {
            return Ok(new { Success = true, Message = result.Message });
        }

        return StatusCode(500, new { Success = false, Error = result.Error });
    }

    /// <summary>
    /// Zero (tare) the SLPIS sensor
    /// </summary>
    [HttpPost("slpis/zero")]
    public IActionResult ZeroSlpisSensor()
    {
        _orchestrator.ZeroSlpisSensor();
        _logger.LogInformation("SLPIS sensor zeroed");
        return Ok(new { Success = true, Message = "SLPIS sensör sıfırlandı" });
    }

    /// <summary>
    /// Clear the SLPIS sensor zero reference
    /// </summary>
    [HttpPost("slpis/zero/clear")]
    public IActionResult ClearSlpisSensorZero()
    {
        _orchestrator.ClearSlpisSensorZero();
        _logger.LogInformation("SLPIS sensor zero cleared");
        return Ok(new { Success = true, Message = "SLPIS sensör sıfırı temizlendi" });
    }

    /// <summary>
    /// Set manual zero offset for the SLPIS sensor
    /// </summary>
    [HttpPost("slpis/zero/manual")]
    public IActionResult SetSlpisZeroOffset([FromBody] SlpisZeroOffsetRequest request)
    {
        _orchestrator.SetSlpisZeroOffset(request.OffsetMm);
        _logger.LogInformation("SLPIS sensor manual zero offset set to {Offset}mm", request.OffsetMm);
        return Ok(new { Success = true, Message = $"SLPIS sensör sıfır ofseti {request.OffsetMm:F3}mm olarak ayarlandı" });
    }

    public class SlpisZeroOffsetRequest
    {
        public double OffsetMm { get; set; }
    }

    /// <summary>
    /// Get driver info
    /// </summary>
    [HttpGet("info")]
    public IActionResult GetInfo()
    {
        return Ok(new
        {
            IsConnected = _plcDriver.IsConnected,
            IsSimulationMode = _plcDriver.IsSimulationMode,
            IsReady = _orchestrator.IsReady,
            LastError = _orchestrator.LastError
        });
    }

    /// <summary>
    /// Record pressure profile over time for diagnostic purposes
    /// Use this to measure how long a certain pressure is seen during operations
    /// </summary>
    /// <param name="durationMs">Total recording duration in milliseconds (default: 5000)</param>
    /// <param name="intervalMs">Sample interval in milliseconds (default: 10)</param>
    [HttpGet("pressure-profile")]
    public async Task<IActionResult> RecordPressureProfile(
        [FromQuery] int durationMs = 5000,
        [FromQuery] int intervalMs = 10)
    {
        if (durationMs < 100 || durationMs > 60000)
            return BadRequest(new { Error = "Duration must be between 100ms and 60000ms" });

        if (intervalMs < 5 || intervalMs > 1000)
            return BadRequest(new { Error = "Interval must be between 5ms and 1000ms" });

        _logger.LogInformation("Starting pressure profile recording: {Duration}ms, interval={Interval}ms",
            durationMs, intervalMs);

        var samples = new List<PressureSample>();
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var startTime = DateTime.UtcNow;

        while (stopwatch.ElapsedMilliseconds < durationMs)
        {
            var state = await _plcDriver.ReadMachineStateAsync();

            samples.Add(new PressureSample
            {
                TimestampMs = stopwatch.ElapsedMilliseconds,
                S1PressureBar = state.Sensors.S1PressureBar,
                S2PressureBar = state.Sensors.S2PressureBar,
                UpperPistonMoving = state.UpperPiston.Moving,
                UpperPistonInPosition = state.UpperPiston.InPosition
            });

            await Task.Delay(intervalMs);
        }

        stopwatch.Stop();

        // Analyze the data
        var analysis = AnalyzePressureProfile(samples);

        _logger.LogInformation("Pressure profile recorded: {SampleCount} samples", samples.Count);

        return Ok(new PressureProfileResult
        {
            StartTime = startTime,
            DurationMs = stopwatch.ElapsedMilliseconds,
            SampleCount = samples.Count,
            IntervalMs = intervalMs,
            Samples = samples,
            Analysis = analysis
        });
    }

    private PressureAnalysis AnalyzePressureProfile(List<PressureSample> samples)
    {
        if (samples.Count == 0)
            return new PressureAnalysis();

        var s1Values = samples.Select(s => s.S1PressureBar).ToList();
        var s2Values = samples.Select(s => s.S2PressureBar).ToList();

        // Find pressure ranges and durations
        var s1Ranges = CalculatePressureRanges(samples, s => s.S1PressureBar);
        var s2Ranges = CalculatePressureRanges(samples, s => s.S2PressureBar);

        return new PressureAnalysis
        {
            S1MinBar = s1Values.Min(),
            S1MaxBar = s1Values.Max(),
            S1AvgBar = s1Values.Average(),
            S2MinBar = s2Values.Min(),
            S2MaxBar = s2Values.Max(),
            S2AvgBar = s2Values.Average(),
            S1PressureRanges = s1Ranges,
            S2PressureRanges = s2Ranges
        };
    }

    private List<PressureRangeDuration> CalculatePressureRanges(
        List<PressureSample> samples,
        Func<PressureSample, int> pressureSelector)
    {
        // Define pressure ranges: 0-50, 50-100, 100-150, 150-200, 200+
        var ranges = new Dictionary<string, (int count, long firstMs, long lastMs)>
        {
            ["0-50 bar"] = (0, -1, -1),
            ["50-100 bar"] = (0, -1, -1),
            ["100-150 bar"] = (0, -1, -1),
            ["150-200 bar"] = (0, -1, -1),
            ["200+ bar"] = (0, -1, -1)
        };

        foreach (var sample in samples)
        {
            int pressure = pressureSelector(sample);
            string rangeKey = pressure switch
            {
                < 50 => "0-50 bar",
                < 100 => "50-100 bar",
                < 150 => "100-150 bar",
                < 200 => "150-200 bar",
                _ => "200+ bar"
            };

            var (count, firstMs, lastMs) = ranges[rangeKey];
            if (firstMs == -1) firstMs = sample.TimestampMs;
            lastMs = sample.TimestampMs;
            ranges[rangeKey] = (count + 1, firstMs, lastMs);
        }

        return ranges
            .Where(r => r.Value.count > 0)
            .Select(r => new PressureRangeDuration
            {
                Range = r.Key,
                SampleCount = r.Value.count,
                FirstSeenMs = r.Value.firstMs,
                LastSeenMs = r.Value.lastMs,
                ApproxDurationMs = r.Value.lastMs - r.Value.firstMs
            })
            .OrderBy(r => r.Range)
            .ToList();
    }
}

public class PressureSample
{
    public long TimestampMs { get; set; }
    public int S1PressureBar { get; set; }
    public int S2PressureBar { get; set; }
    public bool UpperPistonMoving { get; set; }
    public bool UpperPistonInPosition { get; set; }
}

public class PressureProfileResult
{
    public DateTime StartTime { get; set; }
    public long DurationMs { get; set; }
    public int SampleCount { get; set; }
    public int IntervalMs { get; set; }
    public List<PressureSample> Samples { get; set; } = new();
    public PressureAnalysis Analysis { get; set; } = new();
}

public class PressureAnalysis
{
    public int S1MinBar { get; set; }
    public int S1MaxBar { get; set; }
    public double S1AvgBar { get; set; }
    public int S2MinBar { get; set; }
    public int S2MaxBar { get; set; }
    public double S2AvgBar { get; set; }
    public List<PressureRangeDuration> S1PressureRanges { get; set; } = new();
    public List<PressureRangeDuration> S2PressureRanges { get; set; } = new();
}

public class PressureRangeDuration
{
    public string Range { get; set; } = "";
    public int SampleCount { get; set; }
    public long FirstSeenMs { get; set; }
    public long LastSeenMs { get; set; }
    public long ApproxDurationMs { get; set; }
}

public class SetModeRequest
{
    public MachineMode Mode { get; set; }
}

public class SetBoolRequest
{
    public bool Value { get; set; }
}
