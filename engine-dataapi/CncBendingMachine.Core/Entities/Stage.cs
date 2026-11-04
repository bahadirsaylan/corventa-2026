namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Stage definitions - height/capacity settings for the machine
/// Offset values are ABSOLUTE from Gonye position (not from previous stage)
///
/// Example:
///   Stage 1: Left=0, Lower=0, Right=0 (Gonye position)
///   Stage 2: Left=67.34, Lower=60, Right=67.34 (from Gonye)
///   Stage 3: Left=134.68, Lower=120, Right=134.68 (from Gonye)
///
/// When moving from Stage 2 to Stage 3:
///   Movement = Stage3.Offset - Stage2.Offset = 67.34mm
/// </summary>
public class Stage
{
    public int Id { get; set; }

    /// <summary>
    /// Stage number (1, 2, 3, etc.)
    /// </summary>
    public int StageNumber { get; set; }

    /// <summary>
    /// Display name (e.g., "Stage 1", "Küçük Kapasite")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description of the stage capacity/usage
    /// </summary>
    public string? Description { get; set; }

    // Offsets from Gonye position (ABSOLUTE values in mm)
    public double LeftOffsetMm { get; set; }
    public double RightOffsetMm { get; set; }
    public double LowerOffsetMm { get; set; }

    // Upper piston doesn't have stage offset (always 0)
    // It's controlled by clamping pressure, not position

    /// <summary>
    /// Bu stage'in desteklediği maksimum profil A kenarı (mm) — nullable.
    /// Stage seçimi: profileA <= MaxProfileAMm olan en küçük stage önerilir.
    /// null = bu stage otomatik seçimde göz ardı edilir (operatör manuel ayarlar).
    /// Geçici varsayılanlar: Stage 1=50, Stage 2=120, Stage 3=250 (mm).
    /// </summary>
    public double? MaxProfileAMm { get; set; }

    /// <summary>
    /// Whether this stage is available for selection
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Display order in UI
    /// </summary>
    public int DisplayOrder { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
