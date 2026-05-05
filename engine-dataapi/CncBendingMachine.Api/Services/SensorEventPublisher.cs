using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models.Events;

namespace CncBendingMachine.Api.Services;

/// <summary>
/// Faz 6c — Her 1 saniyede bir parça varlık sensörü durumunu DataApi /api/events'e POST eder.
/// </summary>
/// <remarks>
/// Akış: PLC ──Modbus──▶ Bending API state polling (her 100ms)
///       ──&gt; Bu publisher (her 1s) ──HTTP──▶ DataApi
///       ──&gt; DataApi /corventa ──WebSocket──▶ UI (her 1s tick)
///
/// Hot path'e dokunmaz: orchestrator.CurrentState (cached) okur, PLC'ye yeni read yapmaz.
/// HTTP fail durumunda log warning + sessizce devam eder (publisher hot path değil).
/// IDataApiClient transient olduğu için her tick'te yeni scope açılır (BendingLogFlushService pattern'i).
/// </remarks>
public class SensorEventPublisher : BackgroundService
{
    private readonly IMachineOrchestrator _orchestrator;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SensorEventPublisher> _logger;

    private const int PublishIntervalMs = 1000;

    public SensorEventPublisher(
        IMachineOrchestrator orchestrator,
        IServiceScopeFactory scopeFactory,
        ILogger<SensorEventPublisher> logger)
    {
        _orchestrator = orchestrator;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SensorEventPublisher started — every {Ms}ms publish to DataApi /api/events", PublishIntervalMs);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PublishOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SensorEventPublisher tick failed (non-fatal, continuing)");
            }

            try { await Task.Delay(PublishIntervalMs, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }

        _logger.LogInformation("SensorEventPublisher stopped");
    }

    private async Task PublishOnceAsync(CancellationToken ct)
    {
        var state = _orchestrator.CurrentState;

        var evt = new MachineEvent
        {
            MessageType = EventMessageType.Info,
            EventType = EventTypes.PartSensor,
            Timestamp = DateTime.UtcNow,
            Payload = new
            {
                leftPartSensor = state.Safety.LeftPartSensor,
                rightPartSensor = state.Safety.RightPartSensor
            }
        };

        using var scope = _scopeFactory.CreateScope();
        var dataApi = scope.ServiceProvider.GetRequiredService<IDataApiClient>();
        await dataApi.PublishEventAsync(evt, ct);
    }
}
