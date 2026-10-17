namespace CncBendingMachine.Core.Enums;

public enum ServiceTicketType
{
    Question = 0,     // Soru (S)
    Suggestion = 1,   // Öneri (Ö)
    Complaint = 2     // Şikayet (Ş)
}

public enum ServiceTicketStatus
{
    Pending = 0,      // Beklemede
    Answered = 1,     // Cevaplandı
    InProgress = 2,   // Sorunum Devam Ediyor / Canlı destek talep ediyor
    Resolved = 3,     // Çözüldü / Sonlandırıldı
    Cancelled = 4     // İptal
}

public enum ServicePurpose
{
    ArizaGiderme = 0,
    GenelBakim = 1,
    AgirBakim = 2,
    Kurulum = 3,
    Egitim = 4
}

public enum ServiceRequestStatus
{
    Planned = 0,      // Planlandı
    Sent = 1,         // Gönderildi
    InProgress = 2,   // Servis başladı
    Completed = 3,    // Tamamlandı
    Cancelled = 4
}
