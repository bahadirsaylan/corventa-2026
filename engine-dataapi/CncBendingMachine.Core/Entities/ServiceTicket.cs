using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Ortak ticket entity'si — Soru (S), Öneri (Ö), Şikayet (Ş) tek tabloda.
/// Tip field'iyla ayrıştırılır. Mock destek için Response alanı operatörden veya
/// otomatik olarak doldurulabilir.
/// </summary>
public class ServiceTicket
{
    public int Id { get; set; }

    /// <summary>Kullanıcı dostu kod (örn. S.22.07.001, Ö.22.02.003, Ş.22.11.001)</summary>
    public string Code { get; set; } = string.Empty;

    public ServiceTicketType Type { get; set; }
    public ServiceTicketStatus Status { get; set; } = ServiceTicketStatus.Pending;

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Operatör/teknisyenden gelen cevap</summary>
    public string? Response { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnsweredAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    /// <summary>Operatör adı (opsiyonel)</summary>
    public string? CreatedBy { get; set; }
}
