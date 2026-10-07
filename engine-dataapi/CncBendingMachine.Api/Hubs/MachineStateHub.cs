using Microsoft.AspNetCore.SignalR;

namespace CncBendingMachine.Api.Hubs;

/// <summary>
/// SignalR Hub for machine state push
/// IMPORTANT: This hub is READ-ONLY - no control methods!
/// All control commands go through REST API.
/// </summary>
public class MachineStateHub : Hub
{
    private readonly ILogger<MachineStateHub> _logger;

    public MachineStateHub(ILogger<MachineStateHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}, Exception: {Exception}",
            Context.ConnectionId, exception?.Message);
        await base.OnDisconnectedAsync(exception);
    }
}
