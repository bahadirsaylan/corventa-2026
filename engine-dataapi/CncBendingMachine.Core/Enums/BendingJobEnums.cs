namespace CncBendingMachine.Core.Enums;

/// <summary>
/// Büküm iş kaydı durumu
/// </summary>
public enum BendingJobStatus
{
    Created = 0,
    Calculating = 1,
    Ready = 2,
    Running = 3,
    Completed = 4,
    Failed = 5,
    Cancelled = 6
}

/// <summary>
/// Profil tipi (ŞEKİL-8: Kıvrım profili seçimi)
/// </summary>
public enum ProfileType
{
    Square = 0,        // Kare kutu profil ▢
    Rectangular = 1,   // Dikdörtgen kutu profil ▭
    Round = 2,         // Boru profil ○
    Angle = 3,         // L profil (köşebent)
    Channel = 4,       // U profil (kanal)
    TProfile = 5,      // T profil
    IProfile = 6,      // I profil
    Flat = 7,          // Lama (düz çubuk)
    Custom = 99        // Özel kıvrım profili
}

/// <summary>
/// Büküm yönü (ŞEKİL-9: Kıvrım yönü seçimi)
/// </summary>
public enum BendingDirection
{
    Inward = 0,        // İçeri büküm
    Outward = 1,       // Dışarı büküm
    Other = 2          // Diğer kıvrım yönleri
}

/// <summary>
/// Büküm metodu (ŞEKİL-10: Kıvrım metodu seçimi)
/// </summary>
public enum BendingMethod
{
    FullCircle = 0,    // Tam daire (halka)
    Arc = 1,           // Yay (C şeklinde)
    Spiral = 2,        // Spiral (helezon)
    Sivama = 3         // Sıvama
}
