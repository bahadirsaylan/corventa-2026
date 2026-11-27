using System.Net.Http.Json;

namespace CncBendingMachine.Web.Services;

/// <summary>
/// HTTP client for sending commands to the Machine API
/// </summary>
public class MachineApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MachineApiClient> _logger;

    public MachineApiClient(HttpClient httpClient, ILogger<MachineApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    // ==================== MACHINE CONTROL ====================

    public async Task<bool> SetHydraulicMotorAsync(bool turnOn)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/machine/motor", new { value = turnOn });
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Hydraulic motor {State}", turnOn ? "ON" : "OFF");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set hydraulic motor");
            return false;
        }
    }

    public async Task<bool> SetFanAsync(bool turnOn)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/machine/fan", new { value = turnOn });
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set fan");
            return false;
        }
    }

    public async Task<bool> SetAlarmAsync(bool turnOn)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/machine/alarm", new { value = turnOn });
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set alarm");
            return false;
        }
    }

    public async Task<bool> EmergencyStopAsync()
    {
        try
        {
            var response = await _httpClient.PostAsync("api/machine/emergency-stop", null);
            response.EnsureSuccessStatusCode();
            _logger.LogWarning("EMERGENCY STOP triggered from UI");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to trigger emergency stop");
            return false;
        }
    }

    // ==================== SLPIS SENSOR ====================

    public async Task<bool> ZeroSlpisSensorAsync()
    {
        try
        {
            var response = await _httpClient.PostAsync("api/machine/slpis/zero", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("SLPIS sensor zeroed");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to zero SLPIS sensor");
            return false;
        }
    }

    public async Task<bool> ClearSlpisSensorZeroAsync()
    {
        try
        {
            var response = await _httpClient.PostAsync("api/machine/slpis/zero/clear", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("SLPIS sensor zero cleared");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear SLPIS sensor zero");
            return false;
        }
    }

    public async Task<bool> SetSlpisZeroOffsetAsync(double offsetMm)
    {
        try
        {
            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new { offsetMm }),
                System.Text.Encoding.UTF8,
                "application/json");
            var response = await _httpClient.PostAsync("api/machine/slpis/zero/manual", content);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("SLPIS sensor manual zero offset set to {Offset}mm", offsetMm);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set SLPIS sensor zero offset");
            return false;
        }
    }

    // ==================== PISTON CONTROL ====================

    public async Task<bool> PistonJogAsync(string pistonId, int direction, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"api/piston/{pistonId}/jog",
                new { direction, speedPercent });
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Piston {Id} jog: dir={Dir}, speed={Speed}%",
                pistonId, direction, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to jog piston {Id}", pistonId);
            return false;
        }
    }

    public async Task<bool> PistonMoveToPositionAsync(string pistonId, double targetPositionMm, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"api/piston/{pistonId}/position",
                new { positionMm = targetPositionMm, speedPercent });
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Piston {Id} move to {Pos}mm at {Speed}%",
                pistonId, targetPositionMm, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move piston {Id} to position", pistonId);
            return false;
        }
    }

    public async Task<bool> PistonMoveToPressureAsync(string pistonId, int direction, int pressureBar, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"api/piston/{pistonId}/pressure",
                new { direction, pressureBar, speedPercent });
            response.EnsureSuccessStatusCode();
            string dirStr = direction == 1 ? "ileri" : "geri";
            _logger.LogInformation("Piston {Id} move {Dir} to {Pressure}bar at {Speed}%",
                pistonId, dirStr, pressureBar, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move piston {Id} to pressure", pistonId);
            return false;
        }
    }

    public async Task<bool> PistonStopAsync(string pistonId)
    {
        try
        {
            var response = await _httpClient.PostAsync($"api/piston/{pistonId}/stop", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Piston {Id} stopped", pistonId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop piston {Id}", pistonId);
            return false;
        }
    }

    // ==================== ROTATION CONTROL ====================

    public async Task<bool> RotationJogAsync(int direction, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/rotation/jog",
                new { direction, speedPercent });
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Rotation jog: dir={Dir}, speed={Speed}%", direction, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to jog rotation");
            return false;
        }
    }

    public async Task<bool> RotationMoveToPositionAsync(int positionMm, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/rotation/position",
                new { positionMm, speedPercent });
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Rotation move to {Position}mm at {Speed}%", positionMm, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move rotation to position");
            return false;
        }
    }

    public async Task<bool> RotationMoveDistanceAsync(int direction, int distanceMm, int speedPercent)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/rotation/distance",
                new { direction, distanceMm, speedPercent });
            response.EnsureSuccessStatusCode();
            string dirStr = direction == 1 ? "CW" : "CCW";
            _logger.LogInformation("Rotation move {Dir} {Distance}mm at {Speed}%", dirStr, distanceMm, speedPercent);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move rotation distance");
            return false;
        }
    }

    public async Task<bool> RotationStopAsync()
    {
        try
        {
            var response = await _httpClient.PostAsync("api/rotation/stop", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Rotation stopped");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop rotation");
            return false;
        }
    }

    // ==================== PNEUMATIC CONTROL ====================

    public async Task<bool> PneumaticForwardAsync(string side)
    {
        try
        {
            var response = await _httpClient.PostAsync($"api/pneumatic/{side}/forward", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Pneumatic {Side} forward", side);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move pneumatic {Side} forward", side);
            return false;
        }
    }

    public async Task<bool> PneumaticBackwardAsync(string side)
    {
        try
        {
            var response = await _httpClient.PostAsync($"api/pneumatic/{side}/backward", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Pneumatic {Side} backward", side);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to move pneumatic {Side} backward", side);
            return false;
        }
    }

    public async Task<bool> PneumaticStopAsync(string side)
    {
        try
        {
            var response = await _httpClient.PostAsync($"api/pneumatic/{side}/stop", null);
            response.EnsureSuccessStatusCode();
            _logger.LogInformation("Pneumatic {Side} stopped", side);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop pneumatic {Side}", side);
            return false;
        }
    }

    // ==================== BENDING CALCULATION ====================

    public async Task<BendingCalculationResult?> CalculateBendingAsync(BendingCalculationRequest request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/bending/calculate", request);
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<BendingCalculationResult>();
            _logger.LogInformation("Bending calculation: Diameter={Diameter}mm -> Piston={Position}mm",
                request.TargetBendingDiameter, result?.PistonPosition);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate bending");
            return null;
        }
    }

    // ==================== PREPARATION OPERATIONS ====================

    /// <summary>
    /// Execute Gönye (reference position) operation.
    /// Process:
    /// 1. All pistons retract to mechanical limit (S1+S2 reach 70bar)
    /// 2. All encoders are RESET at reference point (MANDATORY)
    /// 3. Pistons move to Gönye offset positions
    /// </summary>
    public async Task<PreparationResult?> ExecuteGonyeAsync()
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/gonye", new { });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Gönye executed - encoders reset at reference point");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute Gönye");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<StageInfo[]?> GetStagesAsync()
    {
        try
        {
            return await _httpClient.GetFromJsonAsync<StageInfo[]>("api/preparation/stages");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get stages");
            return null;
        }
    }

    public async Task<PreparationResult?> ChangeStageAsync(int targetStage, int speedPercent = 50)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/stage",
                new { TargetStage = targetStage, SpeedPercent = speedPercent });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Stage changed to {Stage}", targetStage);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change stage");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PreparationResult?> ClampPartAsync(int pressureBar = 155, int speedPercent = 30)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/clamp",
                new { PressureBar = pressureBar, SpeedPercent = speedPercent });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Part clamped at {Pressure} bar", pressureBar);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clamp part");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PreparationResult?> ReleasePartAsync(int speedPercent = 50)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/release",
                new { SpeedPercent = speedPercent, ReleasePositionMm = 0 });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Part released");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to release part");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PreparationResult?> ZeroPartAsync(string sensorSide = "Left", double resetDistanceMm = 690, double safetyDistanceMm = 50)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/zero",
                new { SensorSide = sensorSide, ResetDistanceMm = resetDistanceMm, SafetyDistanceMm = safetyDistanceMm, SpeedPercent = 50 });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Part zeroed");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to zero part");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PreparationResult?> TakeUpSlackAsync(int pressureBar = 30)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("api/preparation/slack",
                new { PressureBar = pressureBar, SpeedPercent = 50 });
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PreparationResult>();
            _logger.LogInformation("Slack taken up at {Pressure} bar", pressureBar);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to take up slack");
            return new PreparationResult { Success = false, ErrorMessage = ex.Message };
        }
    }
}

/// <summary>
/// Preparation operation result
/// </summary>
public class PreparationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string OperationName { get; set; } = string.Empty;
}

/// <summary>
/// Stage information
/// </summary>
public class StageInfo
{
    public int StageNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double LeftPistonPosition { get; set; }
    public double LowerPistonPosition { get; set; }
    public double RightPistonPosition { get; set; }
}

/// <summary>
/// Bending calculation request
/// </summary>
public class BendingCalculationRequest
{
    public double BallDiameter { get; set; } = 220;
    public double Thickness { get; set; } = 80;
    public double CenterDistance { get; set; } = 300.82;
    public double TargetBendingDiameter { get; set; }
    public double XA1 { get; set; } = -493;
    public double YA1 { get; set; } = 0;
    public double Theta { get; set; } = 63;
}

/// <summary>
/// Bending calculation result
/// </summary>
public class BendingCalculationResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public double PistonPosition { get; set; }
    public double XArc { get; set; }
    public double YArc { get; set; }
    public double Discriminant { get; set; }
    public double BallRadius { get; set; }
    public double ArcRadius { get; set; }
    public double K { get; set; }
    public double R2 { get; set; }
}
