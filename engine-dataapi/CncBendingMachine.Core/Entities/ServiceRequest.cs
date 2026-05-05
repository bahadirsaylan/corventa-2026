using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Servis talebi / Servis raporu kaydı (SEKIL-48 → 53).
/// Teknisyen tarafından açılır, servis sonrası rapor üretilir ve müşteri değerlendirir.
/// </summary>
public class ServiceRequest
{
    public int Id { get; set; }

    /// <summary>Kullanıcı dostu kod (T.22.08.002 talep, SR.22071140000101 rapor)</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Müşteri bilgileri (SEKIL-48 üst bölge)</summary>
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerAddress { get; set; } = string.Empty;
    public string MachineModel { get; set; } = string.Empty;
    public string MachineProductionYear { get; set; } = string.Empty;
    public string MachineCode { get; set; } = string.Empty;
    public string MachineVeAiCode { get; set; } = string.Empty;

    /// <summary>Servisi gerçekleştiren teknisyen</summary>
    public string TechnicianName { get; set; } = string.Empty;
    public string? ContactInfo { get; set; }

    public ServicePurpose Purpose { get; set; } = ServicePurpose.GenelBakim;
    public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.Planned;

    /// <summary>Problem tanımı / servis amacının açıklaması</summary>
    public string? ProblemDescription { get; set; }

    /// <summary>JSON array: ["SERVICE.CPB.05.100.1 (KODLA İLİŞKİ...)", ...]</summary>
    public string WorkDoneCodes { get; set; } = "[]";
    public string PartsUsedCodes { get; set; } = "[]";
    public string MissingPartsCodes { get; set; } = "[]";

    /// <summary>Rapor oluşturulduktan sonra atanan rapor kodu</summary>
    public string? ReportCode { get; set; }

    /// <summary>Tamamlanma için onay kodu (SMS/email simüle — 6 hane)</summary>
    public string? ConfirmCode { get; set; }
    public bool IsConfirmed { get; set; }

    /// <summary>Müşteri değerlendirmesi (1-10)</summary>
    public int? Rating { get; set; }
    public string? RatingNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
