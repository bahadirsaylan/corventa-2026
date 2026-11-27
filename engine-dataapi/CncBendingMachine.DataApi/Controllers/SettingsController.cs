using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.DataApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ILogger<SettingsController> _logger;
    private readonly IMachineSettingsRepository _repo;

    public SettingsController(ILogger<SettingsController> logger, IMachineSettingsRepository repo)
    {
        _logger = logger;
        _repo = repo;
    }

    // ============================================================
    // MACHINE SETTINGS
    // ============================================================

    [HttpGet("machine")]
    public async Task<IActionResult> GetMachineSettings()
    {
        var settings = await _repo.GetMachineSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("machine")]
    public async Task<IActionResult> UpdateMachineSettings([FromBody] MachineSettings body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        var err = ValidateMachineSettings(body);
        if (err != null) return BadRequest(new { error = err });

        var existing = await _repo.GetMachineSettingsAsync();

        existing.LeftPistonStrokeMm = body.LeftPistonStrokeMm;
        existing.RightPistonStrokeMm = body.RightPistonStrokeMm;
        existing.UpperPistonStrokeMm = body.UpperPistonStrokeMm;
        existing.LowerPistonStrokeMm = body.LowerPistonStrokeMm;
        existing.LeftPistonMaxReg = body.LeftPistonMaxReg;
        existing.RightPistonMaxReg = body.RightPistonMaxReg;
        existing.UpperPistonMaxReg = body.UpperPistonMaxReg;
        existing.LowerPistonMaxReg = body.LowerPistonMaxReg;

        existing.PneumaticStrokeMm = body.PneumaticStrokeMm;
        existing.PneumaticMaxReg = body.PneumaticMaxReg;

        existing.RollerDiameterMm = body.RollerDiameterMm;
        existing.RotationEncoderPpr = body.RotationEncoderPpr;

        existing.SafetyMarginMm = body.SafetyMarginMm;
        existing.ZeroResetDistanceMm = body.ZeroResetDistanceMm;

        existing.DefaultActiveSensorSide = body.DefaultActiveSensorSide ?? "Left";
        existing.DefaultValsCode = body.DefaultValsCode;
        existing.DefaultPistonSpeedPercent = body.DefaultPistonSpeedPercent;
        existing.DefaultRotationSpeedPercent = body.DefaultRotationSpeedPercent;
        existing.DefaultToleranceMm = body.DefaultToleranceMm;
        existing.DefaultSafetyMarginMm = body.DefaultSafetyMarginMm;
        existing.DefaultSlackPressureBar = body.DefaultSlackPressureBar;
        existing.DefaultSlackDistanceMm = body.DefaultSlackDistanceMm;
        existing.DefaultClampPressureBar = body.DefaultClampPressureBar;

        existing.DefaultBallDiameterMm = body.DefaultBallDiameterMm;
        existing.DefaultCenterDistanceMm = body.DefaultCenterDistanceMm;
        existing.DefaultThetaDeg = body.DefaultThetaDeg;
        existing.DefaultXA1 = body.DefaultXA1;
        existing.DefaultYA1 = body.DefaultYA1;

        existing.SlpisZeroOffsetMm = body.SlpisZeroOffsetMm;
        existing.SlpisLMm = body.SlpisLMm;
        existing.SlpisRulmanCapMm = body.SlpisRulmanCapMm;

        await _repo.UpdateMachineSettingsAsync(existing);
        _logger.LogInformation("MachineSettings updated");
        return Ok(existing);
    }

    // ============================================================
    // GONYE SETTINGS
    // ============================================================

    [HttpGet("gonye")]
    public async Task<IActionResult> GetGonyeSettings()
    {
        var settings = await _repo.GetGonyeSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("gonye")]
    public async Task<IActionResult> UpdateGonyeSettings([FromBody] GonyeSettings body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        var err = ValidateGonyeSettings(body);
        if (err != null) return BadRequest(new { error = err });

        var existing = await _repo.GetGonyeSettingsAsync();
        existing.LeftOffsetMm = body.LeftOffsetMm;
        existing.RightOffsetMm = body.RightOffsetMm;
        existing.UpperOffsetMm = body.UpperOffsetMm;
        existing.LowerOffsetMm = body.LowerOffsetMm;
        existing.ReferencePressureBar = body.ReferencePressureBar;

        await _repo.UpdateGonyeSettingsAsync(existing);
        _logger.LogInformation("GonyeSettings updated");
        return Ok(existing);
    }

    // ============================================================
    // STAGES
    // ============================================================

    [HttpGet("stages")]
    public async Task<IActionResult> GetStages()
    {
        var stages = await _repo.GetAllStagesAsync();
        return Ok(stages);
    }

    [HttpPost("stages")]
    public async Task<IActionResult> AddStage([FromBody] Stage body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        var err = ValidateStage(body);
        if (err != null) return BadRequest(new { error = err });

        var existing = await _repo.GetStageByNumberAsync(body.StageNumber);
        if (existing != null)
            return BadRequest(new { error = $"Stage numarası {body.StageNumber} zaten mevcut" });

        var stage = new Stage
        {
            StageNumber = body.StageNumber,
            Name = body.Name ?? $"Stage {body.StageNumber}",
            Description = body.Description,
            LeftOffsetMm = body.LeftOffsetMm,
            RightOffsetMm = body.RightOffsetMm,
            LowerOffsetMm = body.LowerOffsetMm,
            MaxProfileAMm = body.MaxProfileAMm,
            IsActive = true,
            DisplayOrder = body.DisplayOrder
        };

        var created = await _repo.AddStageAsync(stage);
        _logger.LogInformation("Stage {StageNumber} added", stage.StageNumber);
        return Ok(created);
    }

    [HttpPut("stages/{id:int}")]
    public async Task<IActionResult> UpdateStage(int id, [FromBody] Stage body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        var err = ValidateStage(body);
        if (err != null) return BadRequest(new { error = err });

        var all = await _repo.GetAllStagesAsync();
        var existing = all.FirstOrDefault(s => s.Id == id);
        if (existing == null)
            return NotFound(new { error = $"Stage id={id} bulunamadı" });

        existing.StageNumber = body.StageNumber;
        existing.Name = body.Name ?? existing.Name;
        existing.Description = body.Description;
        existing.LeftOffsetMm = body.LeftOffsetMm;
        existing.RightOffsetMm = body.RightOffsetMm;
        existing.LowerOffsetMm = body.LowerOffsetMm;
        existing.MaxProfileAMm = body.MaxProfileAMm;
        existing.DisplayOrder = body.DisplayOrder;

        await _repo.UpdateStageAsync(existing);
        _logger.LogInformation("Stage {Id} updated", id);
        return Ok(existing);
    }

    [HttpDelete("stages/{id:int}")]
    public async Task<IActionResult> DeleteStage(int id)
    {
        await _repo.DeleteStageAsync(id);
        _logger.LogInformation("Stage {Id} soft-deleted", id);
        return Ok(new { success = true });
    }

    // ============================================================
    // VALIDATION
    // ============================================================

    private static string? ValidateMachineSettings(MachineSettings m)
    {
        if (m.LeftPistonStrokeMm <= 0 || m.RightPistonStrokeMm <= 0 ||
            m.UpperPistonStrokeMm <= 0 || m.LowerPistonStrokeMm <= 0)
            return "Piston strok değerleri sıfırdan büyük olmalı";

        if (m.LeftPistonMaxReg <= 0 || m.RightPistonMaxReg <= 0 ||
            m.UpperPistonMaxReg <= 0 || m.LowerPistonMaxReg <= 0)
            return "Piston max encoder değerleri sıfırdan büyük olmalı";

        if (m.PneumaticStrokeMm <= 0 || m.PneumaticMaxReg <= 0)
            return "Pnömatik parametreleri sıfırdan büyük olmalı";

        if (m.RollerDiameterMm <= 0 || m.RotationEncoderPpr <= 0)
            return "Rotasyon parametreleri sıfırdan büyük olmalı";

        if (m.SafetyMarginMm < 0)
            return "Güvenlik payı negatif olamaz";

        if (m.ZeroResetDistanceMm < 0)
            return "Parça sıfırlama mesafesi negatif olamaz";

        if (m.DefaultPistonSpeedPercent < 1 || m.DefaultPistonSpeedPercent > 100)
            return "Piston hız yüzdesi 1-100 arası olmalı";

        if (m.DefaultRotationSpeedPercent < 1 || m.DefaultRotationSpeedPercent > 100)
            return "Rotasyon hız yüzdesi 1-100 arası olmalı";

        if (m.DefaultToleranceMm <= 0)
            return "Tolerans sıfırdan büyük olmalı";

        if (m.DefaultSlackPressureBar < 0 || m.DefaultSlackPressureBar > 300)
            return "Boşluk alma basıncı 0-300 bar arası olmalı";

        if (m.DefaultSlackDistanceMm < 0 || m.DefaultSlackDistanceMm > 10)
            return "Boşluk alma mesafesi 0-10 mm arası olmalı";

        if (m.DefaultClampPressureBar < 0 || m.DefaultClampPressureBar > 300)
            return "Parça sıkıştırma basıncı 0-300 bar arası olmalı";

        if (m.DefaultBallDiameterMm <= 0 || m.DefaultCenterDistanceMm <= 0)
            return "Makine geometri (top çapı / merkez mesafesi) sıfırdan büyük olmalı";

        if (m.DefaultThetaDeg < 0 || m.DefaultThetaDeg > 180)
            return "Theta açısı 0-180 derece arası olmalı";

        if (m.SlpisLMm <= 0 || m.SlpisRulmanCapMm <= 0)
            return "SLPIS parametreleri sıfırdan büyük olmalı";

        if (!string.IsNullOrEmpty(m.DefaultActiveSensorSide) &&
            m.DefaultActiveSensorSide != "Left" && m.DefaultActiveSensorSide != "Right")
            return "Aktif sensör tarafı 'Left' veya 'Right' olmalı";

        return null;
    }

    private static string? ValidateGonyeSettings(GonyeSettings g)
    {
        if (g.LeftOffsetMm < 0 || g.RightOffsetMm < 0 ||
            g.UpperOffsetMm < 0 || g.LowerOffsetMm < 0)
            return "Gönye offset değerleri negatif olamaz";

        if (g.ReferencePressureBar < 10 || g.ReferencePressureBar > 250)
            return "Referans basıncı 10-250 bar arası olmalı";

        return null;
    }

    private static string? ValidateStage(Stage s)
    {
        if (s.StageNumber < 1)
            return "Stage numarası 1'den küçük olamaz";

        if (s.LeftOffsetMm < 0 || s.RightOffsetMm < 0 || s.LowerOffsetMm < 0)
            return "Stage offset değerleri negatif olamaz";

        if (s.DisplayOrder < 0)
            return "DisplayOrder negatif olamaz";

        if (s.MaxProfileAMm.HasValue && s.MaxProfileAMm.Value <= 0)
            return "MaxProfileAMm değeri sıfırdan büyük olmalı (veya null bırakın)";

        return null;
    }
}
