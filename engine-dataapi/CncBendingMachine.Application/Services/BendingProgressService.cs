using System.Collections.Concurrent;

namespace CncBendingMachine.Application.Services;

/// <summary>
/// In-memory bending progress tracking.
/// Thread-safe singleton — handler yazıyor, SignalR/REST okuyor.
/// Büküm mantığını ETKİLEMEZ, sadece raporlama yapar.
/// </summary>
public class BendingProgressService
{
    private readonly ConcurrentDictionary<int, BendingProgress> _progress = new();

    /// <summary>
    /// Handler her paso sonrası çağırır. Sadece bellek yazma — bloklamaz.
    /// </summary>
    public void Update(int jobId, int completedPasos, int totalPasos, string? message = null)
    {
        _progress.AddOrUpdate(jobId,
            _ => new BendingProgress
            {
                JobId = jobId,
                CompletedPasos = completedPasos,
                TotalPasos = totalPasos,
                Message = message,
                UpdatedAt = DateTime.UtcNow
            },
            (_, existing) =>
            {
                existing.CompletedPasos = completedPasos;
                existing.TotalPasos = totalPasos;
                existing.Message = message;
                existing.UpdatedAt = DateTime.UtcNow;
                return existing;
            });
    }

    /// <summary>
    /// Aktif büküm var mı ve durumu ne? Null = aktif büküm yok.
    /// </summary>
    public BendingProgress? Get(int jobId)
    {
        return _progress.TryGetValue(jobId, out var p) ? p : null;
    }

    /// <summary>
    /// Herhangi bir aktif büküm progressi. SignalR push için.
    /// </summary>
    public BendingProgress? GetActive()
    {
        // En son güncellenen progress'i döndür
        BendingProgress? latest = null;
        foreach (var kvp in _progress)
        {
            if (latest == null || kvp.Value.UpdatedAt > latest.UpdatedAt)
                latest = kvp.Value;
        }
        return latest;
    }

    /// <summary>
    /// İş bitince temizle.
    /// </summary>
    public void Clear(int jobId)
    {
        _progress.TryRemove(jobId, out _);
    }
}

public class BendingProgress
{
    public int JobId { get; set; }
    public int CompletedPasos { get; set; }
    public int TotalPasos { get; set; }
    public string? Message { get; set; }
    public DateTime UpdatedAt { get; set; }

    public double PercentComplete => TotalPasos > 0
        ? Math.Min(100.0, (double)CompletedPasos / TotalPasos * 100.0)
        : 0;
}
