using CncBendingMachine.DataApi.Services;
using Microsoft.AspNetCore.SignalR;

namespace CncBendingMachine.DataApi.Hubs;

/// <summary>
/// SignalR Hub for machine event broadcasting (push-only).
/// </summary>
/// <remarks>
/// Path: /corventa. UI bu hub'a bağlanır, "EventReceived" event'lerini dinler.
/// Bu hub sadece outbound — client'ler hiçbir method çağırmaz.
/// Publish: Bending API her 1s POST /api/events/sensor ile sensör durumunu yollar,
/// EventsController IEventBroadcaster.CacheAndBroadcastAsync ile burada broadcast eder.
/// Yeni bağlanan client'e cache'lenmiş tüm event'lerin son değerleri otomatik gönderilir.
/// </remarks>
public class EventsHub : Hub
{
    private readonly ILogger<EventsHub> _logger;
    private readonly IEventBroadcaster _broadcaster;

    public EventsHub(ILogger<EventsHub> logger, IEventBroadcaster broadcaster)
    {
        _logger = logger;
        _broadcaster = broadcaster;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("EventsHub client connected: {ConnectionId}", Context.ConnectionId);

        // Yeni client'e şu ana kadar gelen son cached event'leri yolla
        // (UI bağlandığı an son sensör durumunu bilsin diye)
        var cached = _broadcaster.GetAllCached();
        foreach (var ev in cached)
        {
            await Clients.Caller.SendAsync("EventReceived", ev);
        }

        await base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("EventsHub client disconnected: {ConnectionId} ({Error})",
            Context.ConnectionId, exception?.Message ?? "clean");
        return base.OnDisconnectedAsync(exception);
    }
}
