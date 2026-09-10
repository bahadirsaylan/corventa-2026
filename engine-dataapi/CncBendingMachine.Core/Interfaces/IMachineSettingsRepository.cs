using CncBendingMachine.Core.Entities;

namespace CncBendingMachine.Core.Interfaces;

/// <summary>
/// Repository for machine settings, gonye settings, and stages
/// </summary>
public interface IMachineSettingsRepository
{
    // Machine Settings
    Task<MachineSettings> GetMachineSettingsAsync();
    Task UpdateMachineSettingsAsync(MachineSettings settings);

    // Gonye Settings
    Task<GonyeSettings> GetGonyeSettingsAsync();
    Task UpdateGonyeSettingsAsync(GonyeSettings settings);

    // Stages
    Task<IReadOnlyList<Stage>> GetAllStagesAsync();
    Task<Stage?> GetStageByNumberAsync(int stageNumber);
    Task<Stage> AddStageAsync(Stage stage);
    Task UpdateStageAsync(Stage stage);
    Task DeleteStageAsync(int stageId);
}
