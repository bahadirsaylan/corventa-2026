using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Interfaces;

namespace CncBendingMachine.Infrastructure.DataApiClient;

// IMachineSettingsRepository'nin DataApi (HTTP) backed implementasyonu.
// Eski EF Core'lu MachineSettingsRepository ile imza birebir ayni — Faz 4a switch
// edildiginde tuketici (SettingsController, BendingHandler vb.) farketmeyecek.
public class DataApiMachineSettingsRepository : IMachineSettingsRepository
{
    private readonly IDataApiClient _client;

    public DataApiMachineSettingsRepository(IDataApiClient client)
    {
        _client = client;
    }

    public Task<MachineSettings> GetMachineSettingsAsync()
        => _client.GetMachineSettingsAsync();

    public async Task UpdateMachineSettingsAsync(MachineSettings settings)
        => await _client.UpdateMachineSettingsAsync(settings);

    public Task<GonyeSettings> GetGonyeSettingsAsync()
        => _client.GetGonyeSettingsAsync();

    public async Task UpdateGonyeSettingsAsync(GonyeSettings settings)
        => await _client.UpdateGonyeSettingsAsync(settings);

    public Task<IReadOnlyList<Stage>> GetAllStagesAsync()
        => _client.GetStagesAsync();

    // DataApi'de dedike "by-number" endpoint yok — client-side filter (3-5 stage var, ucuz)
    public async Task<Stage?> GetStageByNumberAsync(int stageNumber)
    {
        var stages = await _client.GetStagesAsync();
        return stages.FirstOrDefault(s => s.StageNumber == stageNumber);
    }

    public Task<Stage> AddStageAsync(Stage stage)
        => _client.AddStageAsync(stage);

    public async Task UpdateStageAsync(Stage stage)
        => await _client.UpdateStageAsync(stage.Id, stage);

    public Task DeleteStageAsync(int stageId)
        => _client.DeleteStageAsync(stageId);
}
