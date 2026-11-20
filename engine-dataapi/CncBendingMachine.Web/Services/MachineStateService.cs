using Microsoft.AspNetCore.SignalR.Client;
using CncBendingMachine.Web.Models;
using System.Text.Json;

namespace CncBendingMachine.Web.Services;

/// <summary>
/// SignalR client service for receiving real-time machine state updates
/// </summary>
public class MachineStateService : IAsyncDisposable
{
    private readonly ILogger<MachineStateService> _logger;
    private readonly IConfiguration _configuration;
    private HubConnection? _hubConnection;
    private MachineStateDto _currentState = new();
    private bool _isConnected;

    public event Action<MachineStateDto>? OnStateChanged;
    public event Action<bool>? OnConnectionChanged;

    public MachineStateDto CurrentState => _currentState;
    public bool IsConnected => _isConnected;

    public MachineStateService(ILogger<MachineStateService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task StartAsync()
    {
        var hubUrl = _configuration["Api:HubUrl"] ?? "http://localhost:5000/machineHub";

        _hubConnection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect(new[] { TimeSpan.Zero, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10) })
            .Build();

        _hubConnection.On<MachineStateDto>("StateUpdated", state =>
        {
            _currentState = state;
            OnStateChanged?.Invoke(state);
        });

        _hubConnection.Reconnecting += error =>
        {
            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
            _logger.LogWarning("SignalR reconnecting: {Error}", error?.Message);
            return Task.CompletedTask;
        };

        _hubConnection.Reconnected += connectionId =>
        {
            _isConnected = true;
            OnConnectionChanged?.Invoke(true);
            _logger.LogInformation("SignalR reconnected: {ConnectionId}", connectionId);
            return Task.CompletedTask;
        };

        _hubConnection.Closed += error =>
        {
            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
            _logger.LogWarning("SignalR closed: {Error}", error?.Message);
            return Task.CompletedTask;
        };

        try
        {
            await _hubConnection.StartAsync();
            _isConnected = true;
            OnConnectionChanged?.Invoke(true);
            _logger.LogInformation("SignalR connected to {Url}", hubUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to SignalR hub at {Url}", hubUrl);
            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
        }
    }

    public async Task StopAsync()
    {
        if (_hubConnection != null)
        {
            await _hubConnection.StopAsync();
            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_hubConnection != null)
        {
            await _hubConnection.DisposeAsync();
        }
    }
}
