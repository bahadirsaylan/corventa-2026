namespace CncBendingMachine.Core.Entities;

public class BendingLog
{
    public long Id { get; set; }
    public int BendingJobId { get; set; }
    public DateTime Timestamp { get; set; }
    public string Category { get; set; } = "";     // Piston, Rotation, Pneumatic, Valve, Springback, Safety, General
    public string Message { get; set; } = "";
    public double? Value1 { get; set; }            // context-dependent (position, pressure, distance)
    public double? Value2 { get; set; }            // context-dependent (speed, secondary)
    public double? Value3 { get; set; }            // context-dependent (tertiary)
    public string? ValueLabels { get; set; }       // "positionMm|speedPercent" — describes Value1/2/3
    public bool IsError { get; set; }
}
