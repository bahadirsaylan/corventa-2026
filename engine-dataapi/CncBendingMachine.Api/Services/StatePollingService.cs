using CncBendingMachine.Api.Hubs;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace CncBendingMachine.Api.Services;

/// <summary>
/// Background service that polls PLC state and pushes to SignalR clients
/// Uses IMachineOrchestrator to update cached state
/// </summary>
public class StatePollingService : BackgroundService
{
    private readonly ILogger<StatePollingService> _logger;
    private readonly IPlcDriver _plcDriver;
    private readonly IMachineOrchestrator _orchestrator;
    private readonly BendingProgressService _bendingProgress;
    private readonly IHubContext<MachineStateHub> _hubContext;
    private readonly IConfiguration _configuration;

    public StatePollingService(
        ILogger<StatePollingService> logger,
        IPlcDriver plcDriver,
        IMachineOrchestrator orchestrator,
        BendingProgressService bendingProgress,
        IHubContext<MachineStateHub> hubContext,
        IConfiguration configuration)
    {
        _logger = logger;
        _plcDriver = plcDriver;
        _orchestrator = orchestrator;
        _bendingProgress = bendingProgress;
        _hubContext = hubContext;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollingIntervalMs = _configuration.GetValue<int>("Plc:PollingIntervalMs", 100);

        _logger.LogInformation("StatePollingService starting, polling interval: {Interval}ms", pollingIntervalMs);

        // Connect to PLC
        while (!_plcDriver.IsConnected && !stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _plcDriver.ConnectAsync();
                if (_plcDriver.IsConnected)
                {
                    _logger.LogInformation("PLC connected (Simulation: {IsSimulation})", _plcDriver.IsSimulationMode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to PLC, retrying in 5 seconds...");
                await Task.Delay(5000, stoppingToken);
            }
        }

        // Main polling loop
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_plcDriver.IsConnected)
                {
                    // Update orchestrator's cached state (reads from PLC internally)
                    await _orchestrator.UpdateStateAsync();

                    // Push cached state to all SignalR clients
                    await _hubContext.Clients.All.SendAsync("StateUpdated", _orchestrator.CurrentState, stoppingToken);

                    // Push bending progress if active
                    var bp = _bendingProgress.GetActive();
                    if (bp != null)
                    {
                        await _hubContext.Clients.All.SendAsync("BendingProgress", new
                        {
                            bp.JobId,
                            bp.CompletedPasos,
                            bp.TotalPasos,
                            bp.PercentComplete,
                            bp.Message
                        }, stoppingToken);
                    }
                }
                else
                {
                    // Try to reconnect
                    await _plcDriver.ConnectAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading PLC state");
            }

            await Task.Delay(pollingIntervalMs, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("StatePollingService stopping...");
        _plcDriver.Disconnect();
        await base.StopAsync(cancellationToken);
    }
}
