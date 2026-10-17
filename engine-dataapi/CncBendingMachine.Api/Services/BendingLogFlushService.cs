using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Interfaces;

namespace CncBendingMachine.Api.Services;

public class BendingLogFlushService : BackgroundService
{
    private readonly BendingLogService _logService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BendingLogFlushService> _logger;

    private const int BatchSize = 50;
    private const int FlushIntervalMs = 500;

    public BendingLogFlushService(
        BendingLogService logService,
        IServiceScopeFactory scopeFactory,
        ILogger<BendingLogFlushService> logger)
    {
        _logService = logService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BendingLogFlushService started");

        var buffer = new List<BendingLogEntry>(BatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                buffer.Clear();

                if (await _logService.Reader.WaitToReadAsync(stoppingToken))
                {
                    while (buffer.Count < BatchSize && _logService.Reader.TryRead(out var entry))
                    {
                        buffer.Add(entry);
                    }
                }

                if (buffer.Count > 0)
                {
                    await FlushAsync(buffer);
                }

                await Task.Delay(FlushIntervalMs, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BendingLogFlushService error, {Count} entries may be lost", buffer.Count);
                await Task.Delay(2000, stoppingToken);
            }
        }

        // Final drain on shutdown
        buffer.Clear();
        while (_logService.Reader.TryRead(out var entry))
            buffer.Add(entry);

        if (buffer.Count > 0)
        {
            try { await FlushAsync(buffer); }
            catch (Exception ex) { _logger.LogError(ex, "Final flush failed, {Count} entries lost", buffer.Count); }
        }
    }

    private async Task FlushAsync(List<BendingLogEntry> entries)
    {
        // BackgroundService singleton — IDataApiClient transient, scope'tan resolve et
        using var scope = _scopeFactory.CreateScope();
        var dataApi = scope.ServiceProvider.GetRequiredService<IDataApiClient>();

        var logs = entries.Select(e => new BendingLog
        {
            BendingJobId = e.BendingJobId,
            Timestamp = e.Timestamp,
            Category = e.Category,
            Message = e.Message,
            Value1 = e.Value1,
            Value2 = e.Value2,
            Value3 = e.Value3,
            ValueLabels = e.ValueLabels,
            IsError = e.IsError
        }).ToList();

        await dataApi.InsertBendingLogsBatchAsync(logs);
    }
}
