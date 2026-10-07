using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Entities;

/// <summary>
/// Büküm iş kaydı - Electron UI'dan oluşturulur, büküm bu kayıt üzerinden takip edilir
/// </summary>
public class BendingJob
{
    public int Id { get; set; }

    // ============================================================
    // DURUM & YAŞAM DÖNGÜSÜ
    // ============================================================
    public BendingJobStatus Status { get; set; } = BendingJobStatus.Created;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // ============================================================
    // PROFİL PARAMETRELERİ (UI'dan - ŞEKİL-8, ŞEKİL-11)
    // ============================================================
    public ProfileType ProfileType { get; set; }
    public BendingDirection Direction { get; set; } = BendingDirection.Inward;
    public BendingMethod Method { get; set; } = BendingMethod.FullCircle;

    /// <summary>Profil yüksekliği A (mm) - 1. kenar ölçüsü</summary>
    public double ProfileA { get; set; }

    /// <summary>Profil genişliği B (mm) - 2. kenar ölçüsü</summary>
    public double ProfileB { get; set; }

    /// <summary>Et kalınlığı S (mm)</summary>
    public double ProfileS { get; set; }

    /// <summary>Hedef büküm çapı R (mm) - Ø değeri</summary>
    public double TargetDiameterMm { get; set; }

    /// <summary>Opsiyonel H parametresi (mm)</summary>
    public double? ProfileH { get; set; }

    /// <summary>Opsiyonel G parametresi (mm)</summary>
    public double? ProfileG { get; set; }

    // ============================================================
    // PARÇA PARAMETRELERİ
    // ============================================================

    /// <summary>Parça uzunluğu (mm)</summary>
    public double PartLengthMm { get; set; }

    /// <summary>Aktif sensör tarafı: "Left" veya "Right"</summary>
    public string ActiveSensorSide { get; set; } = "Left";

    /// <summary>Vals topu kodu (ŞEKİL-11 alt kısım)</summary>
    public string? ValsCode { get; set; }

    // ============================================================
    // BÜKÜM PARAMETRELERİ
    // ============================================================

    /// <summary>Paso adım mesafesi (mm)</summary>
    public double StepDistanceMm { get; set; } = 30;

    /// <summary>İlk paso adım mesafesi (mm) - opsiyonel</summary>
    public double? FirstStepDistanceMm { get; set; }

    /// <summary>Güvenlik payı (mm)</summary>
    public double SafetyMarginMm { get; set; } = 50;

    /// <summary>Parça sıfırlama mesafesi (mm) — sensörden "0" noktasına (DB ayarlarından snapshot)</summary>
    public double ZeroResetDistanceMm { get; set; } = 690;

    /// <summary>Piston hızı (%)</summary>
    public int PistonSpeedPercent { get; set; } = 100;

    /// <summary>Rotasyon hızı (%)</summary>
    public int RotationSpeedPercent { get; set; } = 100;

    /// <summary>Boşluk alma mesafesi (mm) - opsiyonel</summary>
    public double? SlackDistanceMm { get; set; }

    /// <summary>Boşluk alma basıncı (bar)</summary>
    public int SlackPressureBar { get; set; } = 157;

    /// <summary>Parça sıkıştırma basıncı (bar) — Clamp adımı ve auto-correct içinde kullanılır</summary>
    public int ClampPressureBar { get; set; } = 155;

    /// <summary>Tolerans (mm) - ŞEKİL-14 sağ üst</summary>
    public double ToleranceMm { get; set; } = 0.1;

    // ============================================================
    // MAKİNE PARAMETRELERİ (hesaplama için)
    // ============================================================

    /// <summary>Vals topu çapı (mm)</summary>
    public double BallDiameterMm { get; set; } = 220;

    /// <summary>Top eksen mesafesi (mm)</summary>
    public double CenterDistanceMm { get; set; } = 300.82;

    /// <summary>Sabit açı (derece)</summary>
    public double ThetaDeg { get; set; } = 63;

    /// <summary>Sol top X koordinatı (mm)</summary>
    public double XA1 { get; set; } = -493;

    /// <summary>Sol top Y koordinatı (mm)</summary>
    public double YA1 { get; set; } = 0;

    // ============================================================
    // HESAPLANAN DEĞERLER (start sırasında doldurulur)
    // ============================================================

    /// <summary>Hesaplanan piston hedef pozisyonu (mm)</summary>
    public double? CalculatedPistonPositionMm { get; set; }

    // ============================================================
    // İLERLEME TAKİBİ
    // ============================================================

    /// <summary>Toplam paso sayısı</summary>
    public int TotalPasos { get; set; }

    /// <summary>Tamamlanan paso sayısı</summary>
    public int CompletedPasos { get; set; }

    /// <summary>Şu anki paso (çalışırken)</summary>
    public int? CurrentPaso { get; set; }

    // ============================================================
    // SONUÇLAR
    // ============================================================

    /// <summary>Ölçülen çap (mm) - geri esneme sensöründen</summary>
    public double? MeasuredDiameterMm { get; set; }

    /// <summary>Son sol piston pozisyonu (mm)</summary>
    public double? FinalLeftPositionMm { get; set; }

    /// <summary>Son sağ piston pozisyonu (mm)</summary>
    public double? FinalRightPositionMm { get; set; }

    /// <summary>Toplam süre (saniye)</summary>
    public double? DurationSeconds { get; set; }

    // ============================================================
    // HATA BİLGİSİ
    // ============================================================

    /// <summary>Hata mesajı (fail durumunda)</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Hangi pasoda fail oldu</summary>
    public int? FailedAtPaso { get; set; }

    // ============================================================
    // KULLANICI BİLGİSİ
    // ============================================================

    /// <summary>Operatör adı</summary>
    public string? OperatorName { get; set; }

    /// <summary>Notlar</summary>
    public string? Notes { get; set; }
}
