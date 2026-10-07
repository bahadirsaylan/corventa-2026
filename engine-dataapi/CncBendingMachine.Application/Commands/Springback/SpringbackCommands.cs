using CncBendingMachine.Application.Common;
using MediatR;

namespace CncBendingMachine.Application.Commands.Springback;

/// <summary>
/// Start springback measurement
/// </summary>
public class SpringbackStartCommand : IRequest<Result>
{
    /// <summary>
    /// Measuring side: 1=Right, -1=Left
    /// </summary>
    public int Side { get; set; }

    /// <summary>
    /// Increase threshold in mm (default 0.2)
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Above-minimum threshold in mm (default 0.1)
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Stable time in ms (default 500)
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}

/// <summary>
/// Stop/cancel springback measurement
/// </summary>
public class SpringbackStopCommand : IRequest<Result>
{
}

/// <summary>
/// Stop ongoing springback auto-correct operation
/// </summary>
public class StopSpringbackAutoCorrectCommand : IRequest<bool>
{
}

/// <summary>
/// Set springback detection thresholds (without starting measurement)
/// </summary>
public class SetSpringbackThresholdsCommand : IRequest<Result>
{
    /// <summary>
    /// Increase threshold in mm (default 0.2)
    /// </summary>
    public double IncreaseThresholdMm { get; set; } = 0.2;

    /// <summary>
    /// Above-minimum threshold in mm (default 0.1)
    /// </summary>
    public double MinThresholdMm { get; set; } = 0.1;

    /// <summary>
    /// Stable time in ms (default 500)
    /// </summary>
    public int StableTimeMs { get; set; } = 500;
}
