using System.Collections.Concurrent;
using CncBendingMachine.Core.Models.Events;
using CncBendingMachine.DataApi.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace CncBendingMachine.DataApi.Services;

/// <summary>
/// Singleton broadcaster — eventType'a göre last-value cache + EventsHub'a anlık push.
/// Thread-safe (ConcurrentDictionary).
/// </summary>
public class EventBroadcaster : IEventBroadcaster
{
    private readonly IHubContext<EventsHub> _hub;
    private readonly ILogger<EventBroadcaster> _logger;
    private readonly ConcurrentDictionary<string, MachineEvent> _cache = new();

    public EventBroadcaster(IHubContext<EventsHub> hub, ILogger<EventBroadcaster> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task CacheAndBroadcastAsync(MachineEvent evt, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(evt.EventType))
        {
            _logger.LogWarning("MachineEvent without eventType discarded");
            return;
        }

        _cache[evt.EventType] = evt;

        try
        {
            await _hub.Clients.All.SendAsync("EventReceived", evt, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EventsHub broadcast failed (eventType={EventType})", evt.EventType);
        }
    }

    public MachineEvent? GetCached(string eventType)
        => _cache.TryGetValue(eventType, out var evt) ? evt : null;

    public IReadOnlyCollection<MachineEvent> GetAllCached()
        => _cache.Values.ToArray();
}
