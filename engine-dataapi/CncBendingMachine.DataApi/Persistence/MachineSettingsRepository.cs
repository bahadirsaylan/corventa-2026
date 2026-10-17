using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CncBendingMachine.DataApi.Persistence;

public class MachineSettingsRepository : IMachineSettingsRepository
{
    private readonly AppDbContext _context;

    public MachineSettingsRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<MachineSettings> GetMachineSettingsAsync()
    {
        var settings = await _context.MachineSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new MachineSettings();
            _context.MachineSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        return settings;
    }

    public async Task UpdateMachineSettingsAsync(MachineSettings settings)
    {
        settings.UpdatedAt = DateTime.UtcNow;
        _context.MachineSettings.Update(settings);
        await _context.SaveChangesAsync();
    }

    public async Task<GonyeSettings> GetGonyeSettingsAsync()
    {
        var settings = await _context.GonyeSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new GonyeSettings();
            _context.GonyeSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        return settings;
    }

    public async Task UpdateGonyeSettingsAsync(GonyeSettings settings)
    {
        settings.UpdatedAt = DateTime.UtcNow;
        _context.GonyeSettings.Update(settings);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<Stage>> GetAllStagesAsync()
    {
        return await _context.Stages
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .ToListAsync();
    }

    public async Task<Stage?> GetStageByNumberAsync(int stageNumber)
    {
        return await _context.Stages
            .FirstOrDefaultAsync(s => s.StageNumber == stageNumber && s.IsActive);
    }

    public async Task<Stage> AddStageAsync(Stage stage)
    {
        stage.CreatedAt = DateTime.UtcNow;
        stage.UpdatedAt = DateTime.UtcNow;
        _context.Stages.Add(stage);
        await _context.SaveChangesAsync();
        return stage;
    }

    public async Task UpdateStageAsync(Stage stage)
    {
        stage.UpdatedAt = DateTime.UtcNow;
        _context.Stages.Update(stage);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteStageAsync(int stageId)
    {
        var stage = await _context.Stages.FindAsync(stageId);
        if (stage != null)
        {
            stage.IsActive = false;
            stage.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
