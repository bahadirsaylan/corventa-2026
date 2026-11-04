using CncBendingMachine.Core.Models.Events;

namespace CncBendingMachine.DataApi.Services;

/// <summary>
/// MachineEvent broadcast + cache (last-value per eventType) servisi.
/// EventsController'dan çağrılır, EventsHub'a gönderir.
/// </summary>
public interface IEventBroadcaster
{
    /// <summary>
    /// Event'i cache'le (son değer, eventType'a göre overwrite) ve tüm bağlı client'lere broadcast et.
    /// </summary>
    Task CacheAndBroadcastAsync(MachineEvent evt, CancellationToken ct = default);

    /// <summary>
    /// Belirli bir eventType için son cache'lenmiş değer (yoksa null).
    /// </summary>
    MachineEvent? GetCached(string eventType);

    /// <summary>
    /// Tüm cache'lenmiş event'lerin snapshot'ı (yeni client bağlanınca initial state göndermek için).
    /// </summary>
    IReadOnlyCollection<MachineEvent> GetAllCached();
}
