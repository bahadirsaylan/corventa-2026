using CncBendingMachine.Core.Models.Events;
using CncBendingMachine.DataApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.DataApi.Controllers;

/// <summary>
/// Bending API (veya başka publisher) buradan event yayınlar.
/// DataApi cache'ler (eventType keyed last-value) ve /corventa üzerinden bağlı UI'lara broadcast eder.
/// </summary>
/// <remarks>
/// Generic endpoint pattern — yeni event tipleri için DataApi kod değişmez.
/// Publisher MachineEvent envelope'unu kurar:
///   { messageType, eventType, timestamp?, payload }
/// timestamp opsiyonel — set edilmezse server UTC now atar.
/// </remarks>
[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly ILogger<EventsController> _logger;
    private readonly IEventBroadcaster _broadcaster;

    public EventsController(ILogger<EventsController> logger, IEventBroadcaster broadcaster)
    {
        _logger = logger;
        _broadcaster = broadcaster;
    }

    /// <summary>
    /// Event yayınla — cache'lenir + tüm /corventa client'lerine push edilir.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Publish([FromBody] MachineEvent evt, CancellationToken ct)
    {
        if (evt is null)
            return BadRequest(new { error = "Body is required" });

        if (string.IsNullOrWhiteSpace(evt.EventType))
            return BadRequest(new { error = "eventType is required" });

        // Sanity check: messageType info/warning/error olmalı
        if (evt.MessageType != EventMessageType.Info &&
            evt.MessageType != EventMessageType.Warning &&
            evt.MessageType != EventMessageType.Error)
        {
            return BadRequest(new { error = $"messageType '{evt.MessageType}' geçersiz. info/warning/error olmalı." });
        }

        if (evt.Timestamp == default)
            evt.Timestamp = DateTime.UtcNow;

        await _broadcaster.CacheAndBroadcastAsync(evt, ct);

        return Ok(new { broadcast = true, eventType = evt.EventType, timestamp = evt.Timestamp });
    }

    /// <summary>
    /// Cache'lenmiş tüm event'lerin son değerleri (debug / health-check için).
    /// </summary>
    [HttpGet("cached")]
    public IActionResult GetCached()
    {
        var all = _broadcaster.GetAllCached();
        return Ok(new { count = all.Count, events = all });
    }
}
