using System.Threading.Channels;

namespace CncBendingMachine.Application.Services;

public class BendingLogService
{
    private readonly Channel<BendingLogEntry> _channel;

    public BendingLogService()
    {
        _channel = Channel.CreateBounded<BendingLogEntry>(
            new BoundedChannelOptions(10_000)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true
            });
    }

    /// <summary>
    /// Fire-and-forget log. Never blocks the caller.
    /// </summary>
    public void Log(int jobId, string category, string message,
        double? value1 = null, double? value2 = null, double? value3 = null,
        string? valueLabels = null, bool isError = false)
    {
        _channel.Writer.TryWrite(new BendingLogEntry
        {
            BendingJobId = jobId,
            Timestamp = DateTime.UtcNow,
            Category = category,
            Message = message,
            Value1 = value1,
            Value2 = value2,
            Value3 = value3,
            ValueLabels = valueLabels,
            IsError = isError
        });
    }

    public void LogPiston(int jobId, string message, double? positionMm = null, double? speedPercent = null)
        => Log(jobId, "Piston", message, positionMm, speedPercent, valueLabels: "positionMm|speedPercent");

    public void LogRotation(int jobId, string message, double? distanceMm = null, double? speedPercent = null)
        => Log(jobId, "Rotation", message, distanceMm, speedPercent, valueLabels: "distanceMm|speedPercent");

    public void LogPneumatic(int jobId, string message, double? pressureBar = null, double? positionMm = null)
        => Log(jobId, "Pneumatic", message, pressureBar, positionMm, valueLabels: "pressureBar|positionMm");

    public void LogValve(int jobId, string message)
        => Log(jobId, "Valve", message);

    public void LogSpringback(int jobId, string message, double? measuredMm = null, double? targetMm = null)
        => Log(jobId, "Springback", message, measuredMm, targetMm, valueLabels: "measuredMm|targetMm");

    public void LogSafety(int jobId, string message, bool isError = true)
        => Log(jobId, "Safety", message, isError: isError);

    public void LogError(int jobId, string category, string message)
        => Log(jobId, category, message, isError: true);

    public ChannelReader<BendingLogEntry> Reader => _channel.Reader;
}

public class BendingLogEntry
{
    public int BendingJobId { get; set; }
    public DateTime Timestamp { get; set; }
    public string Category { get; set; } = "";
    public string Message { get; set; } = "";
    public double? Value1 { get; set; }
    public double? Value2 { get; set; }
    public double? Value3 { get; set; }
    public string? ValueLabels { get; set; }
    public bool IsError { get; set; }
}
