using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Models.DataApi;

// PATCH-style partial update — DataApi sadece set edilmis field'lari gunceller
public class BendingJobUpdate
{
    public BendingJobStatus? Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double? DurationSeconds { get; set; }
    public int? CompletedPasos { get; set; }
    public int? TotalPasos { get; set; }
    public double? MeasuredDiameterMm { get; set; }
    public string? ErrorMessage { get; set; }
}
