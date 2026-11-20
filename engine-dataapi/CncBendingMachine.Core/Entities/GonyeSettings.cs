namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Gonye (reference/home) position offsets
/// These are the positions pistons move to after mechanical limit reset
/// After reaching these positions, encoders are zeroed again
/// </summary>
public class GonyeSettings
{
    public int Id { get; set; }

    // Gonye Offsets (mm) - Position from mechanical limit
    public double LeftOffsetMm { get; set; } = 3.75;
    public double RightOffsetMm { get; set; } = 3.75;
    public double UpperOffsetMm { get; set; } = 0.0;
    public double LowerOffsetMm { get; set; } = 10.5;

    // Pressure for mechanical limit detection (bar)
    public int ReferencePressureBar { get; set; } = 70;

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
